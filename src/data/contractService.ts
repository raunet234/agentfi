import { Contract, JsonRpcProvider, formatEther, parseEther, keccak256, solidityPacked, randomBytes, hexlify } from 'ethers';
import contractsConfig from './contracts.json';

// ─── BNB Mainnet Configuration ───
const RPC_URL = import.meta.env.VITE_BNB_MAINNET_RPC || 'https://bsc-dataseed.binance.org/';

export const CHAIN_ID = 56;
export const NETWORK_NAME = 'BNB Smart Chain';
export const CURRENCY_SYMBOL = 'BNB';
export const EXPLORER_URL = 'https://bscscan.com';

// Read-only provider for fetching data
const readProvider = new JsonRpcProvider(RPC_URL);

/**
 * Check if contracts are deployed
 */
export function areContractsDeployed(): boolean {
  return (
    contractsConfig.contracts.AgentRegistry.address !== '' &&
    contractsConfig.contracts.CommitReveal.address !== '' &&
    contractsConfig.contracts.AFIToken.address !== '' &&
    contractsConfig.contracts.AgentRegistry.abi.length > 0
  );
}

/**
 * Get read-only contract instances (no signer needed)
 */
export function getReadContracts() {
  if (!areContractsDeployed()) return null;

  const registry = new Contract(
    contractsConfig.contracts.AgentRegistry.address,
    contractsConfig.contracts.AgentRegistry.abi,
    readProvider,
  );

  const commitReveal = new Contract(
    contractsConfig.contracts.CommitReveal.address,
    contractsConfig.contracts.CommitReveal.abi,
    readProvider,
  );

  const afiToken = new Contract(
    contractsConfig.contracts.AFIToken.address,
    contractsConfig.contracts.AFIToken.abi,
    readProvider,
  );

  return { registry, commitReveal, afiToken };
}

/**
 * Get writable contract instances (requires connected signer)
 */
export async function getWriteContracts(signer: any) {
  if (!areContractsDeployed()) return null;

  const registry = new Contract(
    contractsConfig.contracts.AgentRegistry.address,
    contractsConfig.contracts.AgentRegistry.abi,
    signer,
  );

  const commitReveal = new Contract(
    contractsConfig.contracts.CommitReveal.address,
    contractsConfig.contracts.CommitReveal.abi,
    signer,
  );

  const afiToken = new Contract(
    contractsConfig.contracts.AFIToken.address,
    contractsConfig.contracts.AFIToken.abi,
    signer,
  );

  return { registry, commitReveal, afiToken };
}

// ─── Agent Registry Functions ───

export interface OnchainAgent {
  id: string;
  owner: string;
  publicKeyHash: string;
  name: string;
  strategy: string;
  maxPositionSize: string;
  reputation: number;
  totalEarnings: string;
  registeredAt: number;
  active: boolean;
}

/**
 * Fetch all agents for a specific owner
 */
export async function fetchOwnerAgents(ownerAddress: string): Promise<OnchainAgent[]> {
  const contracts = getReadContracts();
  if (!contracts) return [];

  try {
    const agentIds = await contracts.registry.getOwnerAgents(ownerAddress);
    const agents: OnchainAgent[] = [];

    for (const id of agentIds) {
      const agent = await contracts.registry.getAgent(id);
      agents.push({
        id: id,
        owner: agent.owner,
        publicKeyHash: agent.publicKeyHash,
        name: agent.name,
        strategy: agent.strategy,
        maxPositionSize: formatEther(agent.maxPositionSize),
        reputation: Number(agent.reputation),
        totalEarnings: formatEther(agent.totalEarnings),
        registeredAt: Number(agent.registeredAt),
        active: agent.active,
      });
    }

    return agents;
  } catch (err) {
    console.error('Error fetching agents:', err);
    return [];
  }
}

/**
 * Fetch total agent count
 */
export async function fetchTotalAgents(): Promise<number> {
  const contracts = getReadContracts();
  if (!contracts) return 0;

  try {
    const count = await contracts.registry.getAgentCount();
    return Number(count);
  } catch {
    return 0;
  }
}

/**
 * Fetch total value managed
 */
export async function fetchTotalValueManaged(): Promise<string> {
  const contracts = getReadContracts();
  if (!contracts) return '0';

  try {
    const tvm = await contracts.registry.totalValueManaged();
    return formatEther(tvm);
  } catch {
    return '0';
  }
}

/**
 * Register a new agent onchain
 */
export async function registerAgentOnchain(
  signer: any,
  name: string,
  strategy: string,
  maxPositionSize: number,
): Promise<{ txHash: string; agentId: string }> {
  const contracts = await getWriteContracts(signer);
  if (!contracts) throw new Error('Contracts not deployed. Please deploy smart contracts first.');

  // Generate a random public key hash
  const publicKeyHash = keccak256(randomBytes(32));

  const tx = await contracts.registry.registerAgent(
    publicKeyHash,
    name,
    strategy,
    parseEther(maxPositionSize.toString()),
  );

  const receipt = await tx.wait();
  console.log('Agent registered! TX:', receipt.hash);

  // Extract agentId from event logs
  let agentId = '';
  for (const log of receipt.logs) {
    try {
      const parsed = contracts.registry.interface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });
      if (parsed && parsed.name === 'AgentRegistered') {
        agentId = parsed.args.agentId;
        break;
      }
    } catch {
      // Not a matching event, continue
    }
  }

  return { txHash: receipt.hash, agentId };
}

/**
 * Deactivate an agent onchain
 */
