import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWalletStore } from '../stores/stores';
import { useAgentRegistry } from '../stores/agentRegistry';
import { Wallet, GitBranch } from 'lucide-react';
import './Commit.css';

export default function Commit() {
  const { connected, address } = useWalletStore();
  const { agents } = useAgentRegistry();
  const [step, setStep] = useState(1);

  const myAgents = connected
    ? agents.filter(a => a.ownerAddress.toLowerCase() === address.toLowerCase())
    : [];

  if (!connected) {
    return (
      <motion.div className="commit-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="page-title font-display">Commit / Reveal</h1>
        <p className="text-secondary" style={{ marginBottom: 24 }}>
          Submit actions using the commit-reveal mechanism for frontrunning protection.
        </p>
        <div className="empty-state-card card">
          <Wallet size={40} strokeWidth={1} />
          <h3 style={{ marginTop: 12 }}>Connect your wallet</h3>
          <p className="text-secondary" style={{ fontSize: 13, maxWidth: 360, textAlign: 'center' }}>
            Connect your MetaMask wallet and register an agent to submit commit-reveal actions.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="commit-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="page-title font-display">Commit / Reveal</h1>
      <p className="text-secondary" style={{ marginBottom: 24 }}>
        Submit actions using the commit-reveal mechanism for frontrunning protection.
      </p>

      <div className="commit-layout">
        {/* New Action Form */}
        <div className="card commit-form-card">
          <h3 className="card-title">Submit a new action</h3>
          <div className="commit-steps">
            <div className="commit-step-indicator">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`step-dot ${step >= s ? 'step-dot-active' : ''}`}>
                  {s}
                </div>
              ))}
            </div>
          </div>

          {step === 1 && (
            <div className="commit-step-content">
              <h4>Step 1 - Build Action</h4>
              <div className="form-group">
                <label className="form-label">Select Agent</label>
                <select className="input-field">
                  {myAgents.length === 0 ? (
                    <option>No agents registered - register one first</option>
                  ) : (
                    myAgents.map(a => (
                      <option key={a.id}>{a.name} ({a.id.slice(0, 6)}...{a.id.slice(-4)})</option>
                    ))
                  )}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Protocol</label>
                <select className="input-field">
                  <option>Select a protocol</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Action Type</label>
                <div className="action-type-row">
                  {['DEPOSIT', 'WITHDRAW', 'BORROW', 'REPAY'].map((a) => (
                    <button key={a} className="btn-ghost" style={{ padding: '6px 14px', fontSize: 11 }}>{a}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (USDT)</label>
                <input type="number" className="input-field" placeholder="Enter amount" />
              </div>
              <button className="btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setStep(2)}>
                Preview Action
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="commit-step-content">
              <h4>Step 2 - Commit Hash</h4>
              <div className="preview-block card-glow">
                <p className="text-secondary" style={{ fontSize: 13, textAlign: 'center', padding: 16 }}>
                  Register an agent first to generate commit hashes for onchain actions.
                </p>
              </div>
              <button className="btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={() => setStep(1)}>
                Back
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="commit-step-content">
              <h4>Step 3 - Waiting for Reveal Window</h4>
              <div className="waiting-block">
                <p className="text-secondary">Waiting for commit window (5 blocks)...</p>
                <div className="progress-bar" style={{ marginTop: 16 }}>
                  <div className="progress-bar-fill" style={{ width: '0%' }} />
                </div>
              </div>
              <button className="btn-primary btn-lg" style={{ width: '100%', marginTop: 16 }} onClick={() => setStep(4)}>
                Submit Reveal
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="commit-step-content">
              <h4>Step 4 - Result</h4>
              <div className="result-success">
                <div className="result-icon">✓</div>
                <h3 className="text-green">Action Executed</h3>
                <p className="text-secondary" style={{ fontSize: 13 }}>
                  Your action has been revealed and executed onchain.
                </p>
              </div>
              <button className="btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={() => setStep(1)}>
                Submit Another Action
              </button>
            </div>
          )}
        </div>

        {/* Active Pipeline */}
        <div className="card">
          <h3 className="card-title">Active Pipeline</h3>
          <div className="pipeline-empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
            <GitBranch size={32} strokeWidth={1} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
            <p className="text-tertiary" style={{ fontSize: 13 }}>No active commit-reveal actions.</p>
            <p className="text-tertiary" style={{ fontSize: 11, marginTop: 4 }}>
              Actions will appear here once you submit a commit.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
