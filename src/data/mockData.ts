import type {
  Agent,
  Protocol,
  PipelineItem,
  RecentAction,
  ReputationEntry,
  LogEntry,
  PortfolioDataPoint,
} from './types';

export const mockAgents: Agent[] = [
  {
    id: '0x7f2a4b1c9e3d8f6a2b5c8d1e4f7a0b3c',
    name: 'Yield Bot Alpha',
    publicKey: 'ed25519:7f2a4b1c9e3d8f6a...',
    walletAddress: '0xa1b2c3d4e5f6a7b8c9d0',
    strategy: 'balanced',
    status: 'active',
    portfolioValue: 1450.2,
    totalEarned: 87.43,
    reputation: 851,
    actionsCount: 124,
    createdAt: '2026-03-01',
    positions: [
      {
        protocol: 'Radiant',
        type: 'deposit',
        amount: 500,
        apy: 11.4,
        openedAt: '2026-03-01',
        healthFactor: null,
      },
      {
        protocol: 'Venus',
        type: 'borrow',
        amount: 200,
        apy: 7.2,
        openedAt: '2026-03-05',
        healthFactor: 1.84,
        collateral: 300,
      },
    ],
  },
  {
    id: '0x3c8e9d2f1a4b7c0e5f2a8d3b6c9e1f4a',
    name: 'Lend Guard #2',
    publicKey: 'ed25519:3c8e9d2f1a4b7c0e...',
    walletAddress: '0xb2c3d4e5f6a7b8c9d0e1',
    strategy: 'conservative',
    status: 'active',
    portfolioValue: 890.5,
    totalEarned: 31.2,
    reputation: 812,
    actionsCount: 67,
    createdAt: '2026-03-03',
    positions: [
      {
        protocol: 'Kinza',
        type: 'deposit',
        amount: 450,
        apy: 9.1,
        openedAt: '2026-03-03',
        healthFactor: null,
      },
    ],
  },
  {
    id: '0xa1b9c2e4d5f8a3b6c7e0f1a2b3c4d5e6',
    name: 'Safe Stacker',
    publicKey: 'ed25519:a1b9c2e4d5f8a3b6...',
    walletAddress: '0xc3d4e5f6a7b8c9d0e1f2',
    strategy: 'aggressive',
    status: 'idle',
    portfolioValue: 1110.0,
    totalEarned: 8.8,
    reputation: 761,
    actionsCount: 23,
    createdAt: '2026-03-07',
    positions: [],
  },
];

export const mockProtocols: Protocol[] = [
  { name: 'Radiant', apy: 11.4, tvl: 290000000, utilization: 0.78, agents: 72, asset: 'USDT', poolType: 'Lending' },
  { name: 'Kinza', apy: 9.1, tvl: 180000000, utilization: 0.65, agents: 61, asset: 'USDT', poolType: 'Lending' },
  { name: 'Venus', apy: 7.2, tvl: 420000000, utilization: 0.55, agents: 84, asset: 'USDT', poolType: 'Lending' },
  { name: 'Venus', apy: 4.1, tvl: 180000000, utilization: 0.42, agents: 44, asset: 'BNB', poolType: 'Borrow' },
  { name: 'Aave', apy: 6.4, tvl: 890000000, utilization: 0.61, agents: 30, asset: 'USDT', poolType: 'Lending' },
];

export const mockPipeline: PipelineItem[] = [
  {
    id: 'pipe_001',
    agentId: '0x7f2a...4b1c',
    agentName: 'Yield Bot Alpha',
    protocol: 'Radiant',
    action: 'DEPOSIT',
    amount: 500,
    phase: 'committed',
    hash: '0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
    blocksCommitted: 12,
    blocksRequired: 15,
    committedAt: '2026-03-13T09:41:00Z',
  },
  {
    id: 'pipe_002',
    agentId: '0x3c8e...9d2f',
    agentName: 'Lend Guard #2',
    protocol: 'Venus',
    action: 'BORROW',
    amount: 200,
    phase: 'revealed',
    hash: '0xa9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4',
    blocksCommitted: 15,
    blocksRequired: 15,
    committedAt: '2026-03-13T09:35:00Z',
  },
];

