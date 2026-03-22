import { BrowserProvider, formatEther, JsonRpcSigner } from 'ethers';

// ─── Network configuration — MAINNET ONLY ───
export const BNB_CHAIN_CONFIG = {
  chainId: '0x38', // 56 in hex
  chainName: 'BNB Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: [import.meta.env.VITE_BNB_MAINNET_RPC || 'https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com/'],
};

export const TARGET_CHAIN_ID = 56;

// ─── MetaMask-specific provider detection ───

/**
 * Get the MetaMask provider specifically, even when other wallets (Phantom, Coinbase, etc.) are installed.
 * When multiple wallets inject into window.ethereum, they stack providers in window.ethereum.providers.
 * This function finds the real MetaMask provider.
 */
function getMetaMaskProvider(): any | null {
  if (typeof window === 'undefined' || !window.ethereum) return null;

  // Case 1: Multiple providers installed (MetaMask + Phantom, etc.)
  // They get listed in window.ethereum.providers array
  if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
    const metamask = window.ethereum.providers.find(
      (p: any) => p.isMetaMask && !p.isPhantom && !p.isBraveWallet
    );
    if (metamask) return metamask;
  }

  // Case 2: Only MetaMask installed — window.ethereum IS MetaMask
  if (window.ethereum.isMetaMask && !window.ethereum.isPhantom) {
    return window.ethereum;
  }

  // Case 3: Fallback — use whatever is available
  return window.ethereum;
}

export interface WalletConnectionResult {
  address: string;
  chainId: number;
  signer: JsonRpcSigner;
  provider: BrowserProvider;
  balance: string;
}

/**
 * Check if MetaMask is available
 */
export function isWalletAvailable(): boolean {
  return getMetaMaskProvider() !== null;
}

/**
 * Connect to MetaMask specifically
 */
export async function connectWallet(): Promise<WalletConnectionResult> {
  const ethereum = getMetaMaskProvider();
  if (!ethereum) {
    throw new Error('MetaMask not detected. Please install MetaMask.');
  }

  try {
    // This triggers the MetaMask popup for approval
    const accounts: string[] = await ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock MetaMask.');
    }

    const address = accounts[0];

    const chainIdHex: string = await ethereum.request({
      method: 'eth_chainId',
    });
    const chainId = parseInt(chainIdHex, 16);

    const balanceHex: string = await ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });
    const balance = formatEther(BigInt(balanceHex));

    const provider = new BrowserProvider(ethereum);
    const signer = await provider.getSigner();

    return {
      address,
      chainId,
      signer,
      provider,
      balance: parseFloat(balance).toFixed(4),
    };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('Connection rejected. Please approve the connection in MetaMask.');
    }
    if (error.code === -32002) {
      throw new Error('MetaMask is already processing a request. Please check MetaMask and try again.');
    }
    throw new Error(error.message || 'Failed to connect wallet.');
  }
}

/**
 * Switch to BNB Smart Chain Mainnet
 */
export async function switchToBNBChain(): Promise<void> {
  const ethereum = getMetaMaskProvider();
  if (!ethereum) throw new Error('MetaMask not detected.');

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BNB_CHAIN_CONFIG.chainId }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [BNB_CHAIN_CONFIG],
        });
      } catch {
        throw new Error('Failed to add BNB Chain to MetaMask.');
      }
    } else if (switchError.code === 4001) {
      throw new Error('Chain switch rejected by user.');
    } else {
      throw new Error('Failed to switch to BNB Chain.');
    }
  }
}

/**
 * Sign an authentication challenge message
 */
export async function signAuthChallenge(signer: JsonRpcSigner): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.random().toString(36).substring(2, 10);
  const message = `AgentFi Authentication\n\nTimestamp: ${timestamp}\nNonce: ${nonce}\n\nSign this message to verify ownership of your wallet. This does not cost any gas.`;

  try {
    const signature = await signer.signMessage(message);
    return signature;
  } catch (error: any) {
    if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
      throw new Error('Signature rejected by user.');
    }
    throw new Error('Failed to sign authentication challenge.');
  }
}

/**
 * Truncate an address for display: 0x1234...5678
 */
export function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get explorer URL (always mainnet bscscan)
 */
export function getExplorerUrl(hashOrAddress: string, type: 'tx' | 'address' = 'address'): string {
  return `https://bscscan.com/${type}/${hashOrAddress}`;
}

/**
 * Listen for wallet events (account change, chain change, disconnect)
 */
export function setupWalletListeners(
  onAccountChange: (accounts: string[]) => void,
  onChainChange: (chainId: string) => void,
  onDisconnect: () => void,
): () => void {
  const ethereum = getMetaMaskProvider();
  if (!ethereum) return () => {};

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      onDisconnect();
    } else {
      onAccountChange(accounts);
    }
  };

  const handleChainChanged = (chainId: string) => {
    onChainChange(chainId);
  };

  ethereum.on('accountsChanged', handleAccountsChanged);
  ethereum.on('chainChanged', handleChainChanged);

  return () => {
    ethereum.removeListener('accountsChanged', handleAccountsChanged);
    ethereum.removeListener('chainChanged', handleChainChanged);
  };
}

/**
 * Check if MetaMask already has authorized accounts (silent, no popup)
 */
export async function checkExistingConnection(): Promise<string | null> {
  const ethereum = getMetaMaskProvider();
  if (!ethereum) return null;

  try {
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    if (accounts && accounts.length > 0) {
      return accounts[0];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get MetaMask provider for direct RPC calls (used by stores)
 */
export function getEthereumProvider(): any | null {
  return getMetaMaskProvider();
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum: any;
  }
}
