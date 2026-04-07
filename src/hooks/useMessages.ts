import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { API_BASE_URL, API_HOST_URL } from '@/lib/api-client';
import type { InboxMessage } from '@/stores/inboxStore';

const CACHE_TIME = 10 * 60 * 1000; // 10 minutes
const STALE_TIME = 2 * 60 * 1000; // 2 minutes

interface ChatResponse {
  chats: any[];
  has_more: boolean;
  next_offset?: number;
  total: number;
}

// Helper to format dates consistently
const formatGmailDate = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '';

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// WhatsApp hooks
export function useWhatsAppMessages() {
  const { accessToken } = useAuthStore();

  return useInfiniteQuery<ChatResponse, Error, { pages: ChatResponse[]; pageParams: number[] }, [string], number>({
    queryKey: ['whatsapp', 'messages'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(
        `${API_BASE_URL}/whatsapp/chats/?limit=20&offset=${pageParam}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch WhatsApp chats');
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more) return undefined;
      return lastPage.next_offset ?? undefined;
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!accessToken,
  });
}

// Telegram hooks
export function useTelegramMessages() {
  const { accessToken } = useAuthStore();

  return useInfiniteQuery<ChatResponse, Error, { pages: ChatResponse[]; pageParams: number[] }, [string], number>({
    queryKey: ['telegram', 'messages'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(
        `${API_BASE_URL}/telegram/messages?limit=20&offset=${pageParam}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch Telegram messages');
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more) return undefined;
      return lastPage.next_offset ?? undefined;
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!accessToken,
  });
}

// Instagram hooks
export function useInstagramMessages() {
  const { accessToken } = useAuthStore();

  return useInfiniteQuery<ChatResponse, Error, { pages: ChatResponse[]; pageParams: number[] }, [string], number>({
    queryKey: ['instagram', 'messages'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(
        `${API_BASE_URL}/instagram/chats/?limit=20&offset=${pageParam}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch Instagram chats');
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more) return undefined;
      return lastPage.next_offset ?? undefined;
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!accessToken,
  });
}

// Email hooks
export function useEmails() {
  const { accessToken } = useAuthStore();

  return useQuery({
    queryKey: ['emails'],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/emails/?limit=50&direction=INCOMING`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch emails');
      return response.json();
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!accessToken,
  });
}

// Unified messages hook - combines all platforms
export function useUnifiedMessages() {
  const whatsapp = useWhatsAppMessages();
  const telegram = useTelegramMessages();
  const instagram = useInstagramMessages();
  const emails = useEmails();

  const isLoading = whatsapp.isLoading || telegram.isLoading || instagram.isLoading || emails.isLoading;
  const isFetching = whatsapp.isFetching || telegram.isFetching || instagram.isFetching || emails.isFetching;
  const hasNextPage = whatsapp.hasNextPage || telegram.hasNextPage || instagram.hasNextPage;

  // Flatten and combine all messages
  const allMessages: InboxMessage[] = [];

  // Process WhatsApp
  whatsapp.data?.pages.forEach((page: ChatResponse) => {
    page.chats?.forEach((chat: any) => {
      const msgDate = chat.last_message_time ? new Date(chat.last_message_time) : null;
      const validDate = msgDate && !isNaN(msgDate.getTime());
      allMessages.push({
        id: `wa-chat-${chat.chat_id || chat.id}`,
        contactId: chat.contact_id || chat.wa_contact_id || undefined,
        sender: {
          name: chat.display_name || chat.name || chat.phone || 'WhatsApp User',
          avatar: chat.profile_picture_url || chat.photo_url || undefined,
          initials: (chat.display_name?.[0] || chat.name?.[0] || chat.phone?.[0] || 'W').toUpperCase(),
          phone: chat.phone || undefined,
        },
        platform: 'whatsapp',
        preview: chat.last_message_preview || 'No messages yet',
        timestamp: validDate ? formatGmailDate(msgDate!) : '',
        sortDate: validDate ? msgDate! : new Date(0),
        roomId: chat.chat_id || chat.id,
        unread: (chat.unread_count || 0) > 0,
        unreadCount: chat.unread_count || 0,
      });
    });
  });

  // Process Telegram
  telegram.data?.pages.forEach((page: ChatResponse) => {
    page.chats?.forEach((msg: any) => {
      const msgDate = new Date(msg.timestamp);
      allMessages.push({
        id: `telegram-${msg.chat_id}`,
        sender: {
          name: msg.contact_name || 'Telegram User',
          initials: (msg.contact_name?.[0] || 'T').toUpperCase(),
          avatar: msg.photo_url ? `${API_HOST_URL}${msg.photo_url}` : undefined,
        },
        platform: 'telegram',
        preview: msg.text || '',
        timestamp: formatGmailDate(msgDate),
        sortDate: msgDate,
        roomId: msg.chat_id,
        unread: msg.direction === 'INCOMING',
      });
    });
  });

  // Process Instagram
  instagram.data?.pages.forEach((page: ChatResponse) => {
    page.chats?.forEach((chat: any) => {
      const msgDate = chat.last_message_time ? new Date(chat.last_message_time) : null;
      const validDate = msgDate && !isNaN(msgDate.getTime());
      allMessages.push({
        id: `ig-chat-${chat.id}`,
        sender: {
          name: chat.display_name || chat.username || 'Instagram User',
          avatar: chat.profile_pic_url || undefined,
          initials: (chat.display_name?.[0] || chat.username?.[0] || 'I').toUpperCase(),
        },
        platform: 'instagram',
        preview: chat.last_message_preview || 'No messages yet',
        timestamp: validDate ? formatGmailDate(msgDate!) : '',
        sortDate: validDate ? msgDate! : new Date(0),
        roomId: chat.id,
        unread: (chat.unread_count || 0) > 0,
        unreadCount: chat.unread_count || 0,
      });
    });
  });

  // Process Emails
  emails.data?.forEach((email: any) => {
    const emailDate = email.sent_at ? new Date(email.sent_at) : new Date(0);
    const platform = (email.platform || 'email').toLowerCase();

    const fromEmail: string | undefined = email.from_email ?? email.from ?? email.sender;
    const subject: string = email.subject ?? email.subject_line ?? '(No Subject)';
    const previewText: string =
      email.body_text ?? email.text ?? email.preview ?? email.snippet ?? '';

    allMessages.push({
      id: `email-${email.id ?? email.message_id ?? `${fromEmail || 'email'}-${emailDate.getTime()}`}`,
      sender: {
        name: fromEmail
          ? fromEmail.split('<')[0].replace(/"/g, '').trim() || fromEmail
          : 'Email User',
        initials: (fromEmail?.[0] || '?').toUpperCase(),
      },
      platform: platform as any,
      subject,
      preview: previewText,
      timestamp: formatGmailDate(emailDate),
      sortDate: emailDate,
      unread: (email.unread ?? email.status) === true || email.status === 'RECEIVED',
    });
  });

  // Sort by date
  allMessages.sort((a, b) => {
    const dateA = a.sortDate ? new Date(a.sortDate).getTime() : 0;
    const dateB = b.sortDate ? new Date(b.sortDate).getTime() : 0;
    return dateB - dateA;
  });

  return {
    messages: allMessages,
    isLoading,
    isFetching,
    hasNextPage,
    fetchNextPage: () => {
      whatsapp.fetchNextPage();
      telegram.fetchNextPage();
      instagram.fetchNextPage();
    },
    refetch: () => {
      whatsapp.refetch();
      telegram.refetch();
      instagram.refetch();
      emails.refetch();
    },
  };
}

// Hook for chat messages (for ChatDetail)
export function useChatMessages(platform: string, roomId: string | null) {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ['messages', platform, roomId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!roomId) return { messages: [], has_more: false };
      const response = await fetch(
        `${API_BASE_URL}/${platform}/messages/${encodeURIComponent(roomId)}?limit=50&offset=${pageParam}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) throw new Error(`Failed to fetch ${platform} messages`);
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more) return undefined;
      return lastPage.next_offset ?? undefined;
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!accessToken && !!roomId,
  });
}

// Hook to invalidate message queries when new messages arrive
export function useInvalidateMessages() {
  const queryClient = useQueryClient();

  return useMemo(() => {
    return {
      invalidateWhatsApp: () =>
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages'] }),
      invalidateTelegram: () =>
        queryClient.invalidateQueries({ queryKey: ['telegram', 'messages'] }),
      invalidateInstagram: () =>
        queryClient.invalidateQueries({ queryKey: ['instagram', 'messages'] }),
      invalidateEmails: () => queryClient.invalidateQueries({ queryKey: ['emails'] }),
      invalidateChat: (platform: string, roomId: string) =>
        queryClient.invalidateQueries({ queryKey: ['messages', platform, roomId] }),
    };
  }, [queryClient]);
}
