import { useEffect, useMemo, useState } from 'react';
import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import {
  useInboxStore,
  type InboxMessage,
  type InboxTabsMeta,
  scheduleInboxTabsMetaRefresh,
} from '@/stores/inboxStore';
import { API_BASE_URL, getEffectiveAccessToken, getPersistedAccessToken } from '@/lib/api-client';

const CACHE_TIME = 10 * 60 * 1000;
const STALE_TIME = 45 * 1000;
export const INBOX_PAGE_LIMIT = 40;

export const inboxPageQueryKey = (platform: string, search: string) =>
  ['inbox-page', platform, search] as const;

const formatGmailDate = (
  date: Date | string | undefined,
  usePattern = false
): string => {
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
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function mapChatToInboxMessage(chat: Record<string, unknown>): InboxMessage {
  const msgDate = chat.timestamp ? new Date(String(chat.timestamp)) : null;
  const validDate = msgDate && !isNaN(msgDate.getTime());
  const platform = chat.platform as InboxMessage['platform'];
  return {
    id: String(chat.id),
    sender: {
      name: String(chat.display_name ?? ''),
      avatar: (chat.avatar as string | undefined) || undefined,
      initials: (
        String(chat.display_name ?? chat.platform ?? '?')[0] || '?'
      ).toUpperCase(),
      phone: (chat.phone as string | undefined) || undefined,
    },
    platform,
    email_direction: chat.email_direction as InboxMessage['email_direction'],
    email_status: chat.email_status as string | undefined,
    subject: (chat.subject as string | undefined) || undefined,
    preview: String(chat.preview ?? ''),
    timestamp: validDate
      ? formatGmailDate(msgDate!, platform !== 'whatsapp')
      : '',
    sortDate: validDate ? msgDate! : new Date(0),
    roomId: (chat.room_id as string | undefined) || undefined,
    normalizedPhone: (chat.normalized_phone as string | undefined) || undefined,
    identityKey: (chat.identity_key as string | undefined) || undefined,
    isGroup: Boolean(chat.is_group),
    unread: (Number(chat.unread_count) || 0) > 0,
    unreadCount: Math.max(0, Number(chat.unread_count) || 0),
  };
}

export type InboxPageJson = {
  success?: boolean;
  chats?: Record<string, unknown>[];
  tabs_meta?: InboxTabsMeta | null;
  next_cursor?: string | null;
  total_filtered?: number;
  meta?: Record<string, unknown>;
  error?: string;
};

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Patch a matching thread row across all loaded pages (realtime). Returns true if a row was updated. */
function _dedupePageChatsById(chats: Record<string, unknown>[]) {
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const c of chats) {
    const id = String(c.id || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(c);
  }
  return out;
}

export function patchInboxInfiniteCache(
  queryClient: QueryClient,
  platform: string,
  search: string,
  match: (row: Record<string, unknown>) => boolean,
  apply: (row: Record<string, unknown>) => Record<string, unknown>
): boolean {
  const key = inboxPageQueryKey(platform, search);
  let touched = false;
  queryClient.setQueryData(key, (old: InfiniteData<InboxPageJson> | undefined) => {
    if (!old?.pages?.length) return old;
    const pages = old.pages.map((page) => {
      const chats = (page.chats || []).map((c) => {
        if (!match(c)) return c;
        touched = true;
        return apply({ ...c });
      });
      const sorted = [...chats].sort((a, b) => {
        const ta = new Date(String(a.timestamp || 0)).getTime();
        const tb = new Date(String(b.timestamp || 0)).getTime();
        return tb - ta;
      });
      return { ...page, chats: _dedupePageChatsById(sorted) };
    });
    return { ...old, pages };
  });
  return touched;
}

/** Remove one thread from every cached ``inbox-page`` query (archive). */
export function pruneThreadFromInboxPageCaches(
  queryClient: QueryClient,
  threadId: string
) {
  queryClient.setQueriesData({ queryKey: ['inbox-page'] }, (old: InfiniteData<InboxPageJson> | undefined) => {
    if (!old?.pages?.length) return old;
    let removed = false;
    const pages = old.pages.map((page, pi) => {
      const chats = (page.chats || []).filter((c) => {
        if (String(c.id) === threadId) {
          removed = true;
          return false;
        }
        return true;
      });
      let total_filtered = page.total_filtered;
      if (pi === 0 && removed && typeof total_filtered === 'number') {
        total_filtered = Math.max(0, total_filtered - 1);
      }
      return { ...page, chats, count: chats.length, total_filtered };
    });
    return { ...old, pages };
  });
  scheduleInboxTabsMetaRefresh();
}

export function useInboxList(platform: string, search: string) {
  const { accessToken } = useAuthStore();
  const setInboxFromServer = useInboxStore((s) => s.setInboxFromServer);
  const markFetched = useInboxStore((s) => s.markFetched);
  const debouncedSearch = useDebounced(search.trim(), 320);

  const infinite = useInfiniteQuery({
    queryKey: inboxPageQueryKey(platform, debouncedSearch),
    enabled: !!(accessToken || getPersistedAccessToken()),
    initialPageParam: null as string | null,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 2,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 8000),
    refetchInterval: 8000,
    refetchIntervalInBackground: true,
    queryFn: async ({ pageParam }): Promise<InboxPageJson> => {
      const token = getEffectiveAccessToken(accessToken);
      if (!token) {
        throw new Error('Not authenticated');
      }
      const params = new URLSearchParams();
      params.set('platform', platform || 'all');
      params.set('limit', String(INBOX_PAGE_LIMIT));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (pageParam) params.set('cursor', pageParam);
      const response = await fetch(`${API_BASE_URL}/inbox/page?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Inbox page failed: ${response.status}`);
      }
      const json = (await response.json()) as InboxPageJson;
      if (json.success === false) {
        throw new Error(String(json.error || 'Inbox page error'));
      }
      return json;
    },
    getNextPageParam: (lastPage) =>
      lastPage?.next_cursor && String(lastPage.next_cursor).trim()
        ? String(lastPage.next_cursor)
        : undefined,
  });

  const flatMessages = useMemo(() => {
    const pages = infinite.data?.pages;
    if (!pages?.length) return [] as InboxMessage[];
    return pages.flatMap((p) => (p.chats || []).map(mapChatToInboxMessage));
  }, [infinite.data]);

  useEffect(() => {
    const pages = infinite.data?.pages;
    if (!pages?.length) return;
    const tabs = pages[0]?.tabs_meta ?? null;
    setInboxFromServer(flatMessages, tabs);
    markFetched();
  }, [flatMessages, infinite.data, markFetched, setInboxFromServer]);

  const totalFiltered = infinite.data?.pages?.[0]?.total_filtered;

  return {
    ...infinite,
    flatMessages,
    totalFiltered,
    debouncedSearch,
  };
}

/** Hydrates store from paginated inbox (all tab). Prefer `useInboxList` with explicit platform on Inbox. */
export function useInbox() {
  return useInboxList('all', '');
}

export function useDebouncedSearch(search: string, ms = 320) {
  return useDebounced(search, ms);
}
