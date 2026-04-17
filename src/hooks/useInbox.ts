import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useInboxStore } from '@/stores/inboxStore';
import { API_BASE_URL } from '@/lib/api-client';

const CACHE_TIME = 10 * 60 * 1000; // 10 minutes
const STALE_TIME = 2 * 60 * 1000; // 2 minutes

// Helper to format dates consistently
const formatGmailDate = (date: Date | string | undefined, usePattern = false): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;

  if (!d || isNaN(d.getTime())) return '';

  const now = new Date();
  const diffTime = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    if (usePattern) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isYesterday) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function useInbox() {
  const { accessToken } = useAuthStore();
  const setMessages = useInboxStore((state) => state.setMessages);
  const markFetched = useInboxStore((state) => state.markFetched);

  return useQuery({
    queryKey: ['unified-inbox'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/inbox/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!response.ok) {
        throw new Error(`Inbox fetch failed: ${response.status}`);
      }

      const json = await response.json();
      const chats = json.chats || [];

      // Convert to InboxMessage format
      const inboxMessages = chats.map((chat: any) => {
        const msgDate = chat.timestamp ? new Date(chat.timestamp) : null;
        const validDate = msgDate && !isNaN(msgDate.getTime());

        return {
          id: chat.id,
          sender: {
            name: chat.display_name,
            avatar: chat.avatar || undefined,
            initials: (chat.display_name?.[0] || chat.platform?.[0] || '?').toUpperCase(),
            phone: chat.phone || undefined,
          },
          platform: chat.platform,
          email_direction: chat.email_direction,
          email_status: chat.email_status,
          subject: chat.subject || undefined,
          preview: chat.preview,
          timestamp: validDate ? formatGmailDate(msgDate!, chat.platform !== 'whatsapp') : '',
          sortDate: validDate ? msgDate! : new Date(0),
          roomId: chat.room_id,
          normalizedPhone: chat.normalized_phone || undefined,
          identityKey: chat.identity_key || undefined,
          isGroup: chat.is_group || false,
          unread: (chat.unread_count || 0) > 0,
          unreadCount: chat.unread_count || 0
        };
      });

      // Update Zustand store
      setMessages(inboxMessages);
      markFetched();
      
      return inboxMessages;
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!accessToken,
  });
}
