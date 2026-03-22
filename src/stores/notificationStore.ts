import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'register' | 'commit' | 'reveal' | 'claim' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  txHash?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const STORAGE_KEY = 'agentfi_notifications';

function loadFromStorage(): Notification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveToStorage(notifications: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Storage full or unavailable
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: loadFromStorage(),
  unreadCount: loadFromStorage().filter(n => !n.read).length,

  addNotification: (notif) => {
    const newNotif: Notification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    const updated = [newNotif, ...get().notifications].slice(0, 50); // Keep max 50
    saveToStorage(updated);
    set({ notifications: updated, unreadCount: updated.filter(n => !n.read).length });
  },

  markAllRead: () => {
    const updated = get().notifications.map(n => ({ ...n, read: true }));
    saveToStorage(updated);
    set({ notifications: updated, unreadCount: 0 });
  },

  clearAll: () => {
    saveToStorage([]);
    set({ notifications: [], unreadCount: 0 });
  },
}));
