import { motion } from 'framer-motion';
import { useWalletStore } from '../stores/stores';
import { Wallet, Waves } from 'lucide-react';
import './Pools.css';

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function Pools() {
  const { connected } = useWalletStore();

  if (!connected) {
    return (
      <motion.div className="pools-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="page-title font-display">DeFi Pools</h1>
        <p className="text-secondary" style={{ marginBottom: 24 }}>
          Browse and interact with supported lending and yield protocols on BNB Chain.
        </p>
        <div className="empty-state-card card">
          <Wallet size={40} strokeWidth={1} />
          <h3 style={{ marginTop: 12 }}>Connect your wallet</h3>
          <p className="text-secondary" style={{ fontSize: 13, maxWidth: 360, textAlign: 'center' }}>
            Connect your wallet to browse available DeFi pools and protocols.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="pools-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="page-title font-display">DeFi Pools</h1>
      <p className="text-secondary" style={{ marginBottom: 24 }}>
        Browse and interact with supported lending and yield protocols on BNB Chain.
      </p>

      <motion.div className="empty-state-card card" variants={fadeUp} initial="hidden" animate="visible">
        <Waves size={40} strokeWidth={1} />
        <h3 style={{ marginTop: 12 }}>No Pools Available Yet</h3>
        <p className="text-secondary" style={{ fontSize: 13, maxWidth: 400, textAlign: 'center' }}>
          DeFi pool integrations are being deployed. Once smart contracts are live on BNB Chain, you'll be able to browse pools from Radiant, Venus, Kinza, and Aave directly from here.
        </p>
      </motion.div>
    </motion.div>
  );
}
