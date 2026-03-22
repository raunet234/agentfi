/**
 * AgentFi — Autonomous Agent Runner
 * 
 * This is the "brain" that makes agents autonomous.
 * It scans DeFi pools, picks the best opportunities based on each agent's
 * strategy, and executes commit-reveal actions automatically.
 * 
 * Usage:
 *   node server/agentRunner.cjs
 * 
 * Required env vars:
 *   DEPLOYER_PRIVATE_KEY — Wallet private key that owns the agents
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ─── Configuration ───
const RPC_URL = process.env.VITE_BNB_MAINNET_RPC || 'https://bsc-dataseed.binance.org/';
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const SCAN_INTERVAL_MS = 60 * 1000; // Scan every 60 seconds
const DEFI_LLAMA_URL = 'https://yields.llama.fi/pools';
const POOL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Load contracts ───
const contractsConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'contracts.json'), 'utf8')
);

// ─── Supported protocols ───
const SUPPORTED_PROJECTS = [
  'venus-core-pool', 'venus-flux', 'pancakeswap-amm-v3', 'pancakeswap-amm-v2',
  'lista-lending', 'lista-liquid-staking', 'lista-cdp', 'aave-v3',
  'radiant-v2', 'kinza-finance', 'alpaca-finance-2.0', 'thena-v1',
  'biswap-v3', 'wombat-exchange', 'binance-staked-eth',
];

const PROTOCOL_RISK = {
  'venus-core-pool': 'Low', 'venus-flux': 'Low',
  'pancakeswap-amm-v3': 'Medium', 'pancakeswap-amm-v2': 'Medium',
  'lista-lending': 'Low', 'lista-liquid-staking': 'Low', 'lista-cdp': 'Medium',
  'aave-v3': 'Low', 'radiant-v2': 'Medium', 'kinza-finance': 'Medium',
  'alpaca-finance-2.0': 'High', 'thena-v1': 'Medium', 'biswap-v3': 'Medium',
  'wombat-exchange': 'Low', 'binance-staked-eth': 'Low',
};

// ─── State ───
let cachedPools = [];
let lastPoolFetch = 0;
let pendingCommits = new Map(); // commitId -> { salt, action, protocol, amount, agentId, commitBlock }
let isRunning = false;

// ─── Pretty logging ───
function log(emoji, msg) {
  const ts = new Date().toLocaleTimeString();
  console.log(`  ${emoji}  [${ts}] ${msg}`);
}

function logHeader(msg) {
  console.log('');
  console.log(`  ╔${'═'.repeat(60)}╗`);
  console.log(`  ║  ${msg.padEnd(57)}║`);
  console.log(`  ╚${'═'.repeat(60)}╝`);
}

function logSection(msg) {
  console.log(`  ┌─ ${msg} ${'─'.repeat(Math.max(0, 55 - msg.length))}┐`);
}

// ─── Blockchain Setup ───
function setupProvider() {
  if (!PRIVATE_KEY) {
    throw new Error('DEPLOYER_PRIVATE_KEY not set in .env');
  }
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  return { provider, wallet };
}

function getContracts(wallet) {
  const registry = new ethers.Contract(
    contractsConfig.contracts.AgentRegistry.address,
    contractsConfig.contracts.AgentRegistry.abi,
    wallet
  );
  const commitReveal = new ethers.Contract(
    contractsConfig.contracts.CommitReveal.address,
    contractsConfig.contracts.CommitReveal.abi,
    wallet
  );
  const afiToken = new ethers.Contract(
    contractsConfig.contracts.AFIToken.address,
    contractsConfig.contracts.AFIToken.abi,
    wallet
  );
  return { registry, commitReveal, afiToken };
}

// ─── DeFi Pool Scanner ───
async function fetchPools(forceRefresh = false) {
  if (!forceRefresh && cachedPools.length > 0 && Date.now() - lastPoolFetch < POOL_CACHE_TTL) {
    return cachedPools;
  }

  try {
    const res = await fetch(DEFI_LLAMA_URL);
    const data = await res.json();

    if (data.status !== 'success') throw new Error('DeFiLlama API error');

    cachedPools = data.data
      .filter(p =>
        p.chain === 'BSC' &&
        SUPPORTED_PROJECTS.includes(p.project) &&
        p.tvlUsd > 10000 &&
        p.apy > 0
      )
      .map(p => ({
        id: p.pool,
        project: p.project,
        symbol: p.symbol,
        apy: p.apy ?? 0,
        apyBase: p.apyBase,
        apyReward: p.apyReward,
        tvlUsd: p.tvlUsd,
        stablecoin: p.stablecoin ?? false,
        ilRisk: p.ilRisk ?? 'unknown',
        exposure: p.exposure ?? 'single',
        riskLevel: PROTOCOL_RISK[p.project] || 'Unknown',
      }))
      .sort((a, b) => b.tvlUsd - a.tvlUsd);

    lastPoolFetch = Date.now();
    log('📊', `Fetched ${cachedPools.length} BSC pools from DeFiLlama`);
    return cachedPools;
  } catch (err) {
    log('❌', `Pool fetch failed: ${err.message}`);
    return cachedPools;
  }
}

// ─── Strategy Engine ───
function pickBestPool(pools, strategy) {
  let filtered = [...pools];

  switch (strategy) {
    case 'Conservative':
      // Low risk only: stablecoins, Venus, Aave, Lista Lending
      filtered = filtered.filter(p => p.riskLevel === 'Low' || p.stablecoin);
      // Sort by APY (highest first among safe pools)
      filtered.sort((a, b) => b.apy - a.apy);
      break;

    case 'Balanced':
      // Low + Medium risk
      filtered = filtered.filter(p => p.riskLevel !== 'High');
      // Sort by APY * TVL score (balance between yield and safety)
      filtered.sort((a, b) => {
        const scoreA = a.apy * Math.log10(a.tvlUsd);
        const scoreB = b.apy * Math.log10(b.tvlUsd);
        return scoreB - scoreA;
      });
      break;

    case 'Aggressive':
      // All pools, just sort by highest APY
      filtered.sort((a, b) => b.apy - a.apy);
      break;

    default:
      // Default to balanced
      filtered = filtered.filter(p => p.riskLevel !== 'High');
      filtered.sort((a, b) => b.apy - a.apy);
  }

  return filtered[0] || null;
}

function decideAction(pool) {
  // For now, always DEPOSIT — in production this would consider:
  // - Current positions
  // - Market conditions
  // - Position rebalancing needs
  return 'DEPOSIT';
}

function decideAmount(maxPositionSize, balance) {
  // For small positions (<$100), use 80%. For larger, use 10%.
  const percentage = maxPositionSize <= 100 ? 0.8 : 0.1;
  const target = Math.max(1, Math.floor(maxPositionSize * percentage));
  return target;
}

// ─── Fetch On-chain Agents ───
async function fetchMyAgents(contracts, walletAddress) {
  try {
    const agentIds = await contracts.registry.getOwnerAgents(walletAddress);
    const agents = [];

    for (const id of agentIds) {
      const agent = await contracts.registry.getAgent(id);
      if (agent.active) {
        agents.push({
          id: id,
          name: agent.name,
          strategy: agent.strategy,
          maxPositionSize: parseFloat(ethers.formatEther(agent.maxPositionSize)),
          reputation: Number(agent.reputation),
          owner: agent.owner,
        });
      }
    }

    return agents;
  } catch (err) {
    log('❌', `Failed to fetch agents: ${err.message}`);
    return [];
  }
}

// ─── Commit-Reveal Execution ───
async function executeCommit(contracts, agentId, action, protocol, amount) {
  const salt = ethers.hexlify(ethers.randomBytes(32));
  const commitHash = ethers.keccak256(
    ethers.solidityPacked(
      ['string', 'string', 'uint256', 'bytes32'],
      [action, protocol, ethers.parseEther(amount.toString()), salt]
    )
  );

  log('🔒', `Committing: ${action} on ${protocol} (${amount} USDT)`);

  const tx = await contracts.commitReveal.commit(agentId, commitHash);
  const receipt = await tx.wait();

  // Extract commitId from event
  let commitId = '';
  for (const eventLog of receipt.logs) {
    try {
      const parsed = contracts.commitReveal.interface.parseLog({
        topics: [...eventLog.topics],
        data: eventLog.data,
      });
      if (parsed && parsed.name === 'ActionCommitted') {
        commitId = parsed.args.commitId;
        break;
      }
    } catch { /* not our event */ }
  }

  log('✅', `Committed! TX: ${receipt.hash.slice(0, 16)}... CommitID: ${commitId.slice(0, 16)}...`);

  // Store pending commit for reveal
  pendingCommits.set(commitId, {
    salt,
    action,
    protocol,
    amount,
    agentId,
    commitBlock: receipt.blockNumber,
    txHash: receipt.hash,
  });

  return { commitId, salt, txHash: receipt.hash };
}

