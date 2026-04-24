import { create } from 'zustand';
import { remindersApi, ReminderData } from '@/api/reminders';
import { useAuthStore } from '@/stores/authStore';
import { API_HOST_URL, getEffectiveAccessToken } from '@/lib/api-client';

export interface AppNotification {
  id: string;
  type: 'reminder' | 'feed' | 'connects' | 'message';
  title: string;
  description: string;
  timestamp: string;
  isNew: boolean;
  contactId?: string | null;
  reminderId?: string;
}

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  pollingInterval: ReturnType<typeof setInterval> | null;
  permissionGranted: boolean;
  wsConnection: WebSocket | null;

  // Actions
  startPolling: () => void;
  stopPolling: () => void;
  pollPendingReminders: () => Promise<void>;
  loadFiredReminders: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  dismissAll: () => Promise<void>;
  requestBrowserPermission: () => Promise<void>;
  playNotificationSound: () => void;
  showBrowserNotification: (title: string, body: string) => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}

// Synthesize a pleasant notification chime using Web Audio API
function playChimeSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    // Create a pleasant two-tone chime
    const frequencies = [830, 1050]; // E5, C6 — a pleasant major third
    const durations = [0.15, 0.25];

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);

      const startTime = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + durations[i]);

      osc.start(startTime);
      osc.stop(startTime + durations[i]);
    });

    // Clean up after sound finishes
    setTimeout(() => ctx.close(), 1000);
  } catch (e) {
    console.warn('Could not play notification sound:', e);
  }
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  pollingInterval: null,
  permissionGranted: typeof Notification !== 'undefined' && Notification.permission === 'granted',
  wsConnection: null,

  startPolling: () => {
    const state = get();
    // Don't double-start


    // Request browser notification permission
    get().requestBrowserPermission();

    // Initial load of already-fired reminders (for notification panel)
    get().loadFiredReminders();

    // Poll every 15 seconds for newly due reminders
    const interval = setInterval(() => {
      get().pollPendingReminders();
    }, 3000);

    // Also do an immediate poll
    get().pollPendingReminders();

    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const state = get();
    if (state.pollingInterval) {
      clearInterval(state.pollingInterval);
      set({ pollingInterval: null });
    }
  },

  pollPendingReminders: async () => {
    try {
      const response = await remindersApi.getPending();
      if (response.success && response.reminders.length > 0) {
        const newNotifications: AppNotification[] = response.reminders.map((r: ReminderData) => ({
          id: r.id,
          type: 'reminder' as const,
          title: `Reminder: ${r.contact_name || 'Follow-up'}`,
          description: r.note || `Time to follow up${r.contact_name ? ` with ${r.contact_name}` : ''}`,
          timestamp: r.remind_at,
          isNew: true,
          contactId: r.contact_id,
          reminderId: r.id,
        }));

        set((state) => {
          // Don't add duplicates
          const existingIds = new Set(state.notifications.map(n => n.id));
          const unique = newNotifications.filter(n => !existingIds.has(n.id));

          if (unique.length > 0) {
            // Play sound and show browser notification for each new one
            get().playNotificationSound();
            unique.forEach(n => {
              get().showBrowserNotification(n.title, n.description);
            });
          }

          const allNotifications = [...unique, ...state.notifications];
          return {
            notifications: allNotifications,
            unreadCount: allNotifications.filter(n => n.isNew).length,
          };
        });
      }
    } catch (e) {
      // Silently fail — will retry next poll
      console.debug('Reminder poll failed:', e);
    }
  },

  loadFiredReminders: async () => {
    try {
      const response = await remindersApi.getNotifications();
      if (response.success) {
        const notifications: AppNotification[] = response.reminders.map((r: ReminderData) => ({
          id: r.id,
          type: 'reminder' as const,
          title: `Reminder: ${r.contact_name || 'Follow-up'}`,
          description: r.note || `Time to follow up${r.contact_name ? ` with ${r.contact_name}` : ''}`,
          timestamp: r.remind_at,
          isNew: true,
          contactId: r.contact_id,
          reminderId: r.id,
        }));

        set({
          notifications,
          unreadCount: notifications.length,
        });
      }
    } catch (e) {
      console.debug('Failed to load fired reminders:', e);
    }
  },

  dismissNotification: async (id: string) => {
    try {
      await remindersApi.dismiss(id);
      set((state) => {
        const updated = state.notifications.filter(n => n.id !== id);
        return {
          notifications: updated,
          unreadCount: updated.filter(n => n.isNew).length,
        };
      });
    } catch (e) {
      console.error('Failed to dismiss notification:', e);
    }
  },

  dismissAll: async () => {
    try {
      await remindersApi.dismissAll();
      set({
        notifications: [],
        unreadCount: 0,
      });
    } catch (e) {
      console.error('Failed to dismiss all notifications:', e);
    }
  },

  requestBrowserPermission: async () => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      set({ permissionGranted: true });
      return;
    }
    if (Notification.permission === 'denied') return;

    try {
      const permission = await Notification.requestPermission();
      set({ permissionGranted: permission === 'granted' });
    } catch (e) {
      console.warn('Browser notification permission request failed:', e);
    }
  },

  playNotificationSound: () => {
    playChimeSound();
  },

  showBrowserNotification: (title: string, body: string) => {
    const state = get();
    if (!state.permissionGranted) return;
    if (typeof Notification === 'undefined') return;

    try {
      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `knudge-reminder-${Date.now()}`,
        requireInteraction: false,
      });

      // Auto-close after 8 seconds
      setTimeout(() => notif.close(), 8000);

      // Focus the window when clicked
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      console.warn('Failed to show browser notification:', e);
    }
  },

  connectWebSocket: () => {
    const user = useAuthStore.getState().user;
    const token = getEffectiveAccessToken();
    if (!user || !token) return;

    // Already connected check
    const existing = get().wsConnection;
    if (existing && existing.readyState === WebSocket.OPEN) return;

    const custom = import.meta.env.VITE_WS_NOTIFICATIONS_URL as string | undefined;
    let wsUrl: string;
    if (custom) {
      wsUrl = custom.includes('?')
        ? `${custom}&token=${encodeURIComponent(token)}`
        : `${custom}?token=${encodeURIComponent(token)}`;
    } else {
      const host = (API_HOST_URL || '')
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');
      const h = host || (typeof window !== 'undefined' ? window.location.host : '');
      const proto =
        typeof window !== 'undefined' && window.location.protocol === 'https:'
          ? 'wss:'
          : 'ws:';
      wsUrl = `${proto}//${h}/ws/notifications?token=${encodeURIComponent(token)}`;
    }
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Notification WebSocket connected');
      // Heartbeat — connection alive rakhne ke liye
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        } else {
          clearInterval(ping);
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      // Heartbeat responses can be plain text.
      if (event.data === 'pong') return;
      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch {
        // Ignore any non-JSON frames.
        return;
      }

      if (data.type === 'deck_notification') {
        const newNotification: AppNotification = {
          id: data.id,
          type: 'reminder',
          title: `Reminder: ${data.contact_name}`,
          description: data.note,
          timestamp: data.remind_at,
          isNew: true,
          contactId: null,
          reminderId: data.id,
        };

        set((state) => {
          const existingIds = new Set(state.notifications.map(n => n.id));
          if (existingIds.has(newNotification.id)) return state;
          const allNotifications = [newNotification, ...state.notifications];
          return {
            notifications: allNotifications,
            unreadCount: allNotifications.filter(n => n.isNew).length,
          };
        });

        // Sound + Browser notification
        get().playNotificationSound();
        get().showBrowserNotification(
          `Reminder: ${data.contact_name}`,
          data.note
        );
      }
    };

    ws.onclose = () => {
      console.log('WebSocket closed — 5s mein reconnect karega');
      set({ wsConnection: null });
      // Auto reconnect
      setTimeout(() => get().connectWebSocket(), 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close();
    };

    set({ wsConnection: ws });
  },

  disconnectWebSocket: () => {
    const { wsConnection } = get();
    if (wsConnection) {
      wsConnection.close();
      set({ wsConnection: null });
    }
  },
}));