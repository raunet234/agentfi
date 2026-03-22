import { create } from 'zustand';

const WALLET_CONNECTED_KEY = 'agentfi_wallet_connected';
const WALLET_ADDRESS_KEY = 'agentfi_wallet_address';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import {
  connectWallet,
  switchToBNBChain,
  signAuthChallenge,
  setupWalletListeners,
  checkExistingConnection,
  truncateAddress,
} from '../data/wallet';

/* --- Wallet Store --- */
interface WalletState {
  address: string;
  displayAddress: string;
  chainId: number;
  balance: string;
  connected: boolean;
  authenticated: boolean;
  signer: JsonRpcSigner | null;
  provider: BrowserProvider | null;
  loading: boolean;
  error: string | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  authenticate: () => Promise<string>;
  switchChain: () => Promise<void>;
  checkConnection: () => Promise<void>;
  clearError: () => void;
  ensureSigner: () => Promise<JsonRpcSigner>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: '',
  displayAddress: '',
  chainId: 0,
  balance: '0',
  connected: false,
  authenticated: false,
  signer: null,
  provider: null,
  loading: false,
  error: null,

  connect: async () => {
    // Prevent double-connect
    if (get().loading) return;

    set({ loading: true, error: null });
    try {
      // Add a timeout so it doesn't hang forever
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Please check MetaMask and try again.')), 30000)
      );

      const result = await Promise.race([connectWallet(), timeoutPromise]);

      set({
        address: result.address,
        displayAddress: truncateAddress(result.address),
        chainId: result.chainId,
        balance: result.balance,
        connected: true,
        signer: result.signer,
        provider: result.provider,
        loading: false,
      });

      // Persist connection state so we can auto-reconnect on refresh
      try {
        localStorage.setItem(WALLET_CONNECTED_KEY, 'true');
        localStorage.setItem(WALLET_ADDRESS_KEY, result.address);
      } catch { /* storage unavailable */ }

      // Setup event listeners for account/chain changes
      setupWalletListeners(
        async (accounts) => {
          if (accounts.length > 0) {
            // Update address and balance without re-triggering MetaMask popup
            const address = accounts[0];
            set({
              address,
              displayAddress: truncateAddress(address),
              authenticated: false, // Require re-auth on account change
            });
            // Try to refresh balance silently
            try {
              const result = await connectWallet();
              set({
                balance: result.balance,
                chainId: result.chainId,
                signer: result.signer,
                provider: result.provider,
              });
            } catch {
              // Silent fail - at least address is updated
            }
          }
        },
        (chainIdHex) => {
          const newChainId = parseInt(chainIdHex, 16);
          set({ chainId: newChainId });
        },
        () => {
          get().disconnect();
        },
      );
    } catch (error: any) {
      set({
        loading: false,
        error: error.message || 'Failed to connect wallet',
      });
      throw error;
    }
  },

  disconnect: () => {
    set({
      address: '',
      displayAddress: '',
      chainId: 0,
      balance: '0',
      connected: false,
      authenticated: false,
      signer: null,
      provider: null,
      loading: false,
      error: null,
    });

    // Clear persisted connection state
    try {
      localStorage.removeItem(WALLET_CONNECTED_KEY);
      localStorage.removeItem(WALLET_ADDRESS_KEY);
    } catch { /* storage unavailable */ }
  },

  authenticate: async () => {
    const { signer } = get();
    if (!signer) throw new Error('Wallet not connected');

    set({ loading: true, error: null });
    try {
      const signature = await signAuthChallenge(signer);
      set({ authenticated: true, loading: false });
      return signature;
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  switchChain: async () => {
    set({ loading: true, error: null });
    try {
      await switchToBNBChain();
      // Re-connect after chain switch
      const result = await connectWallet();
      set({
        chainId: result.chainId,
        balance: result.balance,
        signer: result.signer,
        provider: result.provider,
        loading: false,
      });
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  checkConnection: async () => {
    // First check if we previously had a connection (persisted in localStorage)
    const wasConnected = localStorage.getItem(WALLET_CONNECTED_KEY) === 'true';
    const existing = await checkExistingConnection();
    if (existing || wasConnected) {
      try {
        await get().connect();
      } catch {
        // If auto-reconnect fails, clear the persisted state
        try {
          localStorage.removeItem(WALLET_CONNECTED_KEY);
          localStorage.removeItem(WALLET_ADDRESS_KEY);
        } catch { /* storage unavailable */ }
      }
    }
  },

  clearError: () => set({ error: null }),

  ensureSigner: async () => {
    let { signer } = get();
    if (signer) return signer;
    // Try to reconnect
    await get().connect();
    signer = get().signer;
    if (!signer) throw new Error('No signer available. Please connect your wallet.');
    return signer;
  },
}));

/* --- Agent Store --- */
interface AgentState {
  selectedAgentId: string | null;
  selectAgent: (id: string) => void;
}

const SELECTED_AGENT_KEY = 'agentfi_selected_agent';

export const useAgentStore = create<AgentState>((set) => ({
  selectedAgentId: (() => {
    try { return localStorage.getItem(SELECTED_AGENT_KEY); } catch { return null; }
  })(),
  selectAgent: (id) => {
    try { localStorage.setItem(SELECTED_AGENT_KEY, id); } catch { /* */ }
    set({ selectedAgentId: id });
  },
}));
