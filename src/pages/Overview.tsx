import { motion } from 'framer-motion';
import { useWalletStore } from '../stores/stores';
import { useAgentRegistry } from '../stores/agentRegistry';
import { useCountUp } from '../hooks/hooks';
import { Wallet, Bot, GitBranch, Star, Plus, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

  const myAgents = connected
    ? agents.filter(a => a.ownerAddress.toLowerCase() === address.toLowerCase())
    : [];
  const agentCount = myAgents.length;
  const activeCount = myAgents.filter(a => a.status === 'active').length;

  const walletBalance = parseFloat(balance || '0');
  const animatedBalance = useCountUp(walletBalance, 800);

  const currencySymbol = chainId === 56 ? 'BNB' : chainId === 97 ? 'tBNB' : 'ETH';
  const scanUrl = chainId === 97
    ? `https://testnet.bscscan.com/address/${address}`
    : `https://bscscan.com/address/${address}`;

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
          <span className="stat-card-value font-display text-gold">0</span>
          <span className="stat-card-sub">Commits: 0 · Reveals: 0</span>
          <button
            className="stat-card-action"
            onClick={() => navigate('/dashboard/commit')}
          >
            <GitBranch size={12} /> Start Commit
          </button>
        </motion.div>

        <motion.div className="overview-stat-card card" variants={fadeUp}>
          <span className="stat-card-label text-secondary">Rewards Earned</span>
          <span className="stat-card-value font-display" style={{ color: 'var(--gold)' }}>0 AFI</span>
          <span className="stat-card-sub">No rewards claimable</span>
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
            <div className="gs-step">
              <div className="gs-step-number">2</div>
              <div className="gs-step-content">
                <span className="gs-step-title">Get Testnet BNB</span>
                <span className="gs-step-desc text-tertiary">
                  You need tBNB to pay gas fees.{' '}
                  <a href="https://www.bnbchain.org/en/testnet-faucet" target="_blank" rel="noopener noreferrer" className="text-green">
                    Get free tBNB →
                  </a>
                </span>
              </div>
            </div>
            <div className="gs-step">
              <div className="gs-step-number">3</div>
              <div className="gs-step-content">
                <span className="gs-step-title">Register Your First Agent</span>
                <span className="gs-step-desc text-tertiary">Create an AI agent with a name, strategy, and max position size</span>
              </div>
            </div>
            <div className="gs-step">
              <div className="gs-step-number">4</div>
              <div className="gs-step-content">
                <span className="gs-step-title">Submit a Commit-Reveal Action</span>
                <span className="gs-step-desc text-tertiary">Your agent commits a hashed action, waits N blocks, then reveals it onchain</span>
              </div>
            </div>
            <div className="gs-step">
              <div className="gs-step-number">5</div>
              <div className="gs-step-content">
                <span className="gs-step-title">Earn AFI Rewards</span>
                <span className="gs-step-desc text-tertiary">Successful actions earn AFI tokens and reputation points</span>
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
            <p className="text-tertiary" style={{ fontSize: 13 }}>No active commit-reveal actions.</p>
            <button className="stat-card-action" onClick={() => navigate('/dashboard/commit')}>
              Start your first commit →
            </button>
          </div>
        </motion.div>

        <motion.div className="overview-actions-card card" variants={fadeUp}>
          <h3 className="card-title">Recent Actions</h3>
          <div className="pipeline-empty">
            <Bot size={32} strokeWidth={1} />
            <p className="text-tertiary" style={{ fontSize: 13 }}>No onchain actions yet.</p>
            <p className="text-tertiary" style={{ fontSize: 11 }}>Register an agent and submit your first action to see it here.</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