export const mockRecentActions: RecentAction[] = [
  { id: 'act_001', time: '12s ago', agentName: 'Yield Bot Alpha', protocol: 'Radiant', action: 'DEPOSIT', amount: 500, status: 'confirmed', txHash: '0xab12...cd34' },
  { id: 'act_002', time: '34s ago', agentName: 'Lend Guard #2', protocol: 'Venus', action: 'BORROW', amount: 200, status: 'confirmed', txHash: '0xef56...gh78' },
  { id: 'act_003', time: '1m ago', agentName: 'Safe Stacker', protocol: 'Kinza', action: 'REPAY', amount: 150, status: 'pending', txHash: '0xij90...kl12' },
  { id: 'act_004', time: '2m ago', agentName: 'Yield Bot Alpha', protocol: 'Radiant', action: 'COMMIT', amount: 0, status: 'committed', txHash: '0xmn34...op56' },
  { id: 'act_005', time: '5m ago', agentName: 'Lend Guard #2', protocol: 'Kinza', action: 'DEPOSIT', amount: 300, status: 'confirmed', txHash: '0xqr78...st90' },
  { id: 'act_006', time: '8m ago', agentName: 'Yield Bot Alpha', protocol: 'Venus', action: 'WITHDRAW', amount: 100, status: 'confirmed', txHash: '0xuv12...wx34' },
  { id: 'act_007', time: '12m ago', agentName: 'Safe Stacker', protocol: 'Aave', action: 'DEPOSIT', amount: 250, status: 'confirmed', txHash: '0xyz56...ab78' },
  { id: 'act_008', time: '15m ago', agentName: 'Yield Bot Alpha', protocol: 'Radiant', action: 'REVEAL', amount: 500, status: 'confirmed', txHash: '0xcd90...ef12' },
  { id: 'act_009', time: '20m ago', agentName: 'Lend Guard #2', protocol: 'Venus', action: 'REPAY', amount: 50, status: 'confirmed', txHash: '0xgh34...ij56' },
  { id: 'act_010', time: '25m ago', agentName: 'Safe Stacker', protocol: 'Kinza', action: 'COMMIT', amount: 0, status: 'committed', txHash: '0xkl78...mn90' },
];

export const mockReputationHistory: ReputationEntry[] = [
  { action: 'Successful reveal', points: 4, date: 'Mar 12, 2026', agentName: 'Yield Bot Alpha' },
  { action: 'On-time repay', points: 3, date: 'Mar 11, 2026', agentName: 'Lend Guard #2' },
  { action: 'High APY deposit', points: 5, date: 'Mar 10, 2026', agentName: 'Yield Bot Alpha' },
  { action: 'Late reveal (missed window)', points: -8, date: 'Mar 08, 2026', agentName: 'Safe Stacker' },
  { action: 'Successful reveal', points: 4, date: 'Mar 07, 2026', agentName: 'Yield Bot Alpha' },
  { action: 'Zero-error day', points: 10, date: 'Mar 06, 2026', agentName: 'Lend Guard #2' },
  { action: 'Successful commit-reveal', points: 2, date: 'Mar 05, 2026', agentName: 'Safe Stacker' },
  { action: 'Position > 30 days bonus', points: 5, date: 'Mar 04, 2026', agentName: 'Yield Bot Alpha' },
];

export const portfolioHistory: PortfolioDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(2026, 1, 12 + i).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  value: Math.round((3200 + i * 8.3 + Math.random() * 15) * 100) / 100,
}));

