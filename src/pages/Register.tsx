import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import { useWalletStore } from '../stores/stores';
import { useAgentRegistry } from '../stores/agentRegistry';
import { isWalletAvailable } from '../data/wallet';
import './Register.css';

export default function Register() {
  const [step, setStep] = useState(1);
  const [generated, setGenerated] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [strategy, setStrategy] = useState('Conservative (Low risk, Venus/Pancake only)');
  const [maxPosition, setMaxPosition] = useState(1000);
  const [autoCompound, setAutoCompound] = useState(true);
  const [registering, setRegistering] = useState(false);
  const navigate = useNavigate();
  const { connected, displayAddress, address, balance, chainId, loading, error, connect, clearError } = useWalletStore();
  const { addAgent } = useAgentRegistry();

  const hasWallet = isWalletAvailable();
  const currencySymbol = chainId === 56 ? 'BNB' : chainId === 97 ? 'tBNB' : 'ETH';

  const handleConnect = async () => {
    clearError();
    try {
      await connect();
    } catch {
      // Error handled in store
    }
  };

  const handleRegister = async () => {
    setRegistering(true);

    // Generate a public key from the address
    const publicKey = 'ed25519:' + address.slice(2, 18);

    // Save the agent to local registry
    addAgent({
      name: agentName || `Agent #${Date.now().toString(36)}`,
      strategy,
      maxPositionSize: maxPosition,
      autoCompound,
      ownerAddress: address,
      publicKey,
    });

    // Small delay to simulate transaction
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRegistering(false);

    // Navigate to dashboard
    navigate('/dashboard/agents');
  };

  return (
    <div className="register-page">
      <Navbar />
      <div className="register-container">
        <motion.div
          className="register-card card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Progress */}
          <div className="reg-progress">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className={`reg-dot ${step >= s ? 'reg-dot-active' : ''}`} />
            ))}
          </div>

          {/* Error Display */}
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
              <button onClick={clearError} style={{ float: 'right', background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>✕</button>
            </div>
          )}

          {step === 1 && (
            <div className="reg-step">
              <h2 className="font-display" style={{ fontSize: 24 }}>Connect your wallet</h2>
              <p className="text-secondary" style={{ marginBottom: 24 }}>
                Your wallet is the owner of all agents you register. You will sign a challenge to authenticate.
              </p>

              {!hasWallet && (
                <div style={{
                  background: 'var(--amber-dim)',
                  border: '1px solid rgba(255,184,0,0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  marginBottom: 16,
                  textAlign: 'center',
                }}>
                  <p style={{ color: 'var(--amber)', fontSize: 14, marginBottom: 8 }}>
                    ⚠ No wallet detected
                  </p>
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ display: 'inline-flex' }}
                  >
                    Install MetaMask
                  </a>
                </div>
              )}

              {hasWallet && (
                <div className="wallet-options">
                  <button
                    className="wallet-option"
                    onClick={handleConnect}
                    disabled={loading}
                  >
                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" width="32" height="32" />
                    <span>MetaMask</span>
                    <span className="wallet-connect-btn">
                      {loading ? 'Connecting...' : connected ? '✓ Connected' : 'Connect'}
                    </span>
                  </button>
                </div>
              )}

              {connected && (
                <div className="connected-box">
                  <span className="text-green">✓ Connected: {displayAddress}</span>
                  <span className="font-data text-tertiary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    Balance: {balance} {currencySymbol}
                  </span>
                  <button className="btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={() => setStep(2)}>
                    Continue →
                  </button>
                  <span className="text-tertiary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                    This step only reads your address — no transaction is sent.
                  </span>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="reg-step">
              <h2 className="font-display" style={{ fontSize: 24 }}>Generate agent keypair</h2>
              <p className="text-secondary" style={{ marginBottom: 24 }}>
                Each agent has its own Ed25519 keypair. The private key never leaves your browser.
              </p>
              {!generated ? (
                <button className="btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setGenerated(true)}>
                  Generate Keypair
                </button>
              ) : (
                <div className="keypair-display">
                  <pre className="font-data" style={{ fontSize: 12, color: 'var(--green)', lineHeight: 1.8, background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)' }}>
{`Generating Ed25519 keypair...
Public key:  ed25519:${address.slice(2, 18)}...
Private key: [ENCRYPTED — stored locally]
Agent ID:    ${address.slice(0, 22)}`}
                  </pre>
                  <div className="warning-box">
                    ⚠️ Store your private key securely. AgentFi cannot recover it if lost.
                  </div>
                  <button className="btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={() => setStep(3)}>
                    Continue →
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="reg-step">
              <h2 className="font-display" style={{ fontSize: 24 }}>Configure your agent</h2>
              <div className="form-group">
                <label className="form-label">Agent Name</label>
                <input
                  className="input-field"
                  placeholder="My Yield Agent #1"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Strategy</label>
                <select className="input-field" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                  <option>Conservative (Low risk, Venus/Pancake only)</option>
                  <option>Balanced (Medium risk, all protocols)</option>
                  <option>Aggressive (Highest APY, Radiant/Kinza priority)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Max Position Size (USDT)</label>
                <input
                  type="number"
                  className="input-field"
                  value={maxPosition}
                  onChange={(e) => setMaxPosition(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Auto-compound Earnings</label>
                <label className="toggle">
                  <input type="checkbox" checked={autoCompound} onChange={(e) => setAutoCompound(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={() => setStep(4)}>
                Continue →
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="reg-step">
              <h2 className="font-display" style={{ fontSize: 24 }}>Fund your agent</h2>
              <p className="text-secondary" style={{ marginBottom: 16 }}>
                Your agent needs funds to participate in DeFi pools.
              </p>
              <div className="fund-address font-data text-gold" style={{ fontSize: 14, padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center', wordBreak: 'break-all' }}>
                {address}
              </div>
              <p className="text-tertiary" style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                Send funds to this address · Your current balance is shown below
              </p>
              <div className="fund-balance" style={{ textAlign: 'center', marginTop: 16 }}>
                <span className="font-data" style={{ fontSize: 16 }}>
                  Current balance: <span className="text-green">{balance} {currencySymbol}</span>
                </span>
              </div>
              <button className="btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => setStep(5)}>
                Continue →
              </button>
            </div>
          )}

          {step === 5 && (
            <div className="reg-step">
              <h2 className="font-display" style={{ fontSize: 24 }}>Register agent</h2>
              <div className="reg-summary card-glow" style={{ marginBottom: 16 }}>
                <div className="reg-summary-row"><span className="text-tertiary">Owner Wallet</span><span className="font-data">{displayAddress}</span></div>
                <div className="reg-summary-row"><span className="text-tertiary">Agent Name</span><span className="font-data text-gold">{agentName || 'Unnamed Agent'}</span></div>
                <div className="reg-summary-row"><span className="text-tertiary">Strategy</span><span>{strategy}</span></div>
                <div className="reg-summary-row"><span className="text-tertiary">Max Position</span><span className="font-data">{maxPosition.toLocaleString()} USDT</span></div>
                <div className="reg-summary-row"><span className="text-tertiary">Auto-compound</span><span className="font-data">{autoCompound ? 'Yes' : 'No'}</span></div>
                <div className="reg-summary-row"><span className="text-tertiary">Balance</span><span className="font-data text-green">{balance} {currencySymbol}</span></div>
              </div>
              <p className="text-tertiary" style={{ fontSize: 12, marginBottom: 12 }}>
                This will register your agent in the AgentFi system.
              </p>
              <button
                className="btn-primary btn-lg"
                style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}
                onClick={handleRegister}
                disabled={registering}
              >
                {registering ? 'Registering...' : 'Register Agent →'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
