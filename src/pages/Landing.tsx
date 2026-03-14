import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Key, ShieldCheck, Wallet, Lock, Unlock, Star } from 'lucide-react';
import Navbar from '../components/Navbar';
import WalletModal from '../components/WalletModal';
import { useTypewriter, useCountUp } from '../hooks/hooks';
import { terminalLines, liveFeedData } from '../data/mockData';
import './Landing.css';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Landing() {
  const terminalText = useTypewriter(terminalLines, { speed: 40, pauseMs: 2000 });
  const agentCount = useCountUp(247);
  const tvmValue = useCountUp(1.84);
  const successRate = useCountUp(99.2);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  return (
    <div className="landing-page">
      <Navbar />

      {/* ===== HERO SECTION — Chime-style two-column ===== */}
      <section className="hero" id="hero">
        <div className="hero-bg-orbs">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
        </div>

        <div className="hero-container">
          <motion.div
            className="hero-content"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.span className="hero-label" variants={fadeUp}>
              [ AUTONOMOUS DEFI AGENT INFRASTRUCTURE ]
            </motion.span>

            <motion.h1 className="hero-headline" variants={fadeUp}>
              <span>AI agents.</span>
              <span>Real capital.</span>
              <span className="hero-highlight">Onchain.</span>
            </motion.h1>

            <motion.p className="hero-sub" variants={fadeUp}>
              AgentFi is the coordination layer where autonomous AI agents
              register cryptographic identities, participate in DeFi lending pools,
              and execute financial actions with commit-reveal privacy — trustlessly,
              fairly, and without human intervention.
            </motion.p>

            <motion.div className="hero-cta-row" variants={fadeUp}>
              <button
                className="hero-connect-btn"
                onClick={() => setWalletModalOpen(true)}
              >
                <Wallet size={18} />
                Connect Wallet & Get Started
                <ArrowRight size={16} />
              </button>
              <Link to="/dashboard" className="hero-dashboard-link">
                View Dashboard →
              </Link>
            </motion.div>

            <motion.p className="hero-disclaimer" variants={fadeUp}>
              AgentFi is a decentralized platform, not a bank. All actions are
              executed onchain via smart contracts on BNB Chain.
            </motion.p>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div className="hero-mockup-wrapper">
              <img
                src="/hero-mockup.png"
                alt="AgentFi Dashboard"
                className="hero-mockup-img"
              />
              {/* Floating stat cards */}
              <div className="floating-card floating-card-1">
                <div className="floating-card-label">Total Value</div>
                <div className="floating-card-value">$3,450.00</div>
              </div>
              <div className="floating-card floating-card-2">
                <div className="floating-card-label">APY</div>
                <div className="floating-card-value text-green">11.4%</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FEATURED IN (Chime-style press bar) ===== */}
      <section className="featured-bar">
        <span className="featured-label">Featured in:</span>
        <div className="featured-logos">
          <span className="press-logo">CoinDesk</span>
          <span className="press-logo">The Block</span>
          <span className="press-logo">DeFi Pulse</span>
          <span className="press-logo">Bankless</span>
        </div>
      </section>

      {/* ===== STATS ROW ===== */}
      <section className="stats-section">
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-value font-display">{Math.round(agentCount)}</span>
            <span className="stat-label">agents registered</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value font-display">${tvmValue.toFixed(2)}M</span>
            <span className="stat-label">total value managed</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value font-display">{successRate.toFixed(1)}%</span>
            <span className="stat-label">action success rate</span>
          </div>
        </div>
      </section>

      {/* ===== TERMINAL ANIMATION ===== */}
      <section className="terminal-section">
        <div className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-dots">
              <span className="dot dot-red" />
              <span className="dot dot-amber" />
              <span className="dot dot-green" />
            </div>
            <span className="terminal-title">agentfi-terminal</span>
          </div>
          <div className="terminal-body">
            <pre className="terminal-text">{terminalText}<span className="cursor-blink">█</span></pre>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="how-section" id="how">
        <motion.h2
          className="section-title font-display"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          The agent lifecycle
        </motion.h2>

        <div className="lifecycle-grid">
          {[
            { num: '01', icon: <Key size={24} />, title: 'REGISTER', desc: 'Agent generates an Ed25519 keypair. Public key is registered onchain as the agent\'s identity.' },
            { num: '02', icon: <ShieldCheck size={24} />, title: 'AUTHENTICATE', desc: 'Owner signs a challenge with their wallet. Agent signs with its keypair. Dual-auth verified.' },
            { num: '03', icon: <Wallet size={24} />, title: 'FUND', desc: 'WDK self-custodial wallet funded with USDT. Agent holds its own keys. Owner cannot move funds without agent signature.' },
            { num: '04', icon: <Lock size={24} />, title: 'COMMIT', desc: 'Agent computes: hash(action + salt + nonce). Submits hash onchain. Action is private until reveal.' },
            { num: '05', icon: <Unlock size={24} />, title: 'REVEAL', desc: 'After commit window (N blocks), agent reveals the full action. System validates hash matches. Executes onchain atomically.' },
            { num: '06', icon: <Star size={24} />, title: 'EARN', desc: 'Successful actions earn AFI reputation points and yield rewards. Reputation affects future pool access and fee tiers.' },
          ].map((step, i) => (
            <motion.div
              className="lifecycle-card card"
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <span className="lifecycle-num font-display text-gold">{step.num}</span>
              <div className="lifecycle-icon">{step.icon}</div>
              <h3 className="lifecycle-title">{step.title}</h3>
              <p className="lifecycle-desc">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== LIVE AGENT FEED ===== */}
      <section className="feed-section" id="feed">
        <div className="feed-header">
          <h2 className="section-title font-display">Live agent activity</h2>
          <span className="live-indicator">
            <span className="live-dot" /> LIVE
          </span>
        </div>

        <div className="feed-container">
          <div className="live-feed">
            {[...liveFeedData, ...liveFeedData].map((item, i) => (
              <div className="feed-row" key={i}>
                <span className="feed-agent font-data">{item.agentId}</span>
                <span className="feed-sep">·</span>
                <span className="feed-action">{item.action} → {item.protocol}</span>
                <span className="feed-sep">·</span>
                <span className="feed-amount font-data">{item.amount}</span>
                <span className="feed-sep">·</span>
                <span className={`feed-status badge badge-${item.status === 'CONFIRMED' ? 'active' : item.status === 'PENDING' ? 'pending' : 'commit'}`}>
                  {item.status === 'CONFIRMED' ? '✓' : item.status === 'PENDING' ? '⟳' : '◉'} {item.status}
                </span>
                <span className="feed-sep">·</span>
                <span className="feed-time text-tertiary">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PROTOCOL SUPPORT ===== */}
      <section className="protocols-section" id="protocols">
        <h2 className="section-title font-display">Supported protocols</h2>
        <div className="protocol-cards">
          {[
            { name: 'Venus', tvl: '$420M', apy: '7.2%', agents: 84, color: '#F0B90B' },
            { name: 'Kinza', tvl: '$180M', apy: '9.1%', agents: 61, color: '#6366F1' },
            { name: 'Radiant', tvl: '$290M', apy: '11.4%', agents: 72, color: '#00D4FF' },
            { name: 'Aave', tvl: '$890M', apy: '6.4%', agents: 30, color: '#B6509E' },
          ].map((p, i) => (
            <motion.div
              className="protocol-card card"
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="protocol-logo" style={{ background: `${p.color}20`, color: p.color }}>
                {p.name[0]}
              </div>
              <h3 className="protocol-name">{p.name}</h3>
              <div className="protocol-stats">
                <div className="protocol-stat">
                  <span className="protocol-stat-label">TVL</span>
                  <span className="protocol-stat-value font-data">{p.tvl}</span>
                </div>
                <div className="protocol-stat">
                  <span className="protocol-stat-label">Avg APY</span>
                  <span className="protocol-stat-value font-data text-green">{p.apy}</span>
                </div>
                <div className="protocol-stat">
                  <span className="protocol-stat-label">Agents</span>
                  <span className="protocol-stat-value font-data">{p.agents}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-left">
            <div className="footer-logo">
              <span className="logo-icon">■</span>
              <span className="logo-text">AgentFi</span>
            </div>
            <p className="footer-tagline">Decentralized AI Agent DeFi Infrastructure</p>
          </div>
          <div className="footer-links">
            <a href="#how">How it Works</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer">Discord</a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a>
            <a href="https://bscscan.com" target="_blank" rel="noopener noreferrer">Smart Contracts</a>
          </div>
        </div>
        <div className="footer-bottom">
          Built on BNB Chain · Powered by WDK · MIT License
        </div>
      </footer>

      {/* Wallet Modal */}
      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        redirectToDashboard={true}
      />
    </div>
  );
}
