import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWalletStore } from '../stores/stores';
import { useAgentRegistry } from '../stores/agentRegistry';
import { Wallet, GitBranch, ExternalLink } from 'lucide-react';
import {
  commitAction,
  revealAction,
  areContractsDeployed,
  canRevealCommitment,
  getBlocksUntilReveal,
} from '../data/contractService';
import { getExplorerUrl } from '../data/wallet';
import { saveCommitAction, updateCommitStatus, logActivity } from '../data/supabaseService';
import './Commit.css';

interface PendingCommit {
  commitId: string;
  salt: string;
  txHash: string;
  agentId: string;
  action: string;
  protocol: string;
  amount: number;
}

export default function Commit() {
  const { connected, address, signer } = useWalletStore();
  const { agents } = useAgentRegistry();
  const [step, setStep] = useState(1);

  // Form state
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState('Venus');
  const [selectedAction, setSelectedAction] = useState('DEPOSIT');
  const [amount, setAmount] = useState(100);

  // Transaction state
  const [committing, setCommitting] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [pendingCommit, setPendingCommit] = useState<PendingCommit | null>(null);
  const [revealTxHash, setRevealTxHash] = useState('');
  const [blocksRemaining, setBlocksRemaining] = useState(5);
  const [canReveal, setCanReveal] = useState(false);
  const [error, setError] = useState('');

  const contractsLive = areContractsDeployed();

  const myAgents = connected
    ? agents.filter(a => a.ownerAddress.toLowerCase() === address.toLowerCase())
    : [];

  // Auto-select first agent
  useEffect(() => {
    if (myAgents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(myAgents[0].id);
    }
  }, [myAgents, selectedAgentId]);

  // Poll for reveal readiness
  useEffect(() => {
    if (!pendingCommit || step !== 3) return;

    const poll = async () => {
      const ready = await canRevealCommitment(pendingCommit.commitId);
      const blocks = await getBlocksUntilReveal(pendingCommit.commitId);
      setCanReveal(ready);
      setBlocksRemaining(blocks);
    };

    poll();
    const id = setInterval(poll, 3000); // Poll every 3s
    return () => clearInterval(id);
  }, [pendingCommit, step]);

  const handleCommit = async () => {
    if (!signer || !contractsLive) {
      setError(contractsLive ? 'Wallet not connected' : 'Smart contracts not deployed. Deploy contracts first.');
      return;
    }
    if (!selectedAgentId) {
      setError('Please select an agent');
      return;
    }
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setCommitting(true);
    setError('');

    try {
      const result = await commitAction(
        signer,
        selectedAgentId,
        selectedAction,
        selectedProtocol,
        amount,
      );

      setPendingCommit({
        commitId: result.commitId,
        salt: result.salt,
        txHash: result.txHash,
        agentId: selectedAgentId,
        action: selectedAction,
        protocol: selectedProtocol,
        amount,
      });

      // Save to Supabase
      saveCommitAction({
        agent_id: selectedAgentId,
        commit_id: result.commitId,
        commit_hash: '',
        action: selectedAction,
        protocol: selectedProtocol,
        amount,
        salt: result.salt,
        status: 'committed',
        commit_tx_hash: result.txHash,
        owner_address: address.toLowerCase(),
      });
      logActivity({
        owner_address: address,
        action_type: 'commit',
        description: `Committed ${selectedAction} ${amount} USDT on ${selectedProtocol}`,
        tx_hash: result.txHash,
      });

      setCommitting(false);
      setStep(3); // Go to waiting step
    } catch (err: any) {
      console.error('Commit failed:', err);
      setError(err.message || 'Commit transaction failed');
      setCommitting(false);
    }
  };

  const handleReveal = async () => {
    if (!signer || !pendingCommit) return;

    setRevealing(true);
    setError('');

    try {
      const txHash = await revealAction(
        signer,
        pendingCommit.commitId,
        pendingCommit.action,
        pendingCommit.protocol,
        pendingCommit.amount,
        pendingCommit.salt,
      );

      setRevealTxHash(txHash);

      // Update Supabase
      if (pendingCommit) {
        updateCommitStatus(pendingCommit.commitId, 'revealed', txHash);
        logActivity({
          owner_address: address,
          action_type: 'reveal',
          description: `Revealed ${pendingCommit.action} ${pendingCommit.amount} USDT on ${pendingCommit.protocol}`,
          tx_hash: txHash,
        });
      }

      setRevealing(false);
      setStep(4); // Success step
    } catch (err: any) {
      console.error('Reveal failed:', err);
      setError(err.message || 'Reveal transaction failed');
      setRevealing(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setPendingCommit(null);
    setRevealTxHash('');
    setCanReveal(false);
    setBlocksRemaining(5);
    setError('');
  };

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

      {/* Contract status */}
      {!contractsLive && (
        <div style={{
          background: 'var(--amber-dim)',
          border: '1px solid rgba(255,184,0,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          marginBottom: 16,
          fontSize: 13,
          color: 'var(--amber)',
        }}>
          ⚠ Smart contracts not deployed. Commit-reveal requires deployed contracts on BNB Chain.
        </div>
      )}

      {/* Error */}
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
              <h4>Step 1 — Build Action</h4>
              <div className="form-group">
                <label className="form-label">Select Agent</label>
                <select
                  className="input-field"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                >
                  {myAgents.length === 0 ? (
                    <option value="">No agents registered — register one first</option>
                  ) : (
                    myAgents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.id.slice(0, 6)}...{a.id.slice(-4)})</option>
                    ))
                  )}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Protocol</label>
                <select
                  className="input-field"
                  value={selectedProtocol}
                  onChange={(e) => setSelectedProtocol(e.target.value)}
                >
                  <option value="Venus">Venus</option>
                  <option value="Radiant">Radiant</option>
                  <option value="Kinza">Kinza</option>
                  <option value="Aave">Aave</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Action Type</label>
                <div className="action-type-row">
                  {['DEPOSIT', 'WITHDRAW', 'BORROW', 'REPAY'].map((a) => (
                    <button
                      key={a}
                      className={`btn-ghost ${selectedAction === a ? 'btn-ghost-active' : ''}`}
                      style={{
                        padding: '6px 14px',
                        fontSize: 11,
                        background: selectedAction === a ? 'var(--gold)' : undefined,
                        color: selectedAction === a ? 'var(--bg-primary)' : undefined,
                        borderColor: selectedAction === a ? 'var(--gold)' : undefined,
                      }}
                      onClick={() => setSelectedAction(a)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (USDT)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </div>
              <button
                className="btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={() => setStep(2)}
                disabled={myAgents.length === 0}
              >
                Preview Action
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="commit-step-content">
              <h4>Step 2 — Commit Hash</h4>
              <div className="preview-block card-glow" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="text-tertiary" style={{ fontSize: 12 }}>Agent</span>
                  <span className="font-data" style={{ fontSize: 12 }}>{selectedAgentId.slice(0, 10)}...{selectedAgentId.slice(-4)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="text-tertiary" style={{ fontSize: 12 }}>Action</span>
                  <span className="font-data text-gold" style={{ fontSize: 12 }}>{selectedAction} → {selectedProtocol}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="text-tertiary" style={{ fontSize: 12 }}>Amount</span>
                  <span className="font-data" style={{ fontSize: 12 }}>{amount.toLocaleString()} USDT</span>
                </div>
                <p className="text-tertiary" style={{ fontSize: 11, marginTop: 12, textAlign: 'center' }}>
                  Clicking "Submit Commit" will send a transaction with your hashed action onchain.
                </p>
              </div>
              <button
                className="btn-primary btn-lg"
                style={{ width: '100%', marginTop: 16 }}
                onClick={handleCommit}
                disabled={committing || !contractsLive}
              >
                {committing ? 'Submitting commit tx...' : 'Submit Commit'}
              </button>
              <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setStep(1)}>
                Back
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="commit-step-content">
              <h4>Step 3 — Waiting for Reveal Window</h4>
              {pendingCommit && (
                <div style={{ marginBottom: 16 }}>
                  <a
                    href={getExplorerUrl(pendingCommit.txHash, 'tx')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-data text-cyan"
                    style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}
                  >
                    Commit TX: {pendingCommit.txHash.slice(0, 12)}...{pendingCommit.txHash.slice(-6)} <ExternalLink size={10} />
                  </a>
                </div>
              )}
              <div className="waiting-block">
                <p className="text-secondary">
                  {canReveal
                    ? '✓ Reveal window is open! You can now reveal your action.'
                    : `Waiting for commit window (${blocksRemaining} blocks remaining)...`}
                </p>
                <div className="progress-bar" style={{ marginTop: 16 }}>
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${canReveal ? 100 : Math.max(0, ((5 - blocksRemaining) / 5) * 100)}%` }}
                  />
                </div>
              </div>
              <button
                className="btn-primary btn-lg"
                style={{ width: '100%', marginTop: 16 }}
                onClick={handleReveal}
                disabled={!canReveal || revealing}
              >
                {revealing ? 'Submitting reveal tx...' : canReveal ? 'Submit Reveal' : `Waiting (${blocksRemaining} blocks)...`}
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="commit-step-content">
              <h4>Step 4 — Result</h4>
              <div className="result-success">
                <div className="result-icon">✓</div>
                <h3 className="text-green">Action Executed</h3>
                <p className="text-secondary" style={{ fontSize: 13 }}>
                  Your action has been revealed and executed onchain.
                </p>
                {revealTxHash && (
                  <a
                    href={getExplorerUrl(revealTxHash, 'tx')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-data text-cyan"
                    style={{ fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 }}
                  >
                    Reveal TX: {revealTxHash.slice(0, 12)}...{revealTxHash.slice(-6)} <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <button className="btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={resetForm}>
                Submit Another Action
              </button>
            </div>
          )}
        </div>

        {/* Active Pipeline */}
        <div className="card">
          <h3 className="card-title">Active Pipeline</h3>
          {pendingCommit && step === 3 ? (
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="text-tertiary" style={{ fontSize: 12 }}>Action</span>
                <span className="font-data text-gold" style={{ fontSize: 12 }}>{pendingCommit.action} → {pendingCommit.protocol}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="text-tertiary" style={{ fontSize: 12 }}>Amount</span>
                <span className="font-data" style={{ fontSize: 12 }}>{pendingCommit.amount} USDT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="text-tertiary" style={{ fontSize: 12 }}>Phase</span>
                <span className="badge badge-commit" style={{ fontSize: 11 }}>
                  {canReveal ? '◉ READY TO REVEAL' : '⟳ WAITING'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-tertiary" style={{ fontSize: 12 }}>Blocks remaining</span>
                <span className="font-data" style={{ fontSize: 12 }}>{blocksRemaining}</span>
              </div>
            </div>
          ) : (
            <div className="pipeline-empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
              <GitBranch size={32} strokeWidth={1} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
              <p className="text-tertiary" style={{ fontSize: 13 }}>No active commit-reveal actions.</p>
              <p className="text-tertiary" style={{ fontSize: 11, marginTop: 4 }}>
                Actions will appear here once you submit a commit.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
