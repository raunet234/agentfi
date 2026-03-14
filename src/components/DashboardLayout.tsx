import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Bot, Waves, GitBranch, Star, FileText, Settings, LogOut, Bell, X } from 'lucide-react';
import { useWalletStore } from '../stores/stores';
import './DashboardLayout.css';

export default function DashboardLayout() {
  const { address, displayAddress, balance, chainId, connected, disconnect } = useWalletStore();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  const chainLabel = chainId === 56 ? 'BNB Mainnet' : chainId === 97 ? 'BNB Testnet' : connected ? `Chain ${chainId}` : 'Not connected';
  const currencySymbol = chainId === 56 ? 'BNB' : chainId === 97 ? 'tBNB' : 'ETH';

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <span className="logo-icon">■</span>
            <span className="logo-text">AgentFi</span>
          </div>
          {connected ? (
            <div className="sidebar-wallet">
              <span className="live-dot" />
              <span className="sidebar-wallet-addr font-data">{displayAddress}</span>
            </div>
          ) : (
            <div className="sidebar-wallet" style={{ borderColor: 'rgba(255,184,0,0.3)' }}>
              <span className="text-amber" style={{ fontSize: 12 }}>⚠ Not connected</span>
            </div>
          )}
          <span className="sidebar-agent-count text-tertiary">
            {connected ? `${chainLabel} · ${balance} ${currencySymbol}` : 'Connect wallet to continue'}
          </span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" end className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
            <LayoutDashboard size={16} />
            <span>Overview</span>
          </NavLink>
          <NavLink to="/dashboard/agents" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
            <Bot size={16} />
            <span>My Agents</span>
          </NavLink>
          <NavLink to="/dashboard/pools" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
            <Waves size={16} />
            <span>DeFi Pools</span>
          </NavLink>
          <NavLink to="/dashboard/commit" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
            <GitBranch size={16} />
            <span>Commit / Reveal</span>
          </NavLink>
          <NavLink to="/dashboard/rewards" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
            <Star size={16} />
            <span>Rewards</span>
          </NavLink>
          <NavLink to="/dashboard/logs" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
            <FileText size={16} />
            <span>Activity Log</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <NavLink to="/dashboard/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
            <Settings size={16} />
            <span>Settings</span>
          </NavLink>
          {connected && (
            <div className="sidebar-token">
              <span className="font-data text-gold">{parseFloat(balance).toFixed(4)} {currencySymbol}</span>
            </div>
          )}
          <button className="sidebar-disconnect" onClick={handleDisconnect}>
            <LogOut size={14} />
            <span>Disconnect</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <header className="top-bar">
          <span className="topbar-title font-display">Dashboard</span>
          <div className="topbar-search">
            <input className="input-field" placeholder="Search agents, transactions..." />
          </div>
          <div className="topbar-right">
            {/* Notification Bell - functional dropdown */}
            <div className="topbar-notify" onClick={() => setShowNotifs(!showNotifs)} style={{ cursor: 'pointer', position: 'relative' }}>
              <Bell size={18} />
              {showNotifs && (
                <div className="notif-dropdown">
                  <div className="notif-dropdown-header">
                    <span className="font-display" style={{ fontSize: 14 }}>Notifications</span>
                    <button onClick={(e) => { e.stopPropagation(); setShowNotifs(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  </div>
                  <div className="notif-dropdown-body">
                    {connected ? (
                      <p className="text-tertiary" style={{ fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
                        No notifications yet.<br />
                        Register an agent to start receiving updates.
                      </p>
                    ) : (
                      <p className="text-tertiary" style={{ fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
                        Connect your wallet to receive notifications.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {connected && (
              <a
                href={`https://${chainId === 97 ? 'testnet.' : ''}bscscan.com/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="topbar-block font-data text-tertiary"
                style={{ textDecoration: 'none' }}
                title="View your wallet on BscScan"
              >
                {chainLabel}
              </a>
            )}
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