async function executeReveal(contracts, commitId) {
  const pending = pendingCommits.get(commitId);
  if (!pending) {
    log('⚠️', `No pending commit found for ${commitId.slice(0, 16)}...`);
    return null;
  }

  // Check if can reveal
  try {
    const canReveal = await contracts.commitReveal.canReveal(commitId);
    if (!canReveal) {
      const blocks = await contracts.commitReveal.blocksUntilReveal(commitId);
      log('⏳', `Cannot reveal yet. ${Number(blocks)} blocks remaining.`);
      return null;
    }
  } catch (err) {
    log('⚠️', `Reveal check failed: ${err.message}`);
    return null;
  }

  log('🔓', `Revealing: ${pending.action} on ${pending.protocol} (${pending.amount} USDT)`);

  const tx = await contracts.commitReveal.reveal(
    commitId,
    pending.action,
    pending.protocol,
    ethers.parseEther(pending.amount.toString()),
    pending.salt
  );
  const receipt = await tx.wait();

  log('✅', `Revealed! TX: ${receipt.hash.slice(0, 16)}... Action executed onchain!`);

  // Remove from pending
  pendingCommits.delete(commitId);

  return receipt.hash;
}

// ─── Main Agent Loop ───
async function runAgentCycle(wallet, contracts) {
  const walletAddress = await wallet.getAddress();
  const balance = parseFloat(ethers.formatEther(await wallet.provider.getBalance(walletAddress)));

  logSection(`Agent Cycle @ ${new Date().toLocaleTimeString()}`);
  log('👛', `Wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}  Balance: ${balance.toFixed(6)} BNB`);

  // Step 1: Check for pending reveals first
  if (pendingCommits.size > 0) {
    log('📋', `${pendingCommits.size} pending commit(s) to check for reveal`);
    for (const [commitId] of pendingCommits) {
      try {
        await executeReveal(contracts, commitId);
      } catch (err) {
        log('❌', `Reveal failed: ${err.message}`);
      }
    }
  }

  // Step 2: Fetch agents
  const agents = await fetchMyAgents(contracts, walletAddress);
  if (agents.length === 0) {
    log('ℹ️', 'No active agents found. Register an agent on the dashboard first.');
    return;
  }

  log('🤖', `Found ${agents.length} active agent(s)`);

  // Step 3: Fetch DeFi pools
  const pools = await fetchPools();
  if (pools.length === 0) {
    log('⚠️', 'No pools available. Skipping this cycle.');
    return;
  }

  // Step 4: For each agent, decide what to do
  for (const agent of agents) {
    log('', '');
    log('🤖', `Agent: "${agent.name}" | Strategy: ${agent.strategy} | Rep: ${agent.reputation}`);

    // Skip if this agent already has a pending commit
    const hasPending = [...pendingCommits.values()].some(p => p.agentId === agent.id);
    if (hasPending) {
      log('⏳', 'Agent has a pending commit-reveal. Waiting for reveal window...');
      continue;
    }

    // Check gas balance
    if (balance < 0.0005) {
      log('⚠️', `Insufficient gas (${balance.toFixed(6)} BNB). Need at least 0.0005 BNB.`);
      continue;
    }

    // Pick best pool for this agent's strategy
    const bestPool = pickBestPool(pools, agent.strategy);
    if (!bestPool) {
      log('ℹ️', 'No suitable pool found for this strategy.');
      continue;
    }

    log('📊', `Best pool: ${bestPool.symbol} on ${bestPool.project} — APY: ${bestPool.apy.toFixed(2)}% | TVL: $${(bestPool.tvlUsd / 1e6).toFixed(2)}M | Risk: ${bestPool.riskLevel}`);

    // Decide action and amount
    const action = decideAction(bestPool);
    const amount = decideAmount(agent.maxPositionSize, balance);

    if (amount < 1) {
      log('ℹ️', `Amount too small (${amount.toFixed(2)}). Skipping.`);
      continue;
    }

    log('🧠', `Decision: ${action} ${amount.toFixed(2)} USDT into ${bestPool.project}`);

    // Map pool project to simple protocol name
    const protocolName = bestPool.project.split('-')[0].charAt(0).toUpperCase() +
                         bestPool.project.split('-')[0].slice(1);

    // Execute commit
    try {
      await executeCommit(contracts, agent.id, action, protocolName, amount);
    } catch (err) {
      log('❌', `Commit failed: ${err.message}`);
    }
  }

  console.log(`  └${'─'.repeat(60)}┘`);
}

