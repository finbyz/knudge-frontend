import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mail, X, Check, Archive, MailOpen, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TopBar } from '@/components/TopBar';
import { useToast } from '@/hooks/use-toast';
import { useUnreadStore } from '@/stores/unreadStore';
import { useAuthStore } from '@/stores/authStore';
import { useInboxStore, type InboxMessage } from '@/stores/inboxStore';
import { useUnifiedMessages, useInvalidateMessages } from '@/hooks/useMessages';
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
  // Only subscribe to the action we need (avoid re-render loops on store state updates).
  const updateOrAddMessage = useInboxStore((s) => s.updateOrAddMessage);
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

  // Use React Query for data fetching
  const {
    messages,
    isLoading,
    isFetching,
    hasNextPage,
    fetchNextPage,
  } = useUnifiedMessages();

  const invalidate = useInvalidateMessages();

  // Update local store when query data changes
  // Note: we intentionally do NOT sync hook messages into Zustand here.
  // `useUnifiedMessages` rebuilds a new array reference frequently, which can cause an update loop.

  // WebSocket connections for real-time updates
  useEffect(() => {
    if (!accessToken) return;

    // WhatsApp WebSocket
    whatsappWS.connect(accessToken);
    const unsubscribeWA = whatsappWS.onMessage((msg) => {
      updateOrAddMessage(
        'whatsapp',
        msg.room_id,
        msg.sender_name || 'WhatsApp User',
        msg.text,
        new Date(msg.timestamp),
        msg.avatar
      );
      invalidate.invalidateWhatsApp();
    });

    // Telegram WebSocket
    telegramWS.connect(accessToken);
    const unsubscribeTG = telegramWS.onMessage((msg) => {
      updateOrAddMessage(
        'telegram',
        msg.chat_id,
        msg.contact_name,
        msg.text,
        new Date(msg.timestamp)
      );
      invalidate.invalidateTelegram();
    });

    return () => {
      unsubscribeWA();
      unsubscribeTG();
    };
  }, [accessToken, updateOrAddMessage, invalidate]);

  // Clear unread count on mount
  useEffect(() => {
    clearUnreadInbox();
  }, [clearUnreadInbox]);

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter((msg) =>
      (msg.sender?.name ?? '').toLowerCase().includes(query) ||
      (msg.preview ?? '').toLowerCase().includes(query) ||
      ((msg.subject ?? '').toLowerCase().includes(query))
    );
  }, [messages, searchQuery]);

  // Handlers
  const handleRowClick = useCallback((message: InboxMessage) => {
    if (selectionMode) {
      toggleSelection(message.id);
    } else if (!swipeState.isSwiping) {
      if (message.unread) {
        // Optimistic update
        updateOrAddMessage(
          message.platform,
          message.roomId || message.id,
          message.sender.name,
          message.preview,
          message.sortDate || new Date()
        );
      }

      // Navigate based on platform
      if (['email', 'outlook', 'gmail'].includes(message.platform)) {
        navigate(`/inbox/email/${message.id}`);
      } else if (message.platform === 'whatsapp') {
        if (message.contactId) {
          navigate(`/inbox/chat/${message.contactId}?name=${encodeURIComponent(message.sender.name)}`);
        } else if (message.roomId) {
          // Temporary fallback for cases where we can't resolve a UUID contact id yet.
          const roomParam = encodeURIComponent(message.roomId);
          const phoneParam = message.sender.phone
            ? `&phone=${encodeURIComponent(message.sender.phone)}`
            : '';
          navigate(`/inbox/chat/wa?room=${roomParam}&name=${encodeURIComponent(message.sender.name)}${phoneParam}`);
        }
      } else if (message.platform === 'instagram' && message.roomId) {
        navigate(`/inbox/chat/ig?room=${encodeURIComponent(message.roomId)}&name=${encodeURIComponent(message.sender.name)}`);
      } else if (message.platform === 'telegram' && message.roomId) {
        const avatarParam = message.sender.avatar ? `&avatar=${encodeURIComponent(message.sender.avatar)}` : '';
        navigate(`/inbox/chat/${message.id}?name=${encodeURIComponent(message.sender.name)}${avatarParam}`);
      } else {
        navigate(`/inbox/chat/${message.id}?name=${encodeURIComponent(message.sender.name)}`);
      }
    }
  }, [selectionMode, swipeState.isSwiping, navigate, updateOrAddMessage]);

  const toggleSelection = useCallback((messageId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  // Long press handlers
  const handleLongPressStart = useCallback((messageId: string) => {
    if (selectionMode) return;
    longPressTimerRef.current = setTimeout(() => {
      setSelectionMode(true);
      setSelectedIds(new Set([messageId]));
    }, 500);
  }, [selectionMode]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Touch handlers for swipe and long press
  const handleTouchStart = useCallback((e: React.TouchEvent, messageId: string) => {
    if (selectionMode) return;
    handleLongPressStart(messageId);
    setSwipeState({
      messageId,
      offsetX: 0,
      startX: e.touches[0].clientX,
      isSwiping: false,
    });
  }, [selectionMode, handleLongPressStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (selectionMode || !swipeState.messageId) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - swipeState.startX;
    if (Math.abs(diff) > 10) {
      handleLongPressEnd();
      setSwipeState((prev) => ({ ...prev, offsetX: diff, isSwiping: true }));
    }
  }, [selectionMode, swipeState.messageId, swipeState.startX, handleLongPressEnd]);

  const handleTouchEnd = useCallback(() => {
    handleLongPressEnd();
    if (selectionMode || !swipeState.messageId || !swipeState.isSwiping) {
      setSwipeState({ messageId: null, offsetX: 0, startX: 0, isSwiping: false });
      return;
    }

    const SWIPE_THRESHOLD = 100;
    if (swipeState.offsetX < -SWIPE_THRESHOLD) {
      toast({ description: 'Message archived' });
    } else if (swipeState.offsetX > SWIPE_THRESHOLD) {
      toast({ description: 'Marked as read' });
    }
    setSwipeState({ messageId: null, offsetX: 0, startX: 0, isSwiping: false });
  }, [selectionMode, swipeState, toast, handleLongPressEnd]);

  const handleMouseDown = useCallback((e: React.MouseEvent, messageId: string) => {
    if (selectionMode) return;
    handleLongPressStart(messageId);
  }, [selectionMode, handleLongPressStart]);

  const handleMouseUp = useCallback(() => {
    handleLongPressEnd();
  }, [handleLongPressEnd]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24 pt-0">
      <TopBar title="Inbox" />

      <main className="px-4 pt-0 pb-4 space-y-4">
        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </motion.div>

        {/* Selection mode bar */}
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
                  onClick={() => toast({ description: `${selectedIds.size} message(s) marked as read` })}
                  className="px-3 py-1.5 text-sm bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-lg transition-colors"
                >
                  Mark Read
                </button>
                <button
                  onClick={() => toast({ description: `${selectedIds.size} message(s) archived` })}
                  className="px-3 py-1.5 text-sm bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-lg transition-colors"
                >
                  Archive
                </button>
                <button onClick={exitSelectionMode} className="p-1.5 hover:bg-primary-foreground/20 rounded-lg transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Virtualized message list */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {isLoading && filteredMessages.length === 0 ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">Loading messages...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No messages found</p>
            </div>
          ) : (
            <VirtualizedInboxList
              messages={filteredMessages}
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
              onEndReached={fetchNextPage}
              hasMore={hasNextPage}
              isLoading={isFetching}
            />
          )}
        </motion.div>
      </main>
    </div>
  );
}
