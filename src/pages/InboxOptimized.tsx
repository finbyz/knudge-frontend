import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mail, X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { TopBar } from '@/components/TopBar';
import { useToast } from '@/hooks/use-toast';
import { useUnreadStore } from '@/stores/unreadStore';
import { useAuthStore } from '@/stores/authStore';
import { useInboxStore, type InboxMessage, scheduleInboxTabsMetaRefresh } from '@/stores/inboxStore';
import {
  useInboxList,
  patchInboxInfiniteCache,
  pruneThreadFromInboxPageCaches,
  useDebouncedSearch,
} from '@/hooks/useInbox';
import { VirtualizedInboxList } from '@/components/VirtualizedInboxList';
import { telegramWS } from '@/lib/telegramWebSocket';
import { whatsappWS } from '@/lib/whatsappWebSocket';

interface SwipeState {
  messageId: string | null;
  offsetX: number;
  startX: number;
  isSwiping: boolean;
}

export default function InboxOptimized() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedSearch(searchQuery);
  const queryClient = useQueryClient();
  const updateOrAddMessage = useInboxStore((s) => s.updateOrAddMessage);
  const archiveMessage = useInboxStore((s) => s.archiveMessage);
  const markAsRead = useInboxStore((s) => s.markAsRead);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [swipeState, setSwipeState] = useState<SwipeState>({
    messageId: null,
    offsetX: 0,
    startX: 0,
    isSwiping: false,
  });

  const { accessToken } = useAuthStore();
  const { toast } = useToast();
  const { clearUnreadInbox } = useUnreadStore();
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const inboxQuery = useInboxList('all', debouncedSearch);
  const {
    flatMessages,
    isPending,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    debouncedSearch: inboxDebouncedSearch,
  } = inboxQuery;

  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el || !hasNextPage) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root: null, rootMargin: '160px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, flatMessages.length]);

  useEffect(() => {
    if (!accessToken) return;

    whatsappWS.connect(accessToken);
    const unsubscribeWA = whatsappWS.onMessage((msg) => {
      updateOrAddMessage(
        'whatsapp',
        msg.room_id,
        msg.sender_name || 'WhatsApp User',
        msg.text,
        new Date(msg.timestamp),
        msg.avatar,
        msg.normalized_phone,
        msg.identity_key
      );
      const ts =
        typeof msg.timestamp === 'string'
          ? msg.timestamp
          : new Date(msg.timestamp).toISOString();
      patchInboxInfiniteCache(
        queryClient,
        'all',
        inboxDebouncedSearch,
        (c) =>
          String(c.platform) === 'whatsapp' &&
          (String(c.room_id) === String(msg.room_id) ||
            (msg.identity_key && String(c.identity_key) === String(msg.identity_key)) ||
            (msg.normalized_phone &&
              String(c.normalized_phone) === String(msg.normalized_phone))),
        (c) => ({
          ...c,
          preview: msg.text ?? c.preview,
          timestamp: ts,
          unread_count: Math.max(Number(c.unread_count) || 0, 1),
        })
      );
      scheduleInboxTabsMetaRefresh();
    });

    telegramWS.connect(accessToken);
    const unsubscribeTG = telegramWS.onMessage((msg) => {
      updateOrAddMessage(
        'telegram',
        msg.chat_id,
        msg.contact_name,
        msg.text,
        new Date(msg.timestamp)
      );
      const ts =
        typeof msg.timestamp === 'string'
          ? msg.timestamp
          : new Date(msg.timestamp).toISOString();
      patchInboxInfiniteCache(
        queryClient,
        'all',
        inboxDebouncedSearch,
        (c) =>
          String(c.platform) === 'telegram' &&
          (String(c.room_id) === String(msg.chat_id) ||
            String(c.id) === `telegram-${msg.chat_id}`),
        (c) => ({
          ...c,
          preview: msg.text ?? c.preview,
          timestamp: ts,
          unread_count: Math.max(Number(c.unread_count) || 0, 1),
        })
      );
      scheduleInboxTabsMetaRefresh();
    });

    return () => {
      unsubscribeWA();
      unsubscribeTG();
    };
  }, [accessToken, updateOrAddMessage, queryClient, inboxDebouncedSearch]);

  useEffect(() => {
    clearUnreadInbox();
  }, [clearUnreadInbox]);

  const handleRowClick = useCallback(
    (message: InboxMessage) => {
      if (selectionMode) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(message.id)) next.delete(message.id);
          else next.add(message.id);
          return next;
        });
      } else if (!swipeState.isSwiping) {
        if (['email', 'outlook', 'gmail'].includes(message.platform)) {
          navigate(`/inbox/email/${message.id}`);
        } else if (message.platform === 'whatsapp') {
          if (message.contactId) {
            navigate(
              `/inbox/chat/${message.contactId}?name=${encodeURIComponent(message.sender.name)}`
            );
          } else if (message.roomId) {
            const roomParam = encodeURIComponent(message.roomId);
            const phoneParam = message.sender.phone
              ? `&phone=${encodeURIComponent(message.sender.phone)}`
              : '';
            navigate(
              `/inbox/chat/wa?room=${roomParam}&name=${encodeURIComponent(message.sender.name)}${phoneParam}`
            );
          }
        } else if (message.platform === 'instagram' && message.roomId) {
          navigate(
            `/inbox/chat/ig?room=${encodeURIComponent(message.roomId)}&name=${encodeURIComponent(message.sender.name)}`
          );
        } else if (message.platform === 'linkedin' && message.roomId) {
          const avatarParam = message.sender.avatar
            ? `&avatar=${encodeURIComponent(message.sender.avatar)}`
            : '';
          navigate(
            `/inbox/chat/li?chat_id=${encodeURIComponent(message.roomId)}&name=${encodeURIComponent(message.sender.name)}${avatarParam}`
          );
        } else if (message.platform === 'telegram' && message.roomId) {
          const avatarParam = message.sender.avatar
            ? `&avatar=${encodeURIComponent(message.sender.avatar)}`
            : '';
          navigate(
            `/inbox/chat/${message.id}?name=${encodeURIComponent(message.sender.name)}${avatarParam}`
          );
        } else {
          navigate(`/inbox/chat/${message.id}?name=${encodeURIComponent(message.sender.name)}`);
        }
      }
    },
    [selectionMode, swipeState.isSwiping, navigate]
  );

  const toggleSelection = useCallback((messageId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);

  const handleLongPressStart = useCallback(
    (messageId: string) => {
      if (selectionMode) return;
      longPressTimerRef.current = setTimeout(() => {
        setSelectionMode(true);
        setSelectedIds(new Set([messageId]));
      }, 500);
    },
    [selectionMode]
  );

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, messageId: string) => {
      if (selectionMode) return;
      handleLongPressStart(messageId);
      setSwipeState({
        messageId,
        offsetX: 0,
        startX: e.touches[0].clientX,
        isSwiping: false,
      });
    },
    [selectionMode, handleLongPressStart]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (selectionMode || !swipeState.messageId) return;
      const currentX = e.touches[0].clientX;
      const diff = currentX - swipeState.startX;
      if (Math.abs(diff) > 10) {
        handleLongPressEnd();
        setSwipeState((prev) => ({ ...prev, offsetX: diff, isSwiping: true }));
      }
    },
    [selectionMode, swipeState.messageId, swipeState.startX, handleLongPressEnd]
  );

  const handleTouchEnd = useCallback(() => {
    handleLongPressEnd();
    if (selectionMode || !swipeState.messageId || !swipeState.isSwiping) {
      setSwipeState({ messageId: null, offsetX: 0, startX: 0, isSwiping: false });
      return;
    }
    const SWIPE_THRESHOLD = 100;
    if (swipeState.offsetX < -SWIPE_THRESHOLD && swipeState.messageId) {
      archiveMessage(swipeState.messageId);
      pruneThreadFromInboxPageCaches(queryClient, swipeState.messageId);
      toast({ description: 'Message archived' });
    } else if (swipeState.offsetX > SWIPE_THRESHOLD) {
      const msgId = swipeState.messageId;
      const msg = flatMessages.find((m) => m.id === msgId);
      if (msg) {
        if (msg.unread) {
          markAsRead(msg.id, msg.roomId, msg.normalizedPhone, msg.identityKey);
        }
        toast({ description: msg.unread ? 'Marked as read' : 'Already read' });
      }
    }
    setSwipeState({ messageId: null, offsetX: 0, startX: 0, isSwiping: false });
  }, [
    selectionMode,
    swipeState,
    flatMessages,
    toast,
    handleLongPressEnd,
    archiveMessage,
    markAsRead,
    queryClient,
  ]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, messageId: string) => {
      if (selectionMode) return;
      handleLongPressStart(messageId);
    },
    [selectionMode, handleLongPressStart]
  );

  const handleMouseUp = useCallback(() => {
    handleLongPressEnd();
  }, [handleLongPressEnd]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24 pt-0">
      <TopBar title="Inbox" />

      <main className="px-4 pt-0 pb-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search messages…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </motion.div>

        {isFetching && flatMessages.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">Messages are syncing…</p>
        )}

        <AnimatePresence>
          {selectionMode && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-primary text-primary-foreground rounded-xl p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span className="font-medium">{selectedIds.size} Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toast({ description: `${selectedIds.size} message(s) marked as read` })}
                  className="px-3 py-1.5 text-sm bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-lg transition-colors"
                >
                  Mark Read
                </button>
                <button
                  type="button"
                  onClick={() => toast({ description: `${selectedIds.size} message(s) archived` })}
                  className="px-3 py-1.5 text-sm bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-lg transition-colors"
                >
                  Archive
                </button>
                <button
                  type="button"
                  onClick={exitSelectionMode}
                  className="p-1.5 hover:bg-primary-foreground/20 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }}>
          {isPending && flatMessages.length === 0 ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">Messages are syncing…</p>
            </div>
          ) : flatMessages.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No messages found</p>
            </div>
          ) : (
            <>
              <VirtualizedInboxList
                messages={flatMessages}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                searchQuery={searchQuery}
                swipeState={swipeState}
                removingId={removingId}
                onRowClick={handleRowClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                toggleSelection={toggleSelection}
                onEndReached={() => {
                  if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
                }}
                hasMore={Boolean(hasNextPage)}
                isLoading={isFetchingNextPage}
              />
              {hasNextPage && (
                <div
                  ref={loadMoreSentinelRef}
                  className="py-3 flex justify-center text-xs text-muted-foreground min-h-[40px]"
                >
                  {isFetchingNextPage ? 'Loading more…' : '\u00a0'}
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
