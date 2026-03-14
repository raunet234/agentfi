import { motion } from 'framer-motion';
import { useWalletStore } from '../stores/stores';
import { Wallet } from 'lucide-react';
import './Rewards.css';

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function Rewards() {
  const { connected, balance, chainId } = useWalletStore();
  const currencySymbol = chainId === 56 ? 'BNB' : chainId === 97 ? 'tBNB' : 'ETH';

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

      <div className="rewards-stats-row">
        <motion.div className="card" variants={fadeUp} initial="hidden" animate="visible">
          <span className="stat-card-label text-secondary">AFI Tokens Earned</span>
          <span className="stat-card-value font-data text-gold" style={{ fontSize: 32 }}>0 AFI</span>
          <span className="stat-card-sub">No tokens earned yet</span>
        </motion.div>

        <motion.div className="card" variants={fadeUp} initial="hidden" animate="visible">
          <span className="stat-card-label text-secondary">Claimable Rewards</span>
          <span className="stat-card-value font-data text-green" style={{ fontSize: 32 }}>0 AFI</span>
          <span className="stat-card-sub">Nothing to claim</span>
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
