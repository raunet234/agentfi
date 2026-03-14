import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWalletStore } from '../stores/stores';
import { Wallet, Loader } from 'lucide-react';
import {
  fetchAFIBalance,
  fetchClaimableRewards,
  claimRewards,
  areContractsDeployed,
} from '../data/contractService';
import { getExplorerUrl } from '../data/wallet';
import { saveRewardClaim, logActivity } from '../data/supabaseService';
import './Rewards.css';

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function Rewards() {
  const { connected, address, balance, chainId, signer } = useWalletStore();
  const currencySymbol = chainId === 56 ? 'BNB' : chainId === 97 ? 'tBNB' : 'ETH';
  const contractsLive = areContractsDeployed();

  const [afiBalance, setAfiBalance] = useState('0');
  const [claimable, setClaimable] = useState('0');
  const [loadingData, setLoadingData] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimTxHash, setClaimTxHash] = useState('');
  const [error, setError] = useState('');

  // Fetch token data when connected
  useEffect(() => {
    if (!connected || !address || !contractsLive) return;

    const loadData = async () => {
      setLoadingData(true);
      try {
        const [bal, claim] = await Promise.all([
          fetchAFIBalance(address),
          fetchClaimableRewards(address),
        ]);
        setAfiBalance(bal);
        setClaimable(claim);
      } catch (err) {
        console.error('Failed to fetch reward data:', err);
      }
      setLoadingData(false);
    };

    loadData();
  }, [connected, address, contractsLive]);

  const handleClaim = async () => {
    if (!signer) return;
    setClaiming(true);
    setError('');
    setClaimTxHash('');

    try {
      const txHash = await claimRewards(signer);
      setClaimTxHash(txHash);

      // Save to Supabase
      saveRewardClaim({
        owner_address: address.toLowerCase(),
        amount: claimable,
        tx_hash: txHash,
      });
      logActivity({
        owner_address: address,
        action_type: 'claim',
        description: `Claimed ${claimable} AFI tokens`,
        tx_hash: txHash,
      });

      // Refresh balances
      const [bal, claim] = await Promise.all([
        fetchAFIBalance(address),
        fetchClaimableRewards(address),
      ]);
      setAfiBalance(bal);
      setClaimable(claim);
    } catch (err: any) {
      setError(err.message || 'Claim failed');
    }
    setClaiming(false);
  };

  if (!connected) {
    return (
      <motion.div className="rewards-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="page-title font-display">Rewards</h1>
        <div className="empty-state-card card">
          <Wallet size={40} strokeWidth={1} />
          <h3 style={{ marginTop: 12 }}>Connect your wallet</h3>
          <p className="text-secondary" style={{ fontSize: 13, maxWidth: 360, textAlign: 'center' }}>
            Connect your wallet to view your AFI token rewards and reputation history.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="rewards-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="page-title font-display">Rewards</h1>

      {error && (
        <div style={{
          background: 'var(--red-dim)',
          border: '1px solid rgba(255,68,68,0.3)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          marginBottom: 16,
          fontSize: 13,
          color: 'var(--red)',
        }}>
          ⚠ {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {claimTxHash && (
        <div style={{
          background: 'rgba(0,255,136,0.08)',
          border: '1px solid rgba(0,255,136,0.3)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          marginBottom: 16,
          fontSize: 13,
          color: 'var(--green)',
        }}>
          ✓ Rewards claimed!{' '}
          <a
            href={getExplorerUrl(claimTxHash, 'tx')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan"
            style={{ textDecoration: 'underline' }}
          >
            View on BscScan →
          </a>
        </div>
      )}

      <div className="rewards-stats-row">
        <motion.div className="card" variants={fadeUp} initial="hidden" animate="visible">
          <span className="stat-card-label text-secondary">AFI Tokens Earned</span>
          <span className="stat-card-value font-data text-gold" style={{ fontSize: 32 }}>
            {loadingData ? <Loader size={20} className="spin" /> : `${parseFloat(afiBalance).toFixed(2)} AFI`}
          </span>
          <span className="stat-card-sub">
            {contractsLive ? 'From smart contract' : 'Contracts not deployed'}
          </span>
        </motion.div>

        <motion.div className="card" variants={fadeUp} initial="hidden" animate="visible">
          <span className="stat-card-label text-secondary">Claimable Rewards</span>
          <span className="stat-card-value font-data text-green" style={{ fontSize: 32 }}>
            {loadingData ? <Loader size={20} className="spin" /> : `${parseFloat(claimable).toFixed(2)} AFI`}
          </span>
          <span className="stat-card-sub">
            {parseFloat(claimable) > 0 ? 'Ready to claim' : 'Nothing to claim'}
          </span>
          {parseFloat(claimable) > 0 && contractsLive && (
            <button
              className="btn-primary"
              style={{ marginTop: 12, width: '100%' }}
              onClick={handleClaim}
              disabled={claiming}
            >
              {claiming ? 'Claiming...' : 'Claim Rewards'}
            </button>
          )}
        </motion.div>

        <motion.div className="card" variants={fadeUp} initial="hidden" animate="visible">
          <span className="stat-card-label text-secondary">Wallet Balance</span>
          <span className="stat-card-value font-data" style={{ fontSize: 32, color: 'var(--text-primary)' }}>
            {parseFloat(balance).toFixed(4)} {currencySymbol}
          </span>
          <span className="stat-card-sub">Your current balance</span>
        </motion.div>
      </div>

      <motion.div className="card" variants={fadeUp} initial="hidden" animate="visible" style={{ marginTop: 24 }}>
        <h3 className="card-title">How to Earn AFI Tokens</h3>
        <div className="rewards-info-list">
          <div className="reward-info-row">
            <span className="font-data text-gold">2 AFI</span>
            <span className="text-secondary">Per successful commit-reveal action</span>
          </div>
          <div className="reward-info-row">
            <span className="font-data text-gold">5 AFI</span>
            <span className="text-secondary">For positions held longer than 30 days</span>
          </div>
          <div className="reward-info-row">
            <span className="font-data text-gold">3 AFI</span>
            <span className="text-secondary">Top 10% APY performer bonus</span>
          </div>
          <div className="reward-info-row">
            <span className="font-data text-gold">10 AFI</span>
            <span className="text-secondary">Zero-error week bonus</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