export async function deactivateAgentOnchain(
  signer: any,
  agentId: string,
): Promise<string> {
  const contracts = await getWriteContracts(signer);
  if (!contracts) throw new Error('Contracts not deployed');

  const tx = await contracts.registry.deactivateAgent(toBytes32(agentId));
  const receipt = await tx.wait();
  return receipt.hash;
}

// ─── Commit-Reveal Functions ───

/**
 * Pad a hex string to bytes32 (64 hex chars).
 * Locally-generated agent IDs may be shorter than 32 bytes.
 */
function toBytes32(hexStr: string): string {
  // Remove 0x prefix if present
  let clean = hexStr.startsWith('0x') ? hexStr.slice(2) : hexStr;
  // Pad with trailing zeros to 64 hex chars (32 bytes)
  clean = clean.padEnd(64, '0');
  // Truncate if somehow longer
  clean = clean.slice(0, 64);
  return '0x' + clean;
}

/**
 * Commit an action hash
 */
export async function commitAction(
  signer: any,
  agentId: string,
  action: string,
  protocol: string,
  amount: number,
): Promise<{ commitId: string; salt: string; txHash: string }> {
  const contracts = await getWriteContracts(signer);
  if (!contracts) throw new Error('Contracts not deployed');

  // Generate random salt
  const salt = hexlify(randomBytes(32));

  // Create hash
  const commitHash = keccak256(
    solidityPacked(
      ['string', 'string', 'uint256', 'bytes32'],
      [action, protocol, parseEther(amount.toString()), salt],
    ),
  );

  const agentIdBytes32 = toBytes32(agentId);
  const tx = await contracts.commitReveal.commit(agentIdBytes32, commitHash);
  const receipt = await tx.wait();

  // Get commitId from event
  let commitId = '';
  for (const log of receipt.logs) {
    try {
      const parsed = contracts.commitReveal.interface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });
      if (parsed && parsed.name === 'ActionCommitted') {
        commitId = parsed.args.commitId;
        break;
      }
    } catch {
      // Not a matching event
    }
  }

  return { commitId, salt, txHash: receipt.hash };
}

/**
 * Reveal a committed action
 */
export async function revealAction(
  signer: any,
  commitId: string,
  action: string,
  protocol: string,
  amount: number,
  salt: string,
): Promise<string> {
  const contracts = await getWriteContracts(signer);
  if (!contracts) throw new Error('Contracts not deployed');

  const tx = await contracts.commitReveal.reveal(
    commitId,
    action,
    protocol,
    parseEther(amount.toString()),
    salt,
  );

  const receipt = await tx.wait();

  // Try to accrue AFI rewards (2 tokens per successful reveal)
  try {
    const signerAddress = await signer.getAddress();
    const rewardTx = await contracts.afiToken.accrueReward(
      signerAddress,
      parseEther('2'),
      `commit-reveal:${action}:${protocol}`,
    );
    await rewardTx.wait();
    console.log('Accrued 2 AFI reward tokens');
  } catch (err) {
    console.warn('Could not accrue reward (may require owner):', err);
  }

  return receipt.hash;
}

/**
 * Check if a commitment can be revealed
 */
export async function canRevealCommitment(commitId: string): Promise<boolean> {
  const contracts = getReadContracts();
  if (!contracts) return false;

  try {
    return await contracts.commitReveal.canReveal(commitId);
  } catch {
    return false;
  }
}

/**
 * Get blocks until reveal is possible
 */
export async function getBlocksUntilReveal(commitId: string): Promise<number> {
  const contracts = getReadContracts();
  if (!contracts) return 0;

  try {
    const blocks = await contracts.commitReveal.blocksUntilReveal(commitId);
    return Number(blocks);
  } catch {
    return 0;
  }
}

/**
 * Fetch commit-reveal stats
 */
export async function fetchCommitRevealStats(): Promise<{ commits: number; reveals: number; executions: number }> {
  const contracts = getReadContracts();
  if (!contracts) return { commits: 0, reveals: 0, executions: 0 };

  try {
    const [commits, reveals, executions] = await contracts.commitReveal.getStats();
    return {
      commits: Number(commits),
      reveals: Number(reveals),
      executions: Number(executions),
    };
  } catch {
    return { commits: 0, reveals: 0, executions: 0 };
  }
}

// ─── AFI Token Functions ───

/**
 * Fetch AFI token balance
 */
export async function fetchAFIBalance(address: string): Promise<string> {
  const contracts = getReadContracts();
  if (!contracts) return '0';

  try {
    const balance = await contracts.afiToken.balanceOf(address);
    return formatEther(balance);
  } catch {
    return '0';
  }
}

/**
 * Fetch claimable AFI rewards
 */
export async function fetchClaimableRewards(address: string): Promise<string> {
  const contracts = getReadContracts();
  if (!contracts) return '0';

  try {
    const claimable = await contracts.afiToken.getClaimable(address);
    return formatEther(claimable);
  } catch {
    return '0';
  }
}

/**
 * Claim AFI rewards
 */
export async function claimRewards(signer: any): Promise<string> {
  const contracts = await getWriteContracts(signer);
  if (!contracts) throw new Error('Contracts not deployed');

  const tx = await contracts.afiToken.claim();
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Fetch real BNB Chain data (no contract needed)
 */
export async function fetchChainData() {
  try {
    const blockNumber = await readProvider.getBlockNumber();
    const gasPrice = await readProvider.getFeeData();

    return {
      blockNumber,
      gasPrice: gasPrice.gasPrice ? formatEther(gasPrice.gasPrice) : '0',
      network: NETWORK_NAME,
      chainId: CHAIN_ID,
    };
  } catch {
    return {
      blockNumber: 0,
      gasPrice: '0',
      network: NETWORK_NAME,
      chainId: CHAIN_ID,
    };
  }
}
