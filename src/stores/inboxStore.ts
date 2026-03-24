import { create } from 'zustand';

interface InboxMessage {
  id: string;
  sender: {
    name: string;
    avatar?: string;
    initials: string;
    phone?: string;
  };
  platform: 'whatsapp' | 'linkedin' | 'email' | 'signal' | 'outlook' | 'gmail' | 'telegram' | 'instagram';
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
  setMessages: (messagesOrFn: InboxMessage[] | ((prev: InboxMessage[]) => InboxMessage[])) => void;
  addMessages: (messages: InboxMessage[]) => void;
  setLoading: (loading: boolean) => void;
  markFetched: () => void;
  shouldRefetch: () => boolean;
  markAsRead: (id: string) => void;
  updateOrAddMessage: (platform: InboxMessage['platform'], chatId: string, contactName: string, preview: string, timestamp: Date, avatar?: string) => void;
  reset: () => void;  // Clear all data on logout
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const useInboxStore = create<InboxState>()((set, get) => ({
  messages: [],
  lastFetched: null,
  isLoading: false,

  setMessages: (messagesOrFn) => set((state) => ({
    messages: typeof messagesOrFn === 'function' ? messagesOrFn(state.messages) : messagesOrFn
  })),

  addMessages: (newMessages) => set((state) => {
    const existingIds = new Set(state.messages.map(m => m.id));
    const filtered = newMessages.filter(m => !existingIds.has(m.id));

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

  markAsRead: (id) => set((state) => ({
    messages: state.messages.map((m) =>
      m.id === id ? { ...m, unread: false } : m
    ),
  })),

  /**
   * Update an existing chat with new message preview, or add as new.
   * Used for real-time WebSocket or progressive sync updates.
   */
  updateOrAddMessage: (
    platform: InboxMessage['platform'],
    chatId: string,
    contactName: string,
    preview: string,
    timestamp: Date,
    avatar?: string
  ) => set((state) => {
    const platformPrefix = platform === 'whatsapp' ? 'wa-chat-' : `${platform}-`;
    const fullId = chatId.startsWith(platformPrefix) ? chatId : `${platformPrefix}${chatId}`;

    const existingIndex = state.messages.findIndex(m => m.id === fullId);

    const updatedMessages = [...state.messages];

    if (existingIndex >= 0) {
      // Update existing message
      updatedMessages[existingIndex] = {
        ...updatedMessages[existingIndex],
        preview,
        timestamp: timestamp.toLocaleDateString(), // UI might override this with formatGmailDate
        sortDate: timestamp,
        unread: true,
      };
    } else {
      // Add new message
      const initials = (contactName?.[0] || platform[0] || '?').toUpperCase();
      const newMessage: InboxMessage = {
        id: fullId,
        sender: {
          name: contactName || `${platform} User`,
          initials,
          avatar,
        },
        platform,
        preview,
        timestamp: timestamp.toLocaleDateString(),
        sortDate: timestamp,
        roomId: chatId,
        unread: true,
      };
      updatedMessages.push(newMessage);
    }

    // Re-sort by date
    updatedMessages.sort((a, b) => {
      const dateA = a.sortDate ? new Date(a.sortDate).getTime() : 0;
      const dateB = b.sortDate ? new Date(b.sortDate).getTime() : 0;
      return dateB - dateA;
    });

    return { messages: updatedMessages };
  }),

  // Reset store - call on logout to clear previous user's data
  reset: () => set({
    messages: [],
    lastFetched: null,
    isLoading: false
  }),
}));

export type { InboxMessage };
