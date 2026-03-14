import { create } from 'zustand';

export interface RegisteredAgent {
  id: string;
  name: string;
  strategy: string;
  maxPositionSize: number;
  autoCompound: boolean;
  ownerAddress: string;
  publicKey: string;
  status: 'active' | 'idle';
  reputation: number;
  earnings: number;
  actionsCount: number;
  createdAt: string;
}

interface AgentRegistryState {
  agents: RegisteredAgent[];
  loadAgents: () => void;
  addAgent: (agent: Omit<RegisteredAgent, 'id' | 'createdAt' | 'status' | 'reputation' | 'earnings' | 'actionsCount'>) => RegisteredAgent;
  removeAgent: (id: string) => void;
  getAgentsByOwner: (ownerAddress: string) => RegisteredAgent[];
}

const STORAGE_KEY = 'agentfi_registered_agents';

function loadFromStorage(): RegisteredAgent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveToStorage(agents: RegisteredAgent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
  } catch {
    // Storage full or unavailable
  }
}

export const useAgentRegistry = create<AgentRegistryState>((set, get) => ({
  agents: loadFromStorage(),

  loadAgents: () => {
    set({ agents: loadFromStorage() });
  },

  addAgent: (agentData) => {
    const id = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    const newAgent: RegisteredAgent = {
      ...agentData,
      id,
      status: 'active',
      reputation: 0,
      earnings: 0,
      actionsCount: 0,
      createdAt: new Date().toISOString(),
    };

    const updated = [...get().agents, newAgent];
    saveToStorage(updated);
    set({ agents: updated });
    return newAgent;
  },

  removeAgent: (id) => {
    const updated = get().agents.filter(a => a.id !== id);
    saveToStorage(updated);
    set({ agents: updated });
  },

  getAgentsByOwner: (ownerAddress) => {
    return get().agents.filter(a => a.ownerAddress.toLowerCase() === ownerAddress.toLowerCase());
  },
}));