// ─── Startup ───
async function main() {
  logHeader('AgentFi Autonomous Agent Runner');
  console.log('');
  log('🚀', 'Starting agent automation backend...');
  log('🔗', `RPC: ${RPC_URL}`);
  log('📄', `AgentRegistry: ${contractsConfig.contracts.AgentRegistry.address}`);
  log('📄', `CommitReveal:  ${contractsConfig.contracts.CommitReveal.address}`);
  log('📄', `AFIToken:      ${contractsConfig.contracts.AFIToken.address}`);
  log('⏱️', `Scan interval: ${SCAN_INTERVAL_MS / 1000}s`);

  // Verify contracts are deployed
  if (!contractsConfig.contracts.AgentRegistry.address ||
      !contractsConfig.contracts.CommitReveal.address) {
    log('❌', 'Contracts not deployed! Deploy contracts first with: node scripts/deploy.cjs');
    process.exit(1);
  }

  // Setup wallet & contracts
  const { provider, wallet } = setupProvider();
  const contracts = getContracts(wallet);

  const walletAddress = await wallet.getAddress();
  const balance = await provider.getBalance(walletAddress);
  log('👛', `Agent wallet: ${walletAddress}`);
  log('💰', `Balance: ${ethers.formatEther(balance)} BNB`);

  if (parseFloat(ethers.formatEther(balance)) < 0.0003) {
    log('⚠️', 'WARNING: Very low balance! Agent needs BNB for gas fees.');
  }

  // Fetch initial pool data
  log('📊', 'Fetching initial DeFi pool data...');
  await fetchPools(true);

  // Run first cycle immediately
  log('🏁', 'Running first agent cycle...');
  console.log('');

  try {
    await runAgentCycle(wallet, contracts);
  } catch (err) {
    log('❌', `First cycle error: ${err.message}`);
  }

  // Schedule recurring cycles
  log('🔄', `Scheduling scan every ${SCAN_INTERVAL_MS / 1000} seconds...`);
  log('ℹ️', 'Press Ctrl+C to stop the agent runner.');
  console.log('');

  isRunning = true;

  setInterval(async () => {
    if (!isRunning) return;
    try {
      await runAgentCycle(wallet, contracts);
    } catch (err) {
      log('❌', `Cycle error: ${err.message}`);
    }
  }, SCAN_INTERVAL_MS);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  log('🛑', 'Shutting down agent runner...');
  isRunning = false;

  if (pendingCommits.size > 0) {
    log('⚠️', `WARNING: ${pendingCommits.size} pending commit(s) not yet revealed!`);
    log('⚠️', 'You may need to manually reveal them from the dashboard.');
    for (const [commitId, data] of pendingCommits) {
      log('📋', `  CommitID: ${commitId.slice(0, 20)}...  Action: ${data.action} ${data.amount} on ${data.protocol}`);
    }
  }

  log('👋', 'Agent runner stopped.');
  process.exit(0);
});

main().catch(err => {
  log('💥', `Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
