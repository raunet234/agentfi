import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Bot } from 'lucide-react';

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button
        className="btn-ghost"
        onClick={() => navigate('/dashboard/agents')}
        style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <ArrowLeft size={14} /> Back to Agents
      </button>

      <div className="empty-state-card card">
        <Bot size={40} strokeWidth={1} />
        <h3 style={{ marginTop: 12 }}>Agent Not Found</h3>
        <p className="text-secondary" style={{ fontSize: 13, maxWidth: 360, textAlign: 'center' }}>
          Agent <code className="font-data">{id}</code> does not exist onchain or is not registered to your wallet.
        </p>
        <button className="btn-primary" onClick={() => navigate('/register')} style={{ marginTop: 16 }}>
          Register a New Agent
        </button>
      </div>
    </motion.div>
  );
}