export const mockLogs: LogEntry[] = [
  { id: 'log_001', timestamp: 'Mar 13, 2026 · 09:41 AM', block: 47291843, agentName: 'Yield Bot Alpha', agentId: '0x7f2a...4b1c', protocol: 'Radiant', actionType: 'COMMIT', amount: 500, status: 'success', txHash: '0xab12...cd34' },
  { id: 'log_002', timestamp: 'Mar 13, 2026 · 09:38 AM', block: 47291842, agentName: 'Lend Guard #2', agentId: '0x3c8e...9d2f', protocol: 'Venus', actionType: 'REVEAL', amount: 200, status: 'success', txHash: '0xef56...gh78' },
  { id: 'log_003', timestamp: 'Mar 13, 2026 · 09:35 AM', block: 47291840, agentName: 'Safe Stacker', agentId: '0xa1b9...2e4c', protocol: 'Kinza', actionType: 'REPAY', amount: 150, status: 'pending', txHash: '0xij90...kl12' },
  { id: 'log_004', timestamp: 'Mar 13, 2026 · 09:30 AM', block: 47291838, agentName: 'Yield Bot Alpha', agentId: '0x7f2a...4b1c', protocol: 'Radiant', actionType: 'DEPOSIT', amount: 500, status: 'success', txHash: '0xmn34...op56' },
  { id: 'log_005', timestamp: 'Mar 13, 2026 · 09:25 AM', block: 47291835, agentName: 'Lend Guard #2', agentId: '0x3c8e...9d2f', protocol: 'Kinza', actionType: 'DEPOSIT', amount: 300, status: 'success', txHash: '0xqr78...st90' },
  { id: 'log_006', timestamp: 'Mar 13, 2026 · 09:20 AM', block: 47291832, agentName: 'Yield Bot Alpha', agentId: '0x7f2a...4b1c', protocol: 'Venus', actionType: 'WITHDRAW', amount: 100, status: 'success', txHash: '0xuv12...wx34' },
  { id: 'log_007', timestamp: 'Mar 13, 2026 · 09:15 AM', block: 47291829, agentName: 'Safe Stacker', agentId: '0xa1b9...2e4c', protocol: 'Aave', actionType: 'DEPOSIT', amount: 250, status: 'success', txHash: '0xyz56...ab78' },
  { id: 'log_008', timestamp: 'Mar 13, 2026 · 09:10 AM', block: 47291826, agentName: 'Yield Bot Alpha', agentId: '0x7f2a...4b1c', protocol: 'Radiant', actionType: 'BORROW', amount: 200, status: 'success', txHash: '0xcd90...ef12' },
  { id: 'log_009', timestamp: 'Mar 13, 2026 · 09:05 AM', block: 47291823, agentName: 'Lend Guard #2', agentId: '0x3c8e...9d2f', protocol: 'Venus', actionType: 'REPAY', amount: 50, status: 'success', txHash: '0xgh34...ij56' },
  { id: 'log_010', timestamp: 'Mar 13, 2026 · 09:00 AM', block: 47291820, agentName: 'Safe Stacker', agentId: '0xa1b9...2e4c', protocol: 'Kinza', actionType: 'COMMIT', amount: 0, status: 'success', txHash: '0xkl78...mn90' },
];

export const terminalLines = [
  '> AgentFi agent boot sequence',
  '> agent_id: 0x7f2a...4b1c',
  '> keypair: verified ✓',
  '> wallet: 0xa1b2...3c4d [WDK]',
  '> scanning protocols...',
  '>   venus    APY: 7.2%  status: AVAILABLE',
  '>   kinza    APY: 9.1%  status: AVAILABLE',
  '>   radiant  APY: 11.4% status: AVAILABLE ←',
  '> committing action hash: 0xd4e5f6...',
  '> commit confirmed. reveal window: 12 blocks',
  '> [████████████████░░░░] 80% — waiting...',
  '> reveal executed. deposit: 500 USDT → Radiant',
  '> transaction: 0xab12...cd34 ✓',
  '> reward credited: +2.4 AFI',
  '> reputation: 847 → 851 (+4)',
];

export const liveFeedData = [
  { agentId: '0x7f2a...4b1c', action: 'DEPOSIT', protocol: 'Radiant', amount: '500 USDT', status: 'CONFIRMED', time: '12s ago' },
  { agentId: '0x3c8e...9d2f', action: 'BORROW', protocol: 'Venus', amount: '200 USDT', status: 'CONFIRMED', time: '34s ago' },
  { agentId: '0xa1b9...2e4c', action: 'REPAY', protocol: 'Kinza', amount: '150 USDT', status: 'PENDING', time: '1m ago' },
  { agentId: '0x5f1d...8a3b', action: 'COMMIT', protocol: '------', amount: '------ USDT', status: 'COMMITTED', time: '2m ago' },
  { agentId: '0x9e2c...7d4a', action: 'DEPOSIT', protocol: 'Aave', amount: '1,000 USDT', status: 'CONFIRMED', time: '3m ago' },
  { agentId: '0x4b8f...1c6e', action: 'WITHDRAW', protocol: 'Venus', amount: '300 USDT', status: 'CONFIRMED', time: '4m ago' },
  { agentId: '0x2d5a...9f3b', action: 'REVEAL', protocol: 'Radiant', amount: '750 USDT', status: 'CONFIRMED', time: '5m ago' },
  { agentId: '0x8c1e...4a7d', action: 'DEPOSIT', protocol: 'Kinza', amount: '200 USDT', status: 'CONFIRMED', time: '6m ago' },
];

export const nxsEarningsData = Array.from({ length: 7 }, (_, i) => ({
  day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
  amount: Math.round((Math.random() * 15 + 5) * 10) / 10,
}));
