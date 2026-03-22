/**
 * DeFi Pools Service
 * Fetches real-time yield data from DeFiLlama for BNB Chain protocols.
 */

export interface DeFiPool {
  id: string;
  project: string;
  symbol: string;
  chain: string;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  tvlUsd: number;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  poolMeta: string | null;
  predictions: {
    predictedClass: string | null;
    predictedProbability: number | null;
  };
}

// Protocols we care about on BSC
const SUPPORTED_PROJECTS = [
  'venus-core-pool',
  'venus-flux',
  'pancakeswap-amm-v3',
  'pancakeswap-amm-v2',
  'lista-lending',
  'lista-liquid-staking',
  'lista-cdp',
  'aave-v3',
  'radiant-v2',
  'kinza-finance',
  'alpaca-finance-2.0',
  'thena-v1',
  'biswap-v3',
  'wombat-exchange',
  'binance-staked-eth',
  'stables-labs-usdx',
  'solv-basis-trading',
];

const PROTOCOL_DISPLAY: Record<string, { name: string; color: string; riskLevel: string }> = {
  'venus-core-pool': { name: 'Venus', color: '#5B8DEF', riskLevel: 'Low' },
  'venus-flux': { name: 'Venus Flux', color: '#5B8DEF', riskLevel: 'Low' },
  'pancakeswap-amm-v3': { name: 'PancakeSwap V3', color: '#1FC7D4', riskLevel: 'Medium' },
  'pancakeswap-amm-v2': { name: 'PancakeSwap V2', color: '#1FC7D4', riskLevel: 'Medium' },
  'lista-lending': { name: 'Lista DAO', color: '#FFD700', riskLevel: 'Low' },
  'lista-liquid-staking': { name: 'Lista Staking', color: '#FFD700', riskLevel: 'Low' },
  'lista-cdp': { name: 'Lista CDP', color: '#FFD700', riskLevel: 'Medium' },
  'aave-v3': { name: 'Aave V3', color: '#B6509E', riskLevel: 'Low' },
  'radiant-v2': { name: 'Radiant V2', color: '#00D395', riskLevel: 'Medium' },
  'kinza-finance': { name: 'Kinza', color: '#FF6B35', riskLevel: 'Medium' },
  'alpaca-finance-2.0': { name: 'Alpaca Finance', color: '#A0D911', riskLevel: 'High' },
  'thena-v1': { name: 'Thena', color: '#CB3BFF', riskLevel: 'Medium' },
  'biswap-v3': { name: 'Biswap', color: '#1263F1', riskLevel: 'Medium' },
  'wombat-exchange': { name: 'Wombat', color: '#E8A3A3', riskLevel: 'Low' },
  'binance-staked-eth': { name: 'Binance Staking', color: '#F0B90B', riskLevel: 'Low' },
  'stables-labs-usdx': { name: 'Stables USDX', color: '#00C853', riskLevel: 'Low' },
  'solv-basis-trading': { name: 'Solv Protocol', color: '#4A90D9', riskLevel: 'Medium' },
};

export function getProtocolInfo(project: string) {
  return PROTOCOL_DISPLAY[project] || { name: project, color: '#888', riskLevel: 'Unknown' };
}

// Strategy filters
export function filterByStrategy(pools: DeFiPool[], strategy: string): DeFiPool[] {
  switch (strategy) {
    case 'Conservative':
      // Low risk only: Venus, Lista lending, Aave, stablecoin pools
      return pools.filter(p => {
        const info = getProtocolInfo(p.project);
        return info.riskLevel === 'Low' || p.stablecoin;
      });
    case 'Balanced':
      // Low + Medium risk
      return pools.filter(p => {
        const info = getProtocolInfo(p.project);
        return info.riskLevel !== 'High';
      });
    case 'Aggressive':
      // All pools, sorted by highest APY
      return [...pools].sort((a, b) => b.apy - a.apy);
    default:
      return pools;
  }
}

let cachedPools: DeFiPool[] = [];
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchBscPools(forceRefresh = false): Promise<DeFiPool[]> {
  if (!forceRefresh && cachedPools.length > 0 && Date.now() - lastFetch < CACHE_TTL) {
    return cachedPools;
  }

  try {
    const res = await fetch('https://yields.llama.fi/pools');
    const data = await res.json();

    if (data.status !== 'success') throw new Error('DeFiLlama API error');

    const bscPools: DeFiPool[] = data.data
      .filter((p: any) =>
        p.chain === 'BSC' &&
        SUPPORTED_PROJECTS.includes(p.project) &&
        p.tvlUsd > 10000 && // Ignore dust pools
        p.apy > 0 // Only pools with positive yield
      )
      .map((p: any) => ({
        id: p.pool,
        project: p.project,
        symbol: p.symbol,
        chain: p.chain,
        apy: p.apy ?? 0,
        apyBase: p.apyBase,
        apyReward: p.apyReward,
        tvlUsd: p.tvlUsd,
        stablecoin: p.stablecoin ?? false,
        ilRisk: p.ilRisk ?? 'unknown',
        exposure: p.exposure ?? 'single',
        poolMeta: p.poolMeta,
        predictions: {
          predictedClass: p.predictions?.predictedClass ?? null,
          predictedProbability: p.predictions?.predictedProbability ?? null,
        },
      }))
      .sort((a: DeFiPool, b: DeFiPool) => b.tvlUsd - a.tvlUsd);

    cachedPools = bscPools;
    lastFetch = Date.now();
    return bscPools;
  } catch (err) {
    console.error('Failed to fetch DeFi pools:', err);
    return cachedPools; // Return cache on error
  }
}

export function formatTvl(tvl: number): string {
  if (tvl >= 1_000_000_000) return `$${(tvl / 1_000_000_000).toFixed(2)}B`;
  if (tvl >= 1_000_000) return `$${(tvl / 1_000_000).toFixed(2)}M`;
  if (tvl >= 1_000) return `$${(tvl / 1_000).toFixed(1)}K`;
  return `$${tvl.toFixed(0)}`;
}

export function formatApy(apy: number): string {
  if (apy >= 100) return `${apy.toFixed(0)}%`;
  if (apy >= 10) return `${apy.toFixed(1)}%`;
  return `${apy.toFixed(2)}%`;
}
