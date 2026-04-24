import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/stores/authStore';
import { API_BASE_URL, getEffectiveAccessToken } from '@/lib/api-client';

interface InboxMessage {
  id: string;
  sender: {
    name: string;
    avatar?: string;
    initials: string;
    phone?: string;
  };
  platform: 'whatsapp' | 'linkedin' | 'email' | 'signal' | 'outlook' | 'gmail' | 'telegram' | 'instagram' | 'erpnext';
  contactId?: string;
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

interface Contact {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  platform: InboxMessage['platform'];
  phone?: string;
  email?: string;
  canonicalId?: string;
}

/** Server-derived tab counts (same merge pipeline as GET /inbox/). */
export type InboxTabMetaBlock = {
  total_threads: number;
  unread_threads_total: number;
  platform_counts: Record<string, number>;
  unread_threads_by_platform: Record<string, number>;
};

export type InboxTabsMeta = Record<string, InboxTabMetaBlock>;

let inboxTabsRefreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced fetch of `/inbox/tabs` so badges stay aligned after realtime or read. */
export function scheduleInboxTabsMetaRefresh() {
  if (inboxTabsRefreshTimer) clearTimeout(inboxTabsRefreshTimer);
  inboxTabsRefreshTimer = setTimeout(async () => {
    inboxTabsRefreshTimer = null;
    try {
      const token = getEffectiveAccessToken();
      if (!token) return;
      const r = await fetch(`${API_BASE_URL}/inbox/tabs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return;
      const j = await r.json();
      const tm = j.tabs_meta as InboxTabsMeta | null;
      if (tm && Object.keys(tm).length) {
        useInboxStore.setState({ tabsMeta: tm });
      }
    } catch {
      /* silent */
    }
  }, 400);
}

interface InboxState {
  // State
  messages: InboxMessage[];
  /** When set, tab badges use these counts so they match the merged thread list. */
  tabsMeta: InboxTabsMeta | null;
  contacts: Record<string, Contact>;
  lastFetched: number | null;
  isLoading: boolean;
  error: string | null;
  selectedPlatform: string;

  // Actions
  setMessages: (messagesOrFn: InboxMessage[] | ((prev: InboxMessage[]) => InboxMessage[])) => void;
  setInboxFromServer: (messages: InboxMessage[], tabsMeta: InboxTabsMeta | null) => void;
  addMessages: (messages: InboxMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markFetched: () => void;
  shouldRefetch: () => boolean;
  markAsRead: (id: string, roomId?: string, normalizedPhone?: string, identityKey?: string) => Promise<void>;
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
  archiveMessage: (id: string) => void;
  toggleReadUnread: (id: string) => void;
  upsertContact: (contact: Contact) => void;
  setSelectedPlatform: (platform: string) => void;
  reset: () => void;
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
  tabsMeta: null,
  contacts: {},
  lastFetched: null,
  isLoading: false,
  error: null,
  selectedPlatform: 'all',

  setMessages: (messagesOrFn) => set((state) => {
    const newMessages = typeof messagesOrFn === 'function' ? messagesOrFn(state.messages) : messagesOrFn;
    return { messages: applyReadState(newMessages), tabsMeta: state.tabsMeta };
  }),

  setInboxFromServer: (messages, tabsMeta) =>
    set({
      messages: applyReadState(messages),
      tabsMeta: tabsMeta && Object.keys(tabsMeta).length ? tabsMeta : null,
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
    return { messages: applyReadState(combined), tabsMeta: state.tabsMeta };
  }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  markFetched: () => set({ lastFetched: Date.now() }),

  shouldRefetch: () => {
    const { lastFetched } = get();
    if (!lastFetched) return true;
    return Date.now() - lastFetched > CACHE_DURATION;
  },

  markAsRead: async (id, roomId?, normalizedPhone?, identityKey?) => {
    persistReadKeys(id, roomId, normalizedPhone, identityKey);

    const { messages } = get();
    let hasChanges = false;
    let targetMessage = null;

    const newMessages = messages.map((m) => {
      let isTarget = false;
      if (m.id === id) isTarget = true;
      else if (m.platform === 'whatsapp') {
        if (identityKey && m.identityKey === identityKey) isTarget = true;
        if (normalizedPhone && m.normalizedPhone === normalizedPhone) isTarget = true;
        if (roomId && m.roomId === roomId) isTarget = true;
      } else if (m.platform === 'linkedin' && roomId && m.roomId === roomId) {
        isTarget = true;
      }

      if (isTarget) {
        targetMessage = m;
        if (m.unread) {
          hasChanges = true;
          return { ...m, unread: false, unreadCount: 0 };
        }
      }
      return m;
    });

    if (hasChanges) {
      set({ messages: newMessages });
    }

    // Sync with backend for emails
    if (targetMessage && ['email', 'outlook', 'gmail'].includes((targetMessage as any).platform)) {
      try {
        const token = getEffectiveAccessToken();
        const emailId = id.startsWith('email-') ? id.replace('email-', '') : id;
        if (!token) return;

        await fetch(`${API_BASE_URL}/emails/${emailId}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error('Failed to sync mark-as-read with backend:', err);
      }
    }
    scheduleInboxTabsMetaRefresh();
  },

  updateOrAddMessage: (
    platform,
    chatId,
    contactName,
    preview,
    timestamp,
    avatar,
    normalizedPhone,
    identityKey
  ) => set((state) => {
    const getPlatformPrefix = (p: InboxMessage['platform']) => {
      if (p === 'whatsapp') return 'wa-chat-';
      if (p === 'linkedin') return 'li-chat-';
      if (p === 'instagram') return 'ig-chat-';
      return `${p}-`;
    };
    const platformPrefix = getPlatformPrefix(platform);
    const fullId = chatId.startsWith(platformPrefix) ? chatId : `${platformPrefix}${chatId}`;

    const existingIndex = state.messages.findIndex(m => {
      if (m.platform !== platform) return false;
      if (platform === 'whatsapp') {
        if (identityKey && m.identityKey === identityKey) return true;
        if (normalizedPhone && m.normalizedPhone === normalizedPhone) return true;
        if (m.roomId === chatId) return true;
      }
      return m.id === fullId;
    });

    const updatedMessages = [...state.messages];

    if (existingIndex >= 0) {
      const prevU = updatedMessages[existingIndex].unreadCount || 0;
      updatedMessages[existingIndex] = {
        ...updatedMessages[existingIndex],
        preview,
        timestamp: timestamp.toLocaleDateString(),
        sortDate: timestamp,
        unread: true,
        unreadCount: prevU + 1,
        roomId: chatId,
        normalizedPhone: normalizedPhone || updatedMessages[existingIndex].normalizedPhone,
        identityKey: identityKey || updatedMessages[existingIndex].identityKey,
      };
    } else {
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
        unreadCount: 1,
      };
      updatedMessages.push(newMessage);
    }

    updatedMessages.sort((a, b) => {
      const dateA = a.sortDate ? new Date(a.sortDate).getTime() : 0;
      const dateB = b.sortDate ? new Date(b.sortDate).getTime() : 0;
      return dateB - dateA;
    });

    scheduleInboxTabsMetaRefresh();
    return { messages: updatedMessages };
  }),

  archiveMessage: (id) => {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    }));
  },

  toggleReadUnread: (id) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, unread: !m.unread, unreadCount: m.unread ? 0 : 1 } : m
      ),
    }));
  },

  upsertContact: (contact) => set((state) => ({
    contacts: { ...state.contacts, [contact.id]: contact }
  })),
  
  setSelectedPlatform: (selectedPlatform) => set({ selectedPlatform }),

  reset: () => {
    try { localStorage.removeItem(READ_IDS_KEY); } catch { /* silent */ }
    set({
      messages: [],
      tabsMeta: null,
      contacts: {},
      lastFetched: null,
      isLoading: false,
      error: null
    });
  },
}));

// Export helper for shallow selection
export { useShallow };

export type { InboxMessage, Contact, InboxTabsMeta, InboxTabMetaBlock };

