import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UnreadState {
  unreadInbox: number;
  unreadFeed: number;
  setUnreadInbox: (count: number) => void;
  setUnreadFeed: (count: number) => void;
  clearUnreadInbox: () => void;
  clearUnreadFeed: () => void;
}

export const useUnreadStore = create<UnreadState>()(
  persist(
    (set) => ({
      unreadInbox: 4, // Initial unread count
      unreadFeed: 3, // Initial unread count
      setUnreadInbox: (count) => set({ unreadInbox: count }),
      setUnreadFeed: (count) => set({ unreadFeed: count }),
      clearUnreadInbox: () => set({ unreadInbox: 0 }),
      clearUnreadFeed: () => set({ unreadFeed: 0 }),
    }),
    {
      name: 'knudge-unread-storage',
    }
  )
);
