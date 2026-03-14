import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWalletStore } from '../stores/stores';
import WalletModal from './WalletModal';
import './Navbar.css';

export default function Navbar() {
  const { connected, displayAddress } = useWalletStore();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo">
            <span className="logo-icon">■</span>
            <span className="logo-text">AgentFi</span>
          </Link>

          <div className="navbar-links">
            {isLanding ? (
              <>
                <a href="#how">How it Works</a>
                <a href="#feed">Live Feed</a>
                <a href="#protocols">Protocols</a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
              </>
            ) : (
              <>
                <Link to="/">Home</Link>
                <Link to="/dashboard">Dashboard</Link>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
              </>
            )}
          </div>

          <div className="navbar-actions">
            <span className="chain-pill font-data">BNB Chain</span>
            {connected ? (
              <Link to="/dashboard" className="btn-ghost navbar-connected-btn">
                <span className="live-dot" />
                {displayAddress}
              </Link>
            ) : (
              <button
                className="btn-primary navbar-wallet-btn"
                onClick={() => setWalletModalOpen(true)}
              >
                CONNECT WALLET
              </button>
            )}
          </div>
        </div>
      </nav>

      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        redirectToDashboard={true}
      />
    </>
  );
}
