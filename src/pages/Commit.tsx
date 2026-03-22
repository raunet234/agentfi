import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '../stores/stores';
import { useAgentRegistry } from '../stores/agentRegistry';
import {
  Wallet, GitBranch, ExternalLink, Zap, Play, Square, Settings2,
  Eye, CheckCircle, TrendingUp, Shield, Clock,
} from 'lucide-react';
import {
  commitAction,
  revealAction,
  areContractsDeployed,
  canRevealCommitment,
  getBlocksUntilReveal,
} from '../data/contractService';
import { fetchBscPools } from '../data/defiService';
import type { DeFiPool } from '../data/defiService';
import { getExplorerUrl } from '../data/wallet';
import { saveCommitAction, updateCommitStatus, logActivity } from '../data/supabaseService';
import { useNotificationStore } from '../stores/notificationStore';
import './Commit.css';

// ─── Types ───
interface PendingCommit {
  commitId: string;
  salt: string;
  txHash: string;
  agentId: string;
  action: string;
  protocol: string;
  amount: number;
}

interface Opportunity {
  pool: DeFiPool;
  protocol: string;
  action: string;
  amount: number;
  reason: string;
  riskLevel: string;
}

interface LogEntry {
  time: string;
  emoji: string;
  msg: string;
}

// ─── Strategy Engine ───
const RISK_MAP: Record<string, string> = {
  'venus-core-pool': 'Low', 'venus-flux': 'Low',
  'pancakeswap-amm-v3': 'Medium', 'pancakeswap-amm-v2': 'Medium',
  'lista-lending': 'Low', 'lista-liquid-staking': 'Low', 'lista-cdp': 'Medium',
  'aave-v3': 'Low', 'radiant-v2': 'Medium', 'kinza-finance': 'Medium',
  'alpaca-finance-2.0': 'High', 'thena-v1': 'Medium', 'biswap-v3': 'Medium',
  'wombat-exchange': 'Low', 'binance-staked-eth': 'Low',
};

const PROTOCOL_NAMES: Record<string, string> = {
  'venus-core-pool': 'Venus', 'venus-flux': 'Venus',
  'pancakeswap-amm-v3': 'PancakeSwap', 'pancakeswap-amm-v2': 'PancakeSwap',
  'lista-lending': 'Lista', 'lista-liquid-staking': 'Lista', 'lista-cdp': 'Lista',
  'aave-v3': 'Aave', 'radiant-v2': 'Radiant', 'kinza-finance': 'Kinza',
  'alpaca-finance-2.0': 'Alpaca', 'thena-v1': 'Thena',
};

function pickBestPool(pools: DeFiPool[], strategy: string): DeFiPool | null {
  let filtered = pools.map(p => ({ ...p, riskLevel: RISK_MAP[p.project] || 'Medium' }));

  if (strategy.includes('Conservative') || strategy.includes('Low')) {
    filtered = filtered.filter(p => p.riskLevel === 'Low' || p.stablecoin);
  } else if (strategy.includes('Balanced') || strategy.includes('Medium')) {
    filtered = filtered.filter(p => p.riskLevel !== 'High');
  }

  filtered.sort((a, b) => b.apy - a.apy);
  return filtered[0] || null;
}

