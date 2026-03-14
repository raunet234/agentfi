import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWalletStore } from '../stores/stores';
import { useAgentRegistry } from '../stores/agentRegistry';
import { useCountUp } from '../hooks/hooks';
import { Wallet, Bot, GitBranch, Star, Plus, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCommitRevealStats,
  fetchAFIBalance,
  fetchClaimableRewards,
  areContractsDeployed,
  EXPLORER_URL,
  CURRENCY_SYMBOL,
} from '../data/contractService';
import { getActivityByOwner, getGlobalStats, type DbActivityLog } from '../data/supabaseService';
import './Overview.css';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Overview() {
  const { connected, address, balance, chainId, displayAddress } = useWalletStore();
  const { agents } = useAgentRegistry();
  const navigate = useNavigate();

  const contractsLive = areContractsDeployed();

  // Onchain data state
  const [commitStats, setCommitStats] = useState({ commits: 0, reveals: 0, executions: 0 });
  const [afiBalance, setAfiBalance] = useState('0');
  const [claimable, setClaimable] = useState('0');
  const [recentActivity, setRecentActivity] = useState<DbActivityLog[]>([]);
  const [dbStats, setDbStats] = useState({ totalAgents: 0, totalCommits: 0, totalReveals: 0, totalClaims: 0 });

  const myAgents = connected
    ? agents.filter(a => a.ownerAddress.toLowerCase() === address.toLowerCase())
    : [];
  const agentCount = myAgents.length;
  const activeCount = myAgents.filter(a => a.status === 'active').length;

  const walletBalance = parseFloat(balance || '0');
  const animatedBalance = useCountUp(walletBalance, 800);

  const currencySymbol = chainId === 56 ? 'BNB' : chainId === 97 ? 'tBNB' : CURRENCY_SYMBOL;
  const scanUrl = `${EXPLORER_URL}/address/${address}`;

  // Fetch onchain data + Supabase data
  useEffect(() => {
    if (!connected || !address) return;

    const load = async () => {
      try {
        // Always fetch Supabase data
        const [activity, stats] = await Promise.all([
          getActivityByOwner(address, 10),
          getGlobalStats(),
        ]);
        setRecentActivity(activity);
        setDbStats(stats);

        // Fetch onchain data if contracts are live
        if (contractsLive) {
          const [chainStats, afi, claim] = await Promise.all([
            fetchCommitRevealStats(),
            fetchAFIBalance(address),
            fetchClaimableRewards(address),
          ]);
          setCommitStats(chainStats);
          setAfiBalance(afi);
          setClaimable(claim);
        }
      } catch (err) {
        console.error('Failed to load overview data:', err);
      }
    };

    load();
  }, [connected, address, contractsLive]);

  // If not connected - show connect prompt
  if (!connected) {
    return (
      <motion.div className="overview" initial="hidden" animate="visible" variants={stagger}>
        <motion.div className="overview-empty-state" variants={fadeUp}>
          <Wallet size={48} strokeWidth={1} />
          <h2 className="font-display" style={{ fontSize: 24, marginTop: 16 }}>Connect your wallet</h2>
          <p className="text-secondary" style={{ maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
            Connect your MetaMask wallet to see your real portfolio data, register agents, and interact with DeFi protocols on BNB Chain.
          </p>
        </motion.div>
      </motion.div>
    );
  }

  const totalActions = commitStats.commits + commitStats.reveals;
  const afiDisplay = parseFloat(afiBalance).toFixed(2);
  const claimableDisplay = parseFloat(claimable).toFixed(2);

  // Connected - show real wallet data
  return (
    <motion.div className="overview" initial="hidden" animate="visible" variants={stagger}>
      {/* Row 1 - Real Stat Cards */}
      <div className="overview-stats-row">
        <motion.div className="overview-stat-card card-glow" variants={fadeUp}>
          <span className="stat-card-label text-secondary">Wallet Balance</span>
          <span className="stat-card-value font-data">
            {animatedBalance.toFixed(4)} {currencySymbol}
          </span>
          <span className="stat-card-sub">{displayAddress}</span>
          <a
            href={scanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="stat-card-trend text-green"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            View on BscScan <ArrowUpRight size={12} />
          </a>
        </motion.div>

        <motion.div className="overview-stat-card card" variants={fadeUp}>
          <span className="stat-card-label text-secondary">Registered Agents</span>
          <span className="stat-card-value font-display text-gold">{agentCount}</span>
          <span className="stat-card-sub">{agentCount === 0 ? 'No agents registered yet' : `${activeCount} active`}</span>
          <button
            className="stat-card-action"
            onClick={() => navigate(agentCount === 0 ? '/register' : '/dashboard/agents')}
          >
            <Plus size={12} /> {agentCount === 0 ? 'Register Agent' : 'View Agents'}
          </button>
        </motion.div>

        <motion.div className="overview-stat-card card" variants={fadeUp}>
          <span className="stat-card-label text-secondary">Onchain Actions</span>
          <span className="stat-card-value font-display text-gold">{totalActions}</span>
          <span className="stat-card-sub">Commits: {commitStats.commits} · Reveals: {commitStats.reveals}</span>
          <button
            className="stat-card-action"
            onClick={() => navigate('/dashboard/commit')}
          >
            <GitBranch size={12} /> Start Commit
          </button>
        </motion.div>

        <motion.div className="overview-stat-card card" variants={fadeUp}>
          <span className="stat-card-label text-secondary">Rewards Earned</span>
          <span className="stat-card-value font-display" style={{ color: 'var(--gold)' }}>
            {afiDisplay} AFI
          </span>
          <span className="stat-card-sub">
            {parseFloat(claimable) > 0 ? `${claimableDisplay} AFI claimable` : 'No rewards claimable'}
          </span>
          <button
            className="stat-card-action"
            onClick={() => navigate('/dashboard/rewards')}
          >
            <Star size={12} /> View Rewards
          </button>
        </motion.div>
      </div>

      {/* Row 2 - Getting Started + Wallet Info */}
      <div className="overview-row-2">
        <motion.div className="overview-chart-card card" variants={fadeUp}>
          <h3 className="card-title">Getting Started</h3>
          <div className="getting-started-steps">
            <div className="gs-step gs-step-done">
              <div className="gs-step-number gs-done">✓</div>
              <div className="gs-step-content">
                <span className="gs-step-title">Connect Wallet</span>
                <span className="gs-step-desc text-tertiary">Wallet connected: {displayAddress}</span>
              </div>
            </div>
            <div className={`gs-step ${walletBalance > 0 ? 'gs-step-done' : ''}`}>
              <div className={`gs-step-number ${walletBalance > 0 ? 'gs-done' : ''}`}>{walletBalance > 0 ? '✓' : '2'}</div>
              <div className="gs-step-content">
                <span className="gs-step-title">Get Testnet BNB</span>
                <span className="gs-step-desc text-tertiary">
                  {walletBalance > 0 ? (
                    `Balance: ${walletBalance.toFixed(4)} ${currencySymbol}`
                  ) : (
                    <>
                      You need tBNB to pay gas fees.{' '}
                      <a href="https://www.bnbchain.org/en/testnet-faucet" target="_blank" rel="noopener noreferrer" className="text-green">
                        Get free tBNB →
                      </a>
                    </>
                  )}
                </span>
              </div>
            </div>
            <div className={`gs-step ${agentCount > 0 ? 'gs-step-done' : ''}`}>
              <div className={`gs-step-number ${agentCount > 0 ? 'gs-done' : ''}`}>{agentCount > 0 ? '✓' : '3'}</div>
              <div className="gs-step-content">
                <span className="gs-step-title">Register Your First Agent</span>
                <span className="gs-step-desc text-tertiary">
                  {agentCount > 0
                    ? `${agentCount} agent(s) registered`
                    : 'Create an AI agent with a name, strategy, and max position size'}
                </span>
              </div>
            </div>
            <div className={`gs-step ${commitStats.commits > 0 ? 'gs-step-done' : ''}`}>
              <div className={`gs-step-number ${commitStats.commits > 0 ? 'gs-done' : ''}`}>{commitStats.commits > 0 ? '✓' : '4'}</div>
              <div className="gs-step-content">
                <span className="gs-step-title">Submit a Commit-Reveal Action</span>
                <span className="gs-step-desc text-tertiary">
                  {commitStats.commits > 0
                    ? `${commitStats.commits} commits, ${commitStats.reveals} reveals`
                    : 'Your agent commits a hashed action, waits N blocks, then reveals it onchain'}
                </span>
              </div>
            </div>
            <div className={`gs-step ${parseFloat(afiBalance) > 0 ? 'gs-step-done' : ''}`}>
              <div className={`gs-step-number ${parseFloat(afiBalance) > 0 ? 'gs-done' : ''}`}>{parseFloat(afiBalance) > 0 ? '✓' : '5'}</div>
              <div className="gs-step-content">
                <span className="gs-step-title">Earn AFI Rewards</span>
                <span className="gs-step-desc text-tertiary">
                  {parseFloat(afiBalance) > 0
                    ? `Earned: ${afiDisplay} AFI`
                    : 'Successful actions earn AFI tokens and reputation points'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div className="overview-agents-card card" variants={fadeUp}>
          <h3 className="card-title">Wallet Details</h3>
          <div className="wallet-detail-list">
            <div className="wallet-detail-row">
              <span className="text-secondary" style={{ fontSize: 12 }}>ADDRESS</span>
              <span className="font-data" style={{ fontSize: 12, wordBreak: 'break-all' }}>{address}</span>
            </div>
            <div className="wallet-detail-row">
              <span className="text-secondary" style={{ fontSize: 12 }}>NETWORK</span>
              <span className="font-data" style={{ fontSize: 12 }}>
                {chainId === 97 ? 'BNB Smart Chain Testnet' : chainId === 56 ? 'BNB Smart Chain Mainnet' : `Chain ID: ${chainId}`}
              </span>
            </div>
            <div className="wallet-detail-row">
              <span className="text-secondary" style={{ fontSize: 12 }}>BALANCE</span>
              <span className="font-data text-gold" style={{ fontSize: 14 }}>{parseFloat(balance).toFixed(6)} {currencySymbol}</span>
            </div>
            <div className="wallet-detail-row">
              <span className="text-secondary" style={{ fontSize: 12 }}>CHAIN ID</span>
              <span className="font-data" style={{ fontSize: 12 }}>{chainId}</span>
            </div>
            <div className="wallet-detail-row">
              <span className="text-secondary" style={{ fontSize: 12 }}>CONTRACTS</span>
              <span className="font-data" style={{ fontSize: 12, color: contractsLive ? 'var(--green)' : 'var(--amber)' }}>
                {contractsLive ? '● Deployed' : '○ Not deployed'}
              </span>
            </div>
            <div className="wallet-detail-row">
              <span className="text-secondary" style={{ fontSize: 12 }}>EXPLORER</span>
              <a
                href={scanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-data text-green"
                style={{ fontSize: 12, textDecoration: 'none' }}
              >
                View on BscScan →
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Row 3 - Info */}
      <div className="overview-row-3">
        <motion.div className="overview-pipeline-card card" variants={fadeUp}>
          <h3 className="card-title">Active Pipeline</h3>
          <div className="pipeline-empty">
            <GitBranch size={32} strokeWidth={1} />
            <p className="text-tertiary" style={{ fontSize: 13 }}>
              {commitStats.commits > 0
                ? `${commitStats.commits} total commits · ${commitStats.reveals} reveals · ${commitStats.executions} executed`
                : 'No active commit-reveal actions.'}
            </p>
            <button className="stat-card-action" onClick={() => navigate('/dashboard/commit')}>
              {commitStats.commits > 0 ? 'View commit-reveal →' : 'Start your first commit →'}
            </button>
          </div>
        </motion.div>

        <motion.div className="overview-actions-card card" variants={fadeUp}>
          <h3 className="card-title">Recent Activity {dbStats.totalAgents > 0 && <span className="text-tertiary" style={{ fontSize: 11, fontWeight: 400 }}> · {dbStats.totalAgents} agents registered</span>}</h3>
          {recentActivity.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentActivity.slice(0, 5).map((activity, i) => (
                <div key={activity.id || i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)', fontSize: 12,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: activity.action_type === 'register' ? 'var(--green)' :
                      activity.action_type === 'commit' ? 'var(--amber)' :
                      activity.action_type === 'reveal' ? 'var(--cyan)' : 'var(--gold)',
                    flexShrink: 0,
                  }} />
                  <span className="text-secondary" style={{ flex: 1 }}>{activity.description}</span>
                  {activity.created_at && (
                    <span className="text-tertiary" style={{ fontSize: 10, flexShrink: 0 }}>
                      {new Date(activity.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="pipeline-empty">
              <Bot size={32} strokeWidth={1} />
              <p className="text-tertiary" style={{ fontSize: 13 }}>
                {totalActions > 0
                  ? `${totalActions} onchain actions performed.`
                  : 'No activity yet.'}
              </p>
              <p className="text-tertiary" style={{ fontSize: 11 }}>
                Register an agent and submit your first action to see it here.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
