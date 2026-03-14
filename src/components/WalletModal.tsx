import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useWalletStore } from '../stores/stores';
import { isWalletAvailable } from '../data/wallet';
import './WalletModal.css';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectToDashboard?: boolean;
}

export default function WalletModal({ isOpen, onClose, redirectToDashboard = false }: WalletModalProps) {
  const navigate = useNavigate();
  const { connect, loading, error, clearError, connected, displayAddress, disconnect } = useWalletStore();
  const [connectError, setConnectError] = useState('');
  const hasMetaMask = isWalletAvailable();

  if (!isOpen) return null;

  const handleMetaMaskConnect = async () => {
    if (!hasMetaMask) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setConnectError('');
    clearError();
    try {
      await connect();
      if (redirectToDashboard) {
        setTimeout(() => {
          onClose();
          navigate('/dashboard');
        }, 800);
      } else {
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: any) {
      setConnectError(err.message || 'Connection failed');
    }
  };

  const handleCancel = () => {
    // If loading, disconnect to reset state
    if (loading) {
      disconnect();
    }
    setConnectError('');
    clearError();
    onClose();
  };

  const displayError = connectError || error;

  return (
    <div className="wallet-modal-overlay" onClick={handleCancel}>
      <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2 className="font-display" style={{ fontSize: 20 }}>Connect Wallet</h2>
          <button className="wallet-modal-close" onClick={handleCancel}>
            <X size={18} />
          </button>
        </div>

        <p className="text-secondary" style={{ fontSize: 13, marginBottom: 20 }}>
          Select a wallet to connect to AgentFi. Your wallet is used to sign transactions and prove ownership.
        </p>

        {/* Error */}
        {displayError && (
          <div className="wallet-modal-error">
            <span>&#9888; {displayError}</span>
            <button onClick={() => { clearError(); setConnectError(''); }} style={{ float: 'right', background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}>x</button>
          </div>
        )}

        {/* Success */}
        {connected && !loading && (
          <div className="wallet-modal-success">
            <span className="text-green" style={{ fontSize: 14 }}>Connected!</span>
            <span className="font-data" style={{ fontSize: 13 }}>{displayAddress}</span>
            {redirectToDashboard && (
              <span className="text-tertiary" style={{ fontSize: 12 }}>Redirecting to dashboard...</span>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="wallet-modal-loading">
            <div className="wallet-connecting-spinner-lg" />
            <p style={{ color: 'var(--gold)', fontSize: 14, marginTop: 12 }}>
              Waiting for MetaMask...
            </p>
            <p className="text-tertiary" style={{ fontSize: 12, marginTop: 4 }}>
              Please check the MetaMask popup and approve the connection.
            </p>
            <button
              className="btn-ghost"
              style={{ marginTop: 16, fontSize: 12 }}
              onClick={() => { disconnect(); setConnectError(''); }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Wallet Options */}
        {!connected && !loading && (
          <div className="wallet-modal-options">
            <button
              className="wallet-modal-option"
              onClick={handleMetaMaskConnect}
              disabled={loading}
            >
              <div className="wallet-modal-option-left">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                  alt="MetaMask"
                  width="36"
                  height="36"
                />
                <div className="wallet-modal-option-info">
                  <span className="wallet-modal-option-name">MetaMask</span>
                  <span className="wallet-modal-option-desc">
                    {hasMetaMask ? 'Detected - Click to connect' : 'Not installed - Click to install'}
                  </span>
                </div>
              </div>
              <span className="wallet-modal-option-badge">
                {hasMetaMask ? (
                  <span className="badge badge-active">Detected</span>
                ) : (
                  <span className="badge badge-pending">Install</span>
                )}
              </span>
            </button>

            <button className="wallet-modal-option wallet-modal-option-disabled" disabled>
              <div className="wallet-modal-option-left">
                <div className="wallet-icon-placeholder">
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <rect width="36" height="36" rx="8" fill="#3B99FC" />
                    <text x="18" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">W</text>
                  </svg>
                </div>
                <div className="wallet-modal-option-info">
                  <span className="wallet-modal-option-name">WalletConnect</span>
                  <span className="wallet-modal-option-desc">Coming soon</span>
                </div>
              </div>
              <span className="badge badge-idle">Soon</span>
            </button>

            <button className="wallet-modal-option wallet-modal-option-disabled" disabled>
              <div className="wallet-modal-option-left">
                <div className="wallet-icon-placeholder">
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <rect width="36" height="36" rx="8" fill="#0052FF" />
                    <text x="18" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">C</text>
                  </svg>
                </div>
                <div className="wallet-modal-option-info">
                  <span className="wallet-modal-option-name">Coinbase Wallet</span>
                  <span className="wallet-modal-option-desc">Coming soon</span>
                </div>
              </div>
              <span className="badge badge-idle">Soon</span>
            </button>
          </div>
        )}

        <div className="wallet-modal-footer">
          <p className="text-tertiary" style={{ fontSize: 11, textAlign: 'center' }}>
            By connecting, you agree to AgentFi's Terms of Service.
            <br />
            We never access your private keys or funds without your explicit approval.
          </p>
        </div>
      </div>
    </div>
  );
}
