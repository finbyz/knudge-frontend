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
  normalizedPhone?: string;
  identityKey?: string;
  isGroup?: boolean;
  email_direction?: 'INCOMING' | 'OUTGOING' | string;
  email_status?: string;
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
  markAsRead: (id: string, roomId?: string, normalizedPhone?: string, identityKey?: string) => void;
  updateOrAddMessage: (
    platform: InboxMessage['platform'],
    chatId: string,
    contactName: string,
    preview: string,
    timestamp: Date,
    avatar?: string,
    normalizedPhone?: string,
    identityKey?: string
  ) => void;
  reset: () => void;  // Clear all data on logout
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

// ── localStorage-backed read-ID persistence ──────────────────────────
const READ_IDS_KEY = 'knudge-read-inbox-ids';
const MAX_READ_IDS = 500;

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveReadIds(ids: Set<string>) {
  try {
    const arr = [...ids].slice(-MAX_READ_IDS);
    localStorage.setItem(READ_IDS_KEY, JSON.stringify(arr));
  } catch { /* silent */ }
}

function isMessageRead(m: InboxMessage, readIds: Set<string>): boolean {
  if (readIds.has(m.id)) return true;
  if (m.roomId && readIds.has(`room:${m.roomId}`)) return true;
  if (m.normalizedPhone && readIds.has(`phone:${m.normalizedPhone}`)) return true;
  if (m.identityKey && readIds.has(`key:${m.identityKey}`)) return true;
  return false;
}

function applyReadState(messages: InboxMessage[]): InboxMessage[] {
  const readIds = getReadIds();
  if (readIds.size === 0) return messages;
  return messages.map(m =>
    isMessageRead(m, readIds) ? { ...m, unread: false, unreadCount: 0 } : m
  );
}

function persistReadKeys(id: string, roomId?: string, normalizedPhone?: string, identityKey?: string) {
  const readIds = getReadIds();
  readIds.add(id);
  if (roomId) readIds.add(`room:${roomId}`);
  if (normalizedPhone) readIds.add(`phone:${normalizedPhone}`);
  if (identityKey) readIds.add(`key:${identityKey}`);
  saveReadIds(readIds);
}
// ─────────────────────────────────────────────────────────────────────

export const useInboxStore = create<InboxState>()((set, get) => ({
  messages: [],
  lastFetched: null,
  isLoading: false,

  setMessages: (messagesOrFn) => set((state) => {
    const newMessages = typeof messagesOrFn === 'function' ? messagesOrFn(state.messages) : messagesOrFn;
    return { messages: applyReadState(newMessages) };
  }),

  addMessages: (newMessages) => set((state) => {
    const existingIds = new Set(state.messages.map(m => m.id));
    const filtered = newMessages.filter(m => !existingIds.has(m.id));

    const combined = [...filtered, ...state.messages];
    combined.sort((a, b) => {
      const dateA = a.sortDate ? new Date(a.sortDate).getTime() : 0;
      const dateB = b.sortDate ? new Date(b.sortDate).getTime() : 0;
      return dateB - dateA;
    });
    return { messages: applyReadState(combined) };
  }),

  setLoading: (isLoading) => set({ isLoading }),

  markFetched: () => set({ lastFetched: Date.now() }),

  shouldRefetch: () => {
    const { lastFetched } = get();
    if (!lastFetched) return true;
    return Date.now() - lastFetched > CACHE_DURATION;
  },

  markAsRead: (id, roomId?, normalizedPhone?, identityKey?) => {
    // Persist to localStorage so read state survives page refreshes
    persistReadKeys(id, roomId, normalizedPhone, identityKey);

    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id === id) return { ...m, unread: false, unreadCount: 0 };
        if (m.platform === 'whatsapp') {
          if (identityKey && m.identityKey === identityKey) return { ...m, unread: false, unreadCount: 0 };
          if (normalizedPhone && m.normalizedPhone === normalizedPhone) return { ...m, unread: false, unreadCount: 0 };
          if (roomId && m.roomId === roomId) return { ...m, unread: false, unreadCount: 0 };
        }
        return m;
      }),
    }));
  },

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
    avatar?: string,
    normalizedPhone?: string,
    identityKey?: string
  ) => set((state) => {
    const platformPrefix = platform === 'whatsapp' ? 'wa-chat-' : `${platform}-`;
    const fullId = chatId.startsWith(platformPrefix) ? chatId : `${platformPrefix}${chatId}`;

    // 🏆 PERMANENT FIX: Deduplication strategy
    // Try to find by identityKey first, then normalizedPhone, then fullId
    const existingIndex = state.messages.findIndex(m => {
      if (m.platform !== platform) return false;

      // WhatsApp specific robust matching
      if (platform === 'whatsapp') {
        if (identityKey && m.identityKey === identityKey) return true;
        if (normalizedPhone && m.normalizedPhone === normalizedPhone) return true;
        // Fallback to room ID match
        if (m.roomId === chatId) return true;
      }

      return m.id === fullId;
    });

    const updatedMessages = [...state.messages];

    if (existingIndex >= 0) {
      // Update existing message
      updatedMessages[existingIndex] = {
        ...updatedMessages[existingIndex],
        preview,
        timestamp: timestamp.toLocaleDateString(),
        sortDate: timestamp,
        unread: true,
        roomId: chatId, // Update last known room ID (could switch RID->LID)
        normalizedPhone: normalizedPhone || updatedMessages[existingIndex].normalizedPhone,
        identityKey: identityKey || updatedMessages[existingIndex].identityKey,
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
        normalizedPhone,
        identityKey,
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
  reset: () => {
    try { localStorage.removeItem(READ_IDS_KEY); } catch { /* silent */ }
    set({
      messages: [],
      lastFetched: null,
      isLoading: false
    });
  },
}));

export type { InboxMessage };
