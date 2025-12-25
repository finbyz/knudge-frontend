import { create } from 'zustand';

interface InboxMessage {
  id: string;
  sender: {
    name: string;
    avatar?: string;
    initials: string;
  };
  platform: 'whatsapp' | 'linkedin' | 'email' | 'signal' | 'outlook' | 'gmail';
  subject?: string;
  preview: string;
  timestamp: string;
  sortDate?: Date;
  roomId?: string;
  unread: boolean;
  unreadCount?: number;
}

interface InboxState {
  messages: InboxMessage[];
  lastFetched: number | null;
  isLoading: boolean;

  // Actions
  setMessages: (messages: InboxMessage[]) => void;
  addMessages: (messages: InboxMessage[]) => void;
  setLoading: (loading: boolean) => void;
  markFetched: () => void;
  shouldRefetch: () => boolean;
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const useInboxStore = create<InboxState>()((set, get) => ({
  messages: [],
  lastFetched: null,
  isLoading: false,

  setMessages: (messages) => set({ messages }),

  addMessages: (newMessages) => set((state) => {
    const existingIds = new Set(state.messages.map(m => m.id));
    const filtered = newMessages.filter(m => !existingIds.has(m.id));
    // Sort by sortDate, newest first
    const combined = [...filtered, ...state.messages];
    combined.sort((a, b) => {
      const dateA = a.sortDate ? new Date(a.sortDate).getTime() : 0;
      const dateB = b.sortDate ? new Date(b.sortDate).getTime() : 0;
      return dateB - dateA;
    });
    return { messages: combined };
  }),

  setLoading: (isLoading) => set({ isLoading }),

  markFetched: () => set({ lastFetched: Date.now() }),

  shouldRefetch: () => {
    const { lastFetched } = get();
    if (!lastFetched) return true;
    return Date.now() - lastFetched > CACHE_DURATION;
  },
}));

export type { InboxMessage };