// ─── Component ───
export default function Commit() {
  const { connected, address, ensureSigner } = useWalletStore();
  const { agents } = useAgentRegistry();

  // Mode toggle
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  // Agent selection
  const [selectedAgentId, setSelectedAgentId] = useState('');

  // Auto mode states
  type AgentPhase = 'idle' | 'monitoring' | 'opportunity' | 'executing' | 'waiting-reveal' | 'revealing' | 'cooldown';
  const [phase, setPhase] = useState<AgentPhase>('idle');
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scanCount, setScanCount] = useState(0);
  const [poolsScanned, setPoolsScanned] = useState(0);
  const [lastScanTime, setLastScanTime] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const monitorRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Transaction state
  const [pendingCommit, setPendingCommit] = useState<PendingCommit | null>(null);
  const [revealTxHash, setRevealTxHash] = useState('');
  const [blocksRemaining, setBlocksRemaining] = useState(5);
  const [canRevealNow, setCanRevealNow] = useState(false);
  const [error, setError] = useState('');
  const { addNotification } = useNotificationStore();

  // Manual mode
  const [manualStep, setManualStep] = useState(1);
  const [manualProtocol, setManualProtocol] = useState('Venus');
  const [manualAction, setManualAction] = useState('DEPOSIT');
  const [manualAmount, setManualAmount] = useState(100);
  const [committing, setCommitting] = useState(false);
  const [revealing, setRevealing] = useState(false);

  const contractsLive = areContractsDeployed();
  const myAgents = connected
    ? agents.filter(a => a.ownerAddress?.toLowerCase() === address?.toLowerCase())
    : [];

  // Auto-select first agent
  useEffect(() => {
    if (myAgents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(myAgents[0].id);
    }
  }, [myAgents, selectedAgentId]);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Poll for reveal readiness
  useEffect(() => {
    if (!pendingCommit) return;
    const poll = async () => {
      const ready = await canRevealCommitment(pendingCommit.commitId);
      const blocks = await getBlocksUntilReveal(pendingCommit.commitId);
      setCanRevealNow(ready);
      setBlocksRemaining(blocks);
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [pendingCommit]);

  // Auto-reveal when ready (during auto mode execution)
  useEffect(() => {
    if (phase === 'waiting-reveal' && canRevealNow && pendingCommit) {
      handleAutoReveal();
    }
  }, [phase, canRevealNow, pendingCommit]);

  const addLog = useCallback((emoji: string, msg: string) => {
    setLogs(prev => [...prev.slice(-80), {
      time: new Date().toLocaleTimeString(),
      emoji, msg,
    }]);
  }, []);

  // ─── MONITORING — Silent pool scanning (NO MetaMask) ───
  const scanForOpportunity = useCallback(async () => {
    const agent = myAgents.find(a => a.id === selectedAgentId) || myAgents[0];
    if (!agent || !contractsLive) return;

    addLog('👁', `Scanning DeFi pools... (scan #${scanCount + 1})`);
    setScanCount(prev => prev + 1);

    let pools: DeFiPool[];
    try {
      pools = await fetchBscPools(true);
      setPoolsScanned(pools.length);
      setLastScanTime(new Date().toLocaleTimeString());
      addLog('📊', `Found ${pools.length} BSC pools`);
    } catch {
      addLog('❌', 'Failed to fetch pools. Will retry...');
      return;
    }

    // Pick best pool for agent's strategy
    const best = pickBestPool(pools, agent.strategy);
    if (!best) {
      addLog('ℹ️', `No suitable pool for "${agent.strategy}" strategy. Monitoring...`);
      return;
    }

    const riskLevel = RISK_MAP[best.project] || 'Medium';
    const protocol = PROTOCOL_NAMES[best.project] || best.project;
    const percentage = agent.maxPositionSize <= 100 ? 0.8 : 0.1;
    const amount = Math.max(1, Math.floor(agent.maxPositionSize * percentage));

    addLog('🏆', `Found: ${best.symbol} on ${protocol} — ${best.apy.toFixed(2)}% APY (${riskLevel} risk)`);

    // Present opportunity to user — NO MetaMask yet
    setOpportunity({
      pool: best,
      protocol,
      action: 'DEPOSIT',
      amount,
      reason: `Best ${riskLevel.toLowerCase()}-risk yield matching your ${agent.strategy.split('(')[0].trim()} strategy`,
      riskLevel,
    });

    setPhase('opportunity');
    addLog('💡', `Opportunity ready — waiting for your approval.`);

  }, [myAgents, selectedAgentId, contractsLive, scanCount, addLog]);

  // ─── START / STOP monitoring ───
  const startMonitoring = () => {
    setPhase('monitoring');
    setLogs([]);
    setScanCount(0);
    setOpportunity(null);
    addLog('🚀', 'Agent v5 started — monitoring mode.');
    addLog('👁', 'Silently scanning for opportunities...');

    // First scan immediately
    scanForOpportunity();

    // Then scan every 30 seconds
    monitorRef.current = setInterval(scanForOpportunity, 30_000);
  };

  const stopMonitoring = () => {
    if (monitorRef.current) clearInterval(monitorRef.current);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    monitorRef.current = null;
    cooldownRef.current = null;
    setPhase('idle');
    setOpportunity(null);
    setCooldownSeconds(0);
    addLog('🛑', 'Agent stopped.');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (monitorRef.current) clearInterval(monitorRef.current);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // ─── EXECUTE — Only when user clicks "Approve & Execute" ───
  const executeOpportunity = async () => {
    if (!opportunity) return;

    const agent = myAgents.find(a => a.id === selectedAgentId) || myAgents[0];
    if (!agent) return;

    // Pause monitoring during execution
    if (monitorRef.current) clearInterval(monitorRef.current);
    monitorRef.current = null;

    setPhase('executing');
    setError('');
    addLog('🔒', `Executing: ${opportunity.action} ${opportunity.amount} USDT → ${opportunity.protocol}`);
    addLog('📱', 'MetaMask will appear — please approve (this is the only prompt).');

    try {
      const signer = await ensureSigner();
      const result = await commitAction(
        signer, agent.id, opportunity.action,
        opportunity.protocol, opportunity.amount,
      );

      const pending: PendingCommit = {
        commitId: result.commitId, salt: result.salt, txHash: result.txHash,
        agentId: agent.id, action: opportunity.action,
        protocol: opportunity.protocol, amount: opportunity.amount,
      };
      setPendingCommit(pending);

      // Log to Supabase
      saveCommitAction({
        agent_id: agent.id, commit_id: result.commitId, commit_hash: '',
        action: opportunity.action, protocol: opportunity.protocol,
        amount: opportunity.amount, salt: result.salt, status: 'committed',
        commit_tx_hash: result.txHash, owner_address: address.toLowerCase(),
      });
      logActivity({
        owner_address: address, action_type: 'commit',
        description: `[AUTO] Committed ${opportunity.action} ${opportunity.amount} USDT on ${opportunity.protocol}`,
        tx_hash: result.txHash,
      });
      addNotification({
        type: 'commit', title: '🤖 Agent Committed',
        message: `${opportunity.action} ${opportunity.amount} USDT on ${opportunity.protocol}`,
        txHash: result.txHash,
      });

      addLog('✅', `Committed! TX: ${result.txHash.slice(0, 16)}...`);
      addLog('⏳', 'Waiting for reveal window (~15 seconds)...');
      setPhase('waiting-reveal');

    } catch (err: any) {
      addLog('❌', `Transaction failed: ${err.message}`);
      setError(err.message);
      // Resume monitoring
      setPhase('monitoring');
      setOpportunity(null);
      monitorRef.current = setInterval(scanForOpportunity, 30_000);
    }
  };

  // ─── SKIP opportunity ───
  const skipOpportunity = () => {
    addLog('⏭', 'Opportunity skipped. Continuing to monitor...');
    setOpportunity(null);
    setPhase('monitoring');
    // Resume monitoring
    if (!monitorRef.current) {
      monitorRef.current = setInterval(scanForOpportunity, 30_000);
    }
  };

  // ─── AUTO REVEAL ───
  const handleAutoReveal = async () => {
    if (!pendingCommit) return;

    setPhase('revealing');
    addLog('🔓', 'Reveal window open! Submitting reveal...');
    addLog('📱', 'MetaMask will appear for the reveal transaction.');

    try {
      const signer = await ensureSigner();
      const txHash = await revealAction(
        signer, pendingCommit.commitId, pendingCommit.action,
        pendingCommit.protocol, pendingCommit.amount, pendingCommit.salt,
      );

      setRevealTxHash(txHash);
      updateCommitStatus(pendingCommit.commitId, 'revealed', txHash);
      logActivity({
        owner_address: address, action_type: 'reveal',
        description: `[AUTO] Revealed ${pendingCommit.action} ${pendingCommit.amount} USDT on ${pendingCommit.protocol}`,
        tx_hash: txHash,
      });
      addNotification({
        type: 'reveal', title: '🤖 Agent Executed!',
        message: `${pendingCommit.action} ${pendingCommit.amount} USDT on ${pendingCommit.protocol} — +2 AFI earned`,
        txHash,
      });

      addLog('🎉', `Executed! TX: ${txHash.slice(0, 16)}...`);
      addLog('⭐', '+2 AFI tokens earned!');

      setPendingCommit(null);
      setOpportunity(null);

      // Enter cooldown — agent rests before looking for next opportunity
      const COOLDOWN = 120; // 2 minutes
      setCooldownSeconds(COOLDOWN);
      setPhase('cooldown');
      addLog('😎', `Cooldown — next scan in ${COOLDOWN}s. No more popups.`);

      cooldownRef.current = setInterval(() => {
        setCooldownSeconds(prev => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            cooldownRef.current = null;
            setPhase('monitoring');
            addLog('👁', 'Cooldown over. Resuming monitoring...');
            // Restart monitoring
            scanForOpportunity();
            monitorRef.current = setInterval(scanForOpportunity, 30_000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err: any) {
      addLog('❌', `Reveal failed: ${err.message}`);
      setPhase('monitoring');
      setOpportunity(null);
      monitorRef.current = setInterval(scanForOpportunity, 30_000);
    }
  };

  // ─── Manual Mode Handlers ───
  const handleManualCommit = async () => {
    if (!contractsLive || !selectedAgentId || manualAmount <= 0) return;
    setCommitting(true); setError('');
    try {
      const signer = await ensureSigner();
      const result = await commitAction(signer, selectedAgentId, manualAction, manualProtocol, manualAmount);
      setPendingCommit({ commitId: result.commitId, salt: result.salt, txHash: result.txHash, agentId: selectedAgentId, action: manualAction, protocol: manualProtocol, amount: manualAmount });
      saveCommitAction({ agent_id: selectedAgentId, commit_id: result.commitId, commit_hash: '', action: manualAction, protocol: manualProtocol, amount: manualAmount, salt: result.salt, status: 'committed', commit_tx_hash: result.txHash, owner_address: address.toLowerCase() });
      logActivity({ owner_address: address, action_type: 'commit', description: `Committed ${manualAction} ${manualAmount} USDT on ${manualProtocol}`, tx_hash: result.txHash });
      addNotification({ type: 'commit', title: 'Action Committed', message: `${manualAction} ${manualAmount} USDT on ${manualProtocol}`, txHash: result.txHash });
      setManualStep(3);
    } catch (err: any) { setError(err.message); }
    setCommitting(false);
  };

  const handleManualReveal = async () => {
    if (!pendingCommit) return;
    setRevealing(true); setError('');
    try {
      const signer = await ensureSigner();
      const txHash = await revealAction(signer, pendingCommit.commitId, pendingCommit.action, pendingCommit.protocol, pendingCommit.amount, pendingCommit.salt);
      setRevealTxHash(txHash);
      updateCommitStatus(pendingCommit.commitId, 'revealed', txHash);
      logActivity({ owner_address: address, action_type: 'reveal', description: `Revealed ${pendingCommit.action} ${pendingCommit.amount} USDT on ${pendingCommit.protocol}`, tx_hash: txHash });
      addNotification({ type: 'reveal', title: 'Action Revealed!', message: `${pendingCommit.action} ${pendingCommit.amount} USDT on ${pendingCommit.protocol}`, txHash });
      setManualStep(4);
    } catch (err: any) { setError(err.message); }
    setRevealing(false);
  };

  const resetManual = () => { setManualStep(1); setPendingCommit(null); setRevealTxHash(''); setCanRevealNow(false); setBlocksRemaining(5); setError(''); };

  // ─── Phase display helpers ───
  const phaseLabel: Record<AgentPhase, string> = {
    'idle': 'STOPPED',
    'monitoring': 'MONITORING',
    'opportunity': 'OPPORTUNITY FOUND',
    'executing': 'EXECUTING',
    'waiting-reveal': 'WAITING',
    'revealing': 'REVEALING',
    'cooldown': 'COOLDOWN',
  };

  const phaseColor: Record<AgentPhase, string> = {
    'idle': 'var(--text-tertiary)',
    'monitoring': 'var(--cyan)',
    'opportunity': 'var(--gold)',
    'executing': 'var(--amber)',
    'waiting-reveal': 'var(--amber)',
    'revealing': 'var(--amber)',
    'cooldown': 'var(--green)',
  };

  // ─── Not Connected ───
  if (!connected) {
    return (
      <motion.div className="commit-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="page-title font-display">Agent Automation</h1>
        <p className="text-secondary" style={{ marginBottom: 24 }}>
          Your agent monitors DeFi markets, detects opportunities, and executes only when you approve.
        </p>
        <div className="empty-state-card card">
          <Wallet size={40} strokeWidth={1} />
          <h3 style={{ marginTop: 12 }}>Connect your wallet</h3>
          <p className="text-secondary" style={{ fontSize: 13, maxWidth: 360, textAlign: 'center' }}>
            Connect your MetaMask wallet and register an agent to start automated DeFi strategies.
          </p>
        </div>
      </motion.div>
    );
  }

  // ─── Connected ───
  return (
    <motion.div className="commit-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 className="page-title font-display" style={{ marginBottom: 0 }}>Agent Automation</h1>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 3 }}>
          <button onClick={() => setMode('auto')} style={{
            padding: '6px 16px', fontSize: 12, fontWeight: 600, borderRadius: 'var(--radius-sm)',
            border: 'none', cursor: 'pointer',
            background: mode === 'auto' ? 'var(--gold)' : 'transparent',
            color: mode === 'auto' ? 'var(--bg-primary)' : 'var(--text-secondary)',
          }}>
            <Zap size={12} style={{ marginRight: 4 }} /> Auto Mode
          </button>
          <button onClick={() => setMode('manual')} style={{
            padding: '6px 16px', fontSize: 12, fontWeight: 600, borderRadius: 'var(--radius-sm)',
            border: 'none', cursor: 'pointer',
            background: mode === 'manual' ? 'var(--gold)' : 'transparent',
            color: mode === 'manual' ? 'var(--bg-primary)' : 'var(--text-secondary)',
          }}>
            <Settings2 size={12} style={{ marginRight: 4 }} /> Manual Override
          </button>
        </div>
      </div>
      <p className="text-secondary" style={{ marginBottom: 24 }}>
        {mode === 'auto'
          ? 'Agent monitors markets silently. MetaMask only appears when you approve an opportunity.'
          : 'Manually build and submit commit-reveal actions for testing or overriding.'}
      </p>

      {!contractsLive && (
        <div style={{ background: 'var(--amber-dim)', border: '1px solid rgba(255,184,0,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--amber)' }}>
          ⚠ Smart contracts not deployed.
        </div>
      )}
      {error && (
        <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
          ⚠ {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* ═══════════ AUTO MODE ═══════════ */}
      {mode === 'auto' && (
        <div className="commit-layout">
          <div className="card commit-form-card">
            {/* Status bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="card-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={16} style={{ color: 'var(--gold)' }} />
                Agent v5
              </h3>
              <span style={{
                padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                fontSize: 10, fontWeight: 700, letterSpacing: 1,
                background: phase !== 'idle' ? `${phaseColor[phase]}22` : 'var(--bg-elevated)',
                color: phaseColor[phase],
                border: `1px solid ${phaseColor[phase]}44`,
              }}>
                {phase !== 'idle' && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: phaseColor[phase], marginRight: 6, animation: phase === 'monitoring' ? 'pulse 1.5s infinite' : 'none' }} />}
                {phaseLabel[phase]}
              </span>
            </div>

            {/* Agent selector */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Active Agent</label>
              <select className="input-field" value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} disabled={phase !== 'idle'}>
                {myAgents.length === 0 ? (
                  <option value="">No agents — register one first</option>
                ) : (
                  myAgents.map(a => <option key={a.id} value={a.id}>{a.name} — {a.strategy.split('(')[0].trim()}</option>)
                )}
              </select>
            </div>

            {/* Dashboard stats */}
            {phase !== 'idle' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', textAlign: 'center' }}>
                  <div className="text-tertiary" style={{ fontSize: 9, textTransform: 'uppercase' }}>Scans</div>
                  <div className="font-data text-cyan" style={{ fontSize: 16 }}>{scanCount}</div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', textAlign: 'center' }}>
                  <div className="text-tertiary" style={{ fontSize: 9, textTransform: 'uppercase' }}>Pools</div>
                  <div className="font-data" style={{ fontSize: 16 }}>{poolsScanned}</div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', textAlign: 'center' }}>
                  <div className="text-tertiary" style={{ fontSize: 9, textTransform: 'uppercase' }}>Last Scan</div>
                  <div className="font-data" style={{ fontSize: 12, marginTop: 2 }}>{lastScanTime || '—'}</div>
                </div>
              </div>
            )}

            {/* ─── OPPORTUNITY CARD ─── */}
            <AnimatePresence>
              {phase === 'opportunity' && opportunity && (
                <motion.div
                  key="opp"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  style={{
                    background: 'linear-gradient(145deg, rgba(255,184,0,0.08), rgba(0,255,136,0.05))',
                    border: '1px solid rgba(255,184,0,0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
                      <TrendingUp size={14} style={{ marginRight: 4 }} /> Opportunity Found
                    </span>
                    <span className="font-data text-green" style={{ fontSize: 16, fontWeight: 700 }}>
                      {opportunity.pool.apy.toFixed(2)}% APY
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div>
                      <div className="text-tertiary" style={{ fontSize: 10 }}>POOL</div>
                      <div className="font-data" style={{ fontSize: 13 }}>{opportunity.pool.symbol}</div>
                    </div>
                    <div>
                      <div className="text-tertiary" style={{ fontSize: 10 }}>PROTOCOL</div>
                      <div className="font-data" style={{ fontSize: 13 }}>{opportunity.protocol}</div>
                    </div>
                    <div>
                      <div className="text-tertiary" style={{ fontSize: 10 }}>ACTION</div>
                      <div className="font-data text-gold" style={{ fontSize: 13 }}>{opportunity.action}</div>
                    </div>
                    <div>
                      <div className="text-tertiary" style={{ fontSize: 10 }}>AMOUNT</div>
                      <div className="font-data" style={{ fontSize: 13 }}>${opportunity.amount} USDT</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Shield size={12} style={{ color: opportunity.riskLevel === 'Low' ? 'var(--green)' : opportunity.riskLevel === 'Medium' ? 'var(--amber)' : 'var(--red)' }} />
                    <span className="text-secondary" style={{ fontSize: 11 }}>
                      {opportunity.reason}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={executeOpportunity}
                      style={{
                        flex: 1, padding: '12px', fontSize: 13, fontWeight: 700,
                        background: 'var(--gold)', color: 'var(--bg-primary)',
                        border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <CheckCircle size={14} /> Approve & Execute
                    </button>
                    <button
                      onClick={skipOpportunity}
                      style={{
                        padding: '12px 16px', fontSize: 13, background: 'transparent',
                        color: 'var(--text-secondary)', border: '1px solid var(--bg-border)',
                        borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      }}
                    >
                      Skip
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Execution progress */}
            {(phase === 'executing' || phase === 'waiting-reveal' || phase === 'revealing') && (
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16, textAlign: 'center' }}>
                <div className="spin" style={{ display: 'inline-block', marginBottom: 8 }}>
                  <Clock size={24} style={{ color: 'var(--amber)' }} />
                </div>
                <div className="font-data" style={{ fontSize: 13, marginBottom: 4 }}>
                  {phase === 'executing' ? 'Submitting commit...' :
                   phase === 'waiting-reveal' ? `Waiting for reveal window (${blocksRemaining} blocks)...` :
                   'Revealing action...'}
                </div>
                {phase === 'waiting-reveal' && (
                  <div className="progress-bar" style={{ marginTop: 8 }}>
                    <div className="progress-bar-fill" style={{ width: `${canRevealNow ? 100 : Math.max(0, ((5 - blocksRemaining) / 5) * 100)}%` }} />
                  </div>
                )}
              </div>
            )}

            {/* Cooldown */}
            {phase === 'cooldown' && (
              <div style={{ background: 'rgba(0,255,136,0.06)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16, textAlign: 'center', border: '1px solid rgba(0,255,136,0.2)' }}>
                <CheckCircle size={24} style={{ color: 'var(--green)', marginBottom: 8 }} />
                <div className="text-green font-data" style={{ fontSize: 14, marginBottom: 4 }}>Transaction Complete!</div>
                <div className="text-secondary" style={{ fontSize: 12 }}>
                  Next scan in {cooldownSeconds}s — no MetaMask popups during cooldown.
                </div>
              </div>
            )}

            {/* Start / Stop button */}
            {phase === 'idle' ? (
              <button
                onClick={startMonitoring}
                disabled={myAgents.length === 0 || !contractsLive}
                style={{
                  width: '100%', padding: '14px 20px', fontSize: 14, fontWeight: 700,
                  border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'var(--gold)', color: 'var(--bg-primary)',
                }}
              >
                <Play size={16} /> Start Monitoring
              </button>
            ) : (
              <button
                onClick={stopMonitoring}
                style={{
                  width: '100%', padding: '12px 20px', fontSize: 13, fontWeight: 600,
                  border: '1px solid rgba(255,68,68,0.3)', borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'rgba(255,68,68,0.08)', color: 'var(--red)',
                }}
              >
                <Square size={14} /> Stop Agent
              </button>
            )}

            <p className="text-tertiary" style={{ fontSize: 11, textAlign: 'center', marginTop: 8 }}>
              {phase === 'idle'
                ? 'Agent silently monitors markets. MetaMask only appears when YOU approve an opportunity.'
                : phase === 'monitoring'
                ? 'Scanning pools every 30 seconds. No MetaMask popups.'
                : phase === 'opportunity'
                ? 'Review the opportunity above. Click Approve to execute or Skip to continue monitoring.'
                : phase === 'cooldown'
                ? 'Resting after a successful transaction. Will resume soon.'
                : 'Processing transaction...'}
            </p>
          </div>

          {/* Live Log */}
          <div className="card">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Agent Live Log
              {phase !== 'idle' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />}
            </h3>
            <div style={{ maxHeight: 380, overflowY: 'auto', padding: '4px 0' }}>
              {logs.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <Eye size={28} strokeWidth={1} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
                  <p className="text-tertiary" style={{ fontSize: 13 }}>Agent is idle.</p>
                  <p className="text-tertiary" style={{ fontSize: 11 }}>Click "Start Monitoring" to begin.</p>
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} style={{
                    padding: '5px 10px', fontSize: 11, display: 'flex', gap: 8,
                    borderBottom: '1px solid var(--bg-border)',
                    fontFamily: 'var(--font-data)',
                  }}>
                    <span className="text-tertiary" style={{ flexShrink: 0, fontSize: 10, minWidth: 70 }}>{log.time}</span>
                    <span style={{ flexShrink: 0, width: 18, textAlign: 'center' }}>{log.emoji}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{log.msg}</span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MANUAL MODE ═══════════ */}
      {mode === 'manual' && (
        <div className="commit-layout">
          <div className="card commit-form-card">
            <h3 className="card-title">Manual Override</h3>
            <div className="commit-steps">
              <div className="commit-step-indicator">
                {[1, 2, 3, 4].map(s => <div key={s} className={`step-dot ${manualStep >= s ? 'step-dot-active' : ''}`}>{s}</div>)}
              </div>
            </div>

            {manualStep === 1 && (
              <div className="commit-step-content">
                <h4>Step 1 — Build Action</h4>
                <div className="form-group">
                  <label className="form-label">Select Agent</label>
                  <select className="input-field" value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)}>
                    {myAgents.length === 0 ? <option value="">No agents</option> :
                      myAgents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.id.slice(0, 6)}...{a.id.slice(-4)})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Protocol</label>
                  <select className="input-field" value={manualProtocol} onChange={(e) => setManualProtocol(e.target.value)}>
                    {['Venus', 'Radiant', 'Kinza', 'Aave'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Action Type</label>
                  <div className="action-type-row">
                    {['DEPOSIT', 'WITHDRAW', 'BORROW', 'REPAY'].map(a => (
                      <button key={a} className={`btn-ghost ${manualAction === a ? 'btn-ghost-active' : ''}`}
                        style={{ padding: '6px 14px', fontSize: 11, background: manualAction === a ? 'var(--gold)' : undefined, color: manualAction === a ? 'var(--bg-primary)' : undefined }}
                        onClick={() => setManualAction(a)}>{a}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (USDT)</label>
                  <input type="number" className="input-field" value={manualAmount} onChange={(e) => setManualAmount(Number(e.target.value))} />
                </div>
                <button className="btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setManualStep(2)} disabled={myAgents.length === 0}>Preview</button>
              </div>
            )}
            {manualStep === 2 && (
              <div className="commit-step-content">
                <h4>Step 2 — Confirm</h4>
                <div className="preview-block card-glow" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span className="text-tertiary" style={{ fontSize: 12 }}>Action</span><span className="font-data text-gold" style={{ fontSize: 12 }}>{manualAction} → {manualProtocol}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-tertiary" style={{ fontSize: 12 }}>Amount</span><span className="font-data" style={{ fontSize: 12 }}>{manualAmount} USDT</span></div>
                </div>
                <button className="btn-primary btn-lg" style={{ width: '100%', marginTop: 16 }} onClick={handleManualCommit} disabled={committing}>{committing ? 'Submitting...' : 'Submit Commit'}</button>
                <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setManualStep(1)}>Back</button>
              </div>
            )}
            {manualStep === 3 && (
              <div className="commit-step-content">
                <h4>Step 3 — Reveal</h4>
                {pendingCommit && <a href={getExplorerUrl(pendingCommit.txHash, 'tx')} target="_blank" rel="noopener noreferrer" className="font-data text-cyan" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>TX: {pendingCommit.txHash.slice(0, 12)}... <ExternalLink size={10} /></a>}
                <div className="progress-bar" style={{ marginBottom: 12 }}><div className="progress-bar-fill" style={{ width: `${canRevealNow ? 100 : Math.max(0, ((5 - blocksRemaining) / 5) * 100)}%` }} /></div>
                <button className="btn-primary btn-lg" style={{ width: '100%' }} onClick={handleManualReveal} disabled={!canRevealNow || revealing}>{revealing ? 'Revealing...' : canRevealNow ? 'Submit Reveal' : `Waiting (${blocksRemaining} blocks)...`}</button>
              </div>
            )}
            {manualStep === 4 && (
              <div className="commit-step-content">
                <h4>Done!</h4>
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <CheckCircle size={40} style={{ color: 'var(--green)' }} />
                  <h3 className="text-green" style={{ marginTop: 8 }}>Action Executed</h3>
                  {revealTxHash && <a href={getExplorerUrl(revealTxHash, 'tx')} target="_blank" rel="noopener noreferrer" className="font-data text-cyan" style={{ fontSize: 11 }}>View on BscScan <ExternalLink size={10} /></a>}
                </div>
                <button className="btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={resetManual}>Submit Another</button>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="card-title">Pipeline</h3>
            {pendingCommit && manualStep === 3 ? (
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span className="text-tertiary" style={{ fontSize: 12 }}>Action</span><span className="font-data text-gold" style={{ fontSize: 12 }}>{pendingCommit.action} → {pendingCommit.protocol}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span className="text-tertiary" style={{ fontSize: 12 }}>Amount</span><span className="font-data" style={{ fontSize: 12 }}>{pendingCommit.amount} USDT</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-tertiary" style={{ fontSize: 12 }}>Status</span><span className="badge badge-commit" style={{ fontSize: 11 }}>{canRevealNow ? '◉ READY' : '⟳ WAITING'}</span></div>
              </div>
            ) : (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <GitBranch size={32} strokeWidth={1} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
                <p className="text-tertiary" style={{ fontSize: 13 }}>No active actions.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
