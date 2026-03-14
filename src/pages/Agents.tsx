import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWalletStore } from '../stores/stores';
import { useAgentRegistry } from '../stores/agentRegistry';
import { Bot, Plus, Wallet, Trash2 } from 'lucide-react';
import './Agents.css';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function Agents() {
  const { connected, address } = useWalletStore();
  const { agents, removeAgent } = useAgentRegistry();

  // Filter agents owned by current wallet
  const myAgents = connected
    ? agents.filter(a => a.ownerAddress.toLowerCase() === address.toLowerCase())
    : [];

  return (
    <motion.div className="agents-page" initial="hidden" animate="visible" variants={stagger}>
      <div className="agents-header">
        <h1 className="page-title font-display">My Agents</h1>
        {connected && (
          <Link to="/register" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Register New Agent
          </Link>
        )}
      </div>

      {!connected ? (
        <motion.div className="empty-state-card card" variants={fadeUp}>
          <Wallet size={40} strokeWidth={1} />
          <h3 style={{ marginTop: 12 }}>Connect your wallet</h3>
          <p className="text-secondary" style={{ fontSize: 13, maxWidth: 360, textAlign: 'center' }}>
            Connect your MetaMask wallet to view and manage your registered agents.
          </p>
        </motion.div>
      ) : myAgents.length === 0 ? (
        <motion.div className="empty-state-card card" variants={fadeUp}>
          <Bot size={40} strokeWidth={1} />
          <h3 style={{ marginTop: 12 }}>No Agents Registered</h3>
          <p className="text-secondary" style={{ fontSize: 13, maxWidth: 360, textAlign: 'center' }}>
            You haven't registered any agents yet. Register your first agent to start autonomous DeFi actions.
          </p>
          <Link to="/register" className="btn-primary" style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Register Your First Agent
          </Link>
        </motion.div>
      ) : (
        <motion.div className="agents-grid" variants={stagger}>
          {myAgents.map((agent) => (
            <motion.div key={agent.id} variants={fadeUp}>
              <div className="agent-card card">
                <div className="agent-card-header">
                  <div>
                    <h3 className="agent-card-name">{agent.name}</h3>
                    <span className="agent-card-id font-data text-cyan">{agent.id.slice(0, 10)}...{agent.id.slice(-4)}</span>
                  </div>
                  <span className={`badge badge-${agent.status === 'active' ? 'active' : 'idle'}`}>
                    {agent.status === 'active' ? '● ACTIVE' : '○ IDLE'}
                  </span>
                </div>
                <div className="agent-card-metrics">
                  <div className="agent-metric">
                    <span className="agent-metric-label text-tertiary">Strategy</span>
                    <span className="agent-metric-value font-data" style={{ fontSize: 12 }}>{agent.strategy.split('(')[0].trim()}</span>
                  </div>
                  <div className="agent-metric">
                    <span className="agent-metric-label text-tertiary">Max Position</span>
                    <span className="agent-metric-value font-data">${agent.maxPositionSize.toLocaleString()}</span>
                  </div>
                  <div className="agent-metric">
                    <span className="agent-metric-label text-tertiary">Reputation</span>
                    <span className="agent-metric-value font-data" style={{ color: 'var(--amber)' }}>{agent.reputation}</span>
                  </div>
                  <div className="agent-metric">
                    <span className="agent-metric-label text-tertiary">Actions</span>
                    <span className="agent-metric-value font-data">{agent.actionsCount}</span>
                  </div>
                </div>
                <div className="agent-card-footer">
                  <span className="text-tertiary" style={{ fontSize: 12 }}>
                    Created: {new Date(agent.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    className="btn-ghost"
                    style={{ padding: '4px 10px', fontSize: 11, color: 'var(--red)' }}
                    onClick={() => removeAgent(agent.id)}
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
