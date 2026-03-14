export interface Agent {
  id: string;
  name: string;
  publicKey: string;
  walletAddress: string;
  strategy: 'conservative' | 'balanced' | 'aggressive';
  status: 'active' | 'idle' | 'paused';
  portfolioValue: number;
  totalEarned: number;
  reputation: number;
  actionsCount: number;
  createdAt: string;
  positions: Position[];
}

export interface Position {
  protocol: string;
  type: 'deposit' | 'borrow';
  amount: number;
  apy: number;
  openedAt: string;
  healthFactor: number | null;
  collateral?: number;
}

export interface Protocol {
  name: string;
  apy: number;
  tvl: number;
  utilization: number;
  agents: number;
  asset: string;
  poolType: string;
}

export interface PipelineItem {
  id: string;
  agentId: string;
  agentName: string;
  protocol: string;
  action: string;
  amount: number;
  phase: 'committed' | 'waiting' | 'revealed' | 'executed';
  hash: string;
  blocksCommitted: number;
  blocksRequired: number;
  committedAt: string;
}

export interface RecentAction {
  id: string;
  time: string;
  agentName: string;
  protocol: string;
  action: string;
  amount: number;
  status: 'confirmed' | 'pending' | 'failed' | 'committed';
  txHash: string;
}

export interface ReputationEntry {
  action: string;
  points: number;
  date: string;
  agentName: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  block: number;
  agentName: string;
  agentId: string;
  protocol: string;
  actionType: string;
  amount: number;
  status: 'success' | 'pending' | 'failed';
  txHash: string;
}

export interface PortfolioDataPoint {
  date: string;
  value: number;
}
