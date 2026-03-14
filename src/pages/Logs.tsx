import { motion } from 'framer-motion';
import { useWalletStore } from '../stores/stores';
import { Wallet, FileText } from 'lucide-react';
import './Logs.css';

export default function Logs() {
  const { connected } = useWalletStore();

  if (!connected) {
    return (
      <motion.div className="logs-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="page-title font-display">Activity Log</h1>
        <div className="empty-state-card card">
          <Wallet size={40} strokeWidth={1} />
          <h3 style={{ marginTop: 12 }}>Connect your wallet</h3>
          <p className="text-secondary" style={{ fontSize: 13, maxWidth: 360, textAlign: 'center' }}>
            Connect your wallet to view your onchain activity log.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="logs-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="page-title font-display">Activity Log</h1>
      <p className="text-secondary" style={{ marginBottom: 24 }}>
        All onchain actions performed by your agents are recorded here.
      </p>

      <div className="empty-state-card card">
        <FileText size={40} strokeWidth={1} />
        <h3 style={{ marginTop: 12 }}>No Activity Yet</h3>
        <p className="text-secondary" style={{ fontSize: 13, maxWidth: 400, textAlign: 'center' }}>
          Your onchain activity log is empty. Register an agent and submit your first commit-reveal action to see entries here.
        </p>
      </div>
    </motion.div>
  );
}
