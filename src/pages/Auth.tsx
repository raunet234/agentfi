import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import { useWalletStore } from '../stores/stores';
import { isWalletAvailable } from '../data/wallet';
import './Auth.css';

export default function Auth() {
  const [authStep, setAuthStep] = useState(1);
  const navigate = useNavigate();
  const {
    displayAddress,
    chainId,
    balance,
    connected,
    loading,
    error,
    connect,
    authenticate,
    switchChain,
    clearError,
  } = useWalletStore();

  const hasWallet = isWalletAvailable();

  const handleConnect = async () => {
    clearError();
    try {
      await connect();
      setAuthStep(2);
    } catch {
      // Error is set in store
    }
  };

  const handleSign = async () => {
    clearError();
    try {
      await authenticate();
      setAuthStep(3);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch {
      // Error is set in store
    }
  };

  const isWrongChain = connected && chainId !== 97 && chainId !== 56;

  return (
    <div className="auth-page">
      <Navbar />
      <div className="auth-container">
        <motion.div
          className="auth-card card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-gold" style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>
            [ AUTHENTICATE ]
          </h1>
          <p className="text-secondary" style={{ textAlign: 'center', marginBottom: 32 }}>
            Sign a challenge with your wallet to access your agents' dashboard.
          </p>

          {/* Error Display */}
          {error && (
            <div className="auth-error" style={{
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

          {/* Step 1: Connect Wallet */}
          {authStep === 1 && (
            <div className="auth-step">
              <p className="text-tertiary" style={{ fontSize: 13, marginBottom: 16 }}>Step 1 — Connect wallet</p>

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
                  <p className="text-secondary" style={{ fontSize: 13, marginBottom: 12 }}>
                    Please install MetaMask or another Web3 wallet to continue.
                  </p>
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ display: 'inline-flex' }}
                  >
                    Install MetaMask →
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
                      {loading ? 'Connecting...' : 'Connect'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Sign Challenge */}
          {authStep === 2 && (
            <div className="auth-step" style={{ textAlign: 'center' }}>
              <div className="connected-info">
                <p className="text-green" style={{ marginBottom: 8 }}>✓ Wallet connected</p>
                <div className="auth-wallet-detail">
                  <span className="font-data" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                    {displayAddress}
                  </span>
                  <span className="font-data text-tertiary" style={{ fontSize: 12 }}>
                    Balance: {balance} {chainId === 56 ? 'BNB' : chainId === 97 ? 'tBNB' : 'ETH'}
                  </span>
                  <span className="font-data text-tertiary" style={{ fontSize: 12 }}>
                    Chain: {chainId === 56 ? 'BNB Mainnet' : chainId === 97 ? 'BNB Testnet' : `Chain ${chainId}`}
                  </span>
                </div>
              </div>

              {isWrongChain && (
                <div style={{
                  background: 'var(--amber-dim)',
                  border: '1px solid rgba(255,184,0,0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  marginBottom: 16,
                }}>
                  <p style={{ color: 'var(--amber)', fontSize: 13, marginBottom: 8 }}>
                    ⚠ Wrong network detected (Chain {chainId})
                  </p>
                  <button
                    className="btn-primary"
                    onClick={switchChain}
                    disabled={loading}
                    style={{ width: '100%' }}
                  >
                    {loading ? 'Switching...' : 'Switch to BNB Chain'}
                  </button>
                </div>
              )}

              <div className="challenge-box font-data" style={{
                padding: 16,
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                marginBottom: 16,
                wordBreak: 'break-all',
                textAlign: 'left',
                lineHeight: 1.8,
              }}>
                AgentFi Authentication{'\n'}
                Timestamp: {Math.floor(Date.now() / 1000)}{'\n'}
                Nonce: {Math.random().toString(36).substring(2, 10)}{'\n\n'}
                Sign this message to verify ownership.{'\n'}
                This does not cost any gas.
              </div>

              <button
                className="btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={handleSign}
                disabled={loading}
              >
                {loading ? 'Waiting for signature...' : 'Sign & Authenticate'}
              </button>

              <p className="text-tertiary" style={{ fontSize: 11, marginTop: 8 }}>
                This signature is free and does not send any transaction.
              </p>
            </div>
          )}

          {/* Step 3: Verifying */}
          {authStep === 3 && (
            <div className="auth-step" style={{ textAlign: 'center' }}>
              <div className="auth-success">
                <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
                <p className="text-green" style={{ fontSize: 18, marginBottom: 8 }}>Authenticated!</p>
                <p className="font-data text-tertiary" style={{ fontSize: 12 }}>
                  {displayAddress}
                </p>
                <p className="text-secondary" style={{ marginTop: 12, fontSize: 13 }}>
                  Redirecting to dashboard...
                </p>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link to="/register" className="text-gold" style={{ fontSize: 13 }}>
              New to AgentFi? Register an agent →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
