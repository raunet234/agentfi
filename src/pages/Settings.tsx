import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWalletStore } from '../stores/stores';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

export default function SettingsPage() {
  const { address, displayAddress, chainId, balance, connected, disconnect, switchChain } = useWalletStore();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  const chainLabel = chainId === 56 ? 'BNB Smart Chain (Mainnet)' : chainId === 97 ? 'BNB Smart Chain (Testnet)' : `Chain ID: ${chainId}`;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  return (
    <motion.div className="settings-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="page-title font-display">Settings</h1>

      {/* Wallet Section */}
      <div className="card settings-section">
        <h3 className="card-title">Wallet Connection</h3>
        {connected ? (
          <div className="settings-wallet-info">
            <div className="settings-wallet-row">
              <span className="settings-label">Address</span>
              <span className="font-data" style={{ fontSize: 13 }}>{address}</span>
            </div>
            <div className="settings-wallet-row">
              <span className="settings-label">Display</span>
              <span className="font-data text-gold">{displayAddress}</span>
            </div>
            <div className="settings-wallet-row">
              <span className="settings-label">Network</span>
              <span className="font-data">{chainLabel}</span>
            </div>
            <div className="settings-wallet-row">
              <span className="settings-label">Balance</span>
              <span className="font-data text-green">{balance} {chainId === 56 ? 'BNB' : chainId === 97 ? 'tBNB' : 'ETH'}</span>
            </div>
            <div className="settings-actions" style={{ marginTop: 16 }}>
              <button className="btn-ghost" onClick={switchChain}>
                Switch to BNB Chain
              </button>
              <button className="btn-ghost" onClick={handleDisconnect} style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
                Disconnect Wallet
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <p className="text-secondary" style={{ marginBottom: 12 }}>No wallet connected</p>
            <button className="btn-primary" onClick={() => navigate('/auth')}>
              Connect Wallet
            </button>
          </div>
        )}
      </div>

      {/* Preferences Section */}
      <div className="card settings-section">
        <h3 className="card-title">Preferences</h3>
        <div className="settings-form">
          <div className="form-group">
            <label className="form-label">Default Strategy</label>
            <select className="input-field">
              <option value="conservative">Conservative (Low risk)</option>
              <option value="balanced" selected>Balanced (Medium risk)</option>
              <option value="aggressive">Aggressive (High risk)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Default Max Position Size (USDT)</label>
            <input type="number" className="input-field" defaultValue={1000} />
          </div>
          <div className="form-group">
            <label className="form-label">Auto-compound Earnings</label>
            <label className="toggle">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="form-group">
            <label className="form-label">Email Notifications</label>
            <label className="toggle">
              <input type="checkbox" />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="form-group">
            <label className="form-label">Slippage Tolerance (%)</label>
            <div className="slippage-options">
              {['0.1', '0.5', '1.0', '3.0'].map((v) => (
                <button key={v} className="btn-ghost slippage-btn">{v}%</button>
              ))}
              <input type="number" className="input-field" placeholder="Custom" style={{ maxWidth: 100 }} />
            </div>
          </div>
          <button className="btn-primary" onClick={handleSave} style={{ marginTop: 8 }}>
            {saved ? '✓ Saved!' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="card settings-section">
        <h3 className="card-title">Notification Channels</h3>
        <div className="settings-form">
          <div className="form-group">
            <label className="form-label">Telegram Bot Token</label>
            <input type="text" className="input-field" placeholder="Enter your Telegram bot token" />
          </div>
          <div className="form-group">
            <label className="form-label">Discord Webhook URL</label>
            <input type="text" className="input-field" placeholder="https://discord.com/api/webhooks/..." />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="input-field" placeholder="alerts@yourdomain.com" />
          </div>
          <button className="btn-primary" onClick={handleSave}>
            {saved ? '✓ Saved!' : 'Save Notification Settings'}
          </button>
        </div>
      </div>

      {/* Security Section */}
      <div className="card settings-section">
        <h3 className="card-title">Security</h3>
        <div className="settings-form">
          <div className="form-group">
            <label className="form-label">Transaction Confirmation</label>
            <p className="text-tertiary" style={{ fontSize: 12, marginBottom: 8 }}>
              Require manual confirmation for all onchain transactions.
            </p>
            <label className="toggle">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="form-group">
            <label className="form-label">Session Timeout</label>
            <select className="input-field">
              <option>15 minutes</option>
              <option selected>1 hour</option>
              <option>4 hours</option>
              <option>24 hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card settings-section settings-danger">
        <h3 className="card-title" style={{ color: 'var(--red)' }}>Danger Zone</h3>
        <p className="text-secondary" style={{ fontSize: 13, marginBottom: 16 }}>
          These actions are irreversible. Proceed with caution.
        </p>
        <div className="danger-actions">
          <button className="btn-ghost" style={{ borderColor: 'var(--amber)', color: 'var(--amber)' }}>
            Emergency Pause All Agents
          </button>
          <button className="btn-ghost" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
            Deregister All Agents
          </button>
        </div>
      </div>
    </motion.div>
  );
}
