import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageCircle, MessageSquare, Linkedin, Mail, X, Check, Archive, MailOpen, Loader2, Instagram, Building2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageShell } from '@/components/layout/PageShell';
import { Avatar } from '@/components/Avatar';
import { cn, formatSenderName } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUnreadStore } from '@/stores/unreadStore';
import { useAuthStore } from '@/stores/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { useInboxStore, type InboxMessage, useShallow, scheduleInboxTabsMetaRefresh } from '@/stores/inboxStore';
import { API_BASE_URL } from '@/lib/api-client';
import {
  useInboxList,
  patchInboxInfiniteCache,
  pruneThreadFromInboxPageCaches,
  useDebouncedSearch,
  inboxPageQueryKey,
} from '@/hooks/useInbox';
import { telegramWS } from '@/lib/telegramWebSocket';
import { whatsappWS } from '@/lib/whatsappWebSocket';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorBanner } from '@/components/ui/error-banner';
import { EmptyInbox } from '@/components/inbox/EmptyInbox';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

const decodeHTMLEntities = (text: string): string => {
  if (!text) return '';
  const entities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#32;': ' ',
    '&nbsp;': ' ',
  };
  return text.replace(/&[#\w\d]+;/g, (entity) => entities[entity] || entity);
};

const cleanPreview = (text: string) => {
  if (!text) return '';

  // Remove HTML tags
  let clean = text.replace(
    /<[^>]*>/g, ' '
  );

  // Remove HTML entities
  clean = clean.replace(/&amp;/g, '&');
  clean = clean.replace(/&lt;/g, '<');
  clean = clean.replace(/&gt;/g, '>');
  clean = clean.replace(/&#39;/g, "'");
  clean = clean.replace(/&nbsp;/g, ' ');
  clean = clean.replace(/&quot;/g, '"');

  // Remove [image: ...] tags
  clean = clean.replace(
    /\[image:[^\]]*\]/g, ''
  );

  // Remove multiple spaces
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
};

const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;
  const decodedText = decodeHTMLEntities(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = decodedText.split(regex);
  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 text-foreground px-0.5 rounded font-medium">
        {part}
      </mark>
    ) : part
  );
};

const platformConfig: Record<string, any> = {
  whatsapp: { icon: MessageCircle, bgColor: 'bg-[#25D366]', label: 'WhatsApp' },
  linkedin: { icon: Linkedin, bgColor: 'bg-[#0A66C2]', label: 'LinkedIn' },
  email: { icon: Mail, bgColor: 'bg-destructive', label: 'Email' },
  outlook: { icon: Mail, bgColor: 'bg-[#0078D4]', label: 'Outlook' },
  signal: { icon: MessageSquare, bgColor: 'bg-[#3A76F0]', label: 'Signal' },
  gmail: { icon: Mail, bgColor: 'bg-[#EA4335]', label: 'Gmail' },
  telegram: { icon: Send, bgColor: 'bg-[#229ED9]', label: 'Telegram' },
  instagram: { icon: Instagram, bgColor: 'bg-[#E1306C]', label: 'Instagram' },
  erpnext: { icon: Building2, bgColor: 'bg-[#0078D4]', label: 'ERPNext' },
};

const DEFAULT_PLATFORM = { icon: Mail, bgColor: 'bg-muted-foreground', label: 'Message' };

interface SwipeState {
  messageId: string | null;
  offsetX: number;
  startX: number;
  isSwiping: boolean;
}

export default function Inbox() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { accessToken } = useAuthStore();
  const { toast } = useToast();
  const { clearUnreadInbox } = useUnreadStore();
  
  // Use specialized shallow selector to avoid re-renders when other state changes
  const { 
    messages, 
    markAsRead, 
    updateOrAddMessage, 
    archiveMessage,
    selectedPlatform,
    setSelectedPlatform,
    tabsMeta,
  } = useInboxStore(
    useShallow((state) => ({
      messages: state.messages,
      markAsRead: state.markAsRead,
      updateOrAddMessage: state.updateOrAddMessage,
      archiveMessage: state.archiveMessage,
      selectedPlatform: state.selectedPlatform,
      setSelectedPlatform: state.setSelectedPlatform,
      tabsMeta: state.tabsMeta,
    }))
  );

  const debouncedSearch = useDebouncedSearch(searchQuery);
  const queryClient = useQueryClient();
  const inboxQuery = useInboxList(selectedPlatform, debouncedSearch);
  const {
    flatMessages,
    totalFiltered,
    isPending,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    debouncedSearch: inboxDebouncedSearch,
  } = inboxQuery;

  const [showNewMessagesBanner, setShowNewMessagesBanner] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [swipeState, setSwipeState] = useState<SwipeState>({
    messageId: null,
    offsetX: 0,
    startX: 0,
    isSwiping: false,
  });
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Instagram Auto-refresh (fallback until IG WebSocket is ready)
  // ============================================================================
  useEffect(() => {
    if (!accessToken) return;

    const intervalId = setInterval(() => {
      refetch();
    }, 60000); // 1 min

    return () => clearInterval(intervalId);
  }, [accessToken, refetch]);

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
      { root: null, rootMargin: '120px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, flatMessages.length]);

  // ============================================================================
  // WhatsApp Real-time Updates via WebSocket
  // ============================================================================
  useEffect(() => {
    if (!accessToken) return;

    whatsappWS.connect(accessToken);

    const unsubscribe = whatsappWS.onMessage((msg) => {
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
      const matched = patchInboxInfiniteCache(
        queryClient,
        selectedPlatform,
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
      if (!matched) setShowNewMessagesBanner(true);
      scheduleInboxTabsMetaRefresh();
    });

    return () => {
      unsubscribe();
    };
  }, [
    accessToken,
    updateOrAddMessage,
    queryClient,
    selectedPlatform,
    inboxDebouncedSearch,
  ]);

  // ============================================================================
  // Telegram Real-time Updates via WebSocket
  // ============================================================================
  useEffect(() => {
    if (!accessToken) return;

    telegramWS.connect(accessToken);
    // 2. Subscribe
    const unsubscribe = telegramWS.onMessage((msg) => {
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
      const matched = patchInboxInfiniteCache(
        queryClient,
        selectedPlatform,
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
      if (!matched) setShowNewMessagesBanner(true);
      scheduleInboxTabsMetaRefresh();
    });

    return () => {
      unsubscribe();
    };
  }, [
    accessToken,
    updateOrAddMessage,
    queryClient,
    selectedPlatform,
    inboxDebouncedSearch,
  ]);

  useEffect(() => {
    clearUnreadInbox();
  }, [clearUnreadInbox]);

  useEffect(() => {
    setShowNewMessagesBanner(false);
  }, [selectedPlatform, debouncedSearch]);

  const tabUnreadCount = useCallback(
    (tabId: string) => {
      if (tabsMeta?.[tabId]) {
        return tabsMeta[tabId].unread_threads_total;
      }
      const pl = (m: InboxMessage) => (m.platform || '').toLowerCase();
      const unread = (m: InboxMessage) => m.unread;
      const rows = flatMessages.length ? flatMessages : messages;
      switch (tabId) {
        case 'all':
          return rows.filter(unread).length;
        case 'whatsapp':
          return rows.filter((m) => unread(m) && pl(m) === 'whatsapp').length;
        case 'linkedin':
          return rows.filter((m) => unread(m) && pl(m) === 'linkedin').length;
        case 'instagram':
          return rows.filter((m) => unread(m) && pl(m) === 'instagram').length;
        case 'gmail':
          return rows.filter((m) => unread(m) && ['gmail', 'email'].includes(pl(m))).length;
        case 'outlook':
          return rows.filter((m) => unread(m) && pl(m) === 'outlook').length;
        case 'telegram':
          return rows.filter((m) => unread(m) && pl(m) === 'telegram').length;
        case 'erpnext':
          return rows.filter((m) => unread(m) && pl(m) === 'erpnext').length;
        default:
          return 0;
      }
    },
    [tabsMeta, messages, flatMessages]
  );

  // Long press and swipe handlers (unchanged)
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
      setSwipeState(prev => ({ ...prev, offsetX: diff, isSwiping: true }));
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
      archiveMessage(swipeState.messageId);
      pruneThreadFromInboxPageCaches(queryClient, swipeState.messageId);
      toast({ description: "Message archived" });
    } else if (swipeState.offsetX > SWIPE_THRESHOLD) {
      const msgId = swipeState.messageId;
      const msg = flatMessages.find(m => m.id === msgId) ?? messages.find(m => m.id === msgId);
      if (msg) {
        if(msg.unread) {
           markAsRead(msg.id, msg.roomId, msg.normalizedPhone, msg.identityKey);
        }
        toast({ description: msg.unread ? "Marked as read" : "Already read" });
      }
    }
    setSwipeState({ messageId: null, offsetX: 0, startX: 0, isSwiping: false });
  }, [selectionMode, swipeState, flatMessages, messages, toast, handleLongPressEnd, archiveMessage, markAsRead, queryClient]);

  const handleMouseDown = useCallback((e: React.MouseEvent, messageId: string) => {
    if (selectionMode) return;
    handleLongPressStart(messageId);
  }, [selectionMode, handleLongPressStart]);

  const handleMouseUp = useCallback(() => {
    handleLongPressEnd();
  }, [handleLongPressEnd]);

  const toggleSelection = useCallback((messageId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  const handleRowClick = useCallback((message: InboxMessage) => {
    if (selectionMode) {
      toggleSelection(message.id);
    } else if (!swipeState.isSwiping) {
      if (['email', 'outlook', 'gmail'].includes(message.platform)) {
        // Optimistically clear unread dot in the infinite cache so UI won't revert on refetch.
        patchInboxInfiniteCache(
          queryClient,
          selectedPlatform,
          inboxDebouncedSearch,
          (c) => String(c.id) === message.id,
          (c) => ({ ...c, unread_count: 0, email_status: 'READ' })
        );
        // Persist local read state and sync backend thread read.
        markAsRead(message.id, message.roomId, message.normalizedPhone, message.identityKey);
        try {
          const { accessToken } = useAuthStore.getState();
          void fetch(`${API_BASE_URL}/inbox/thread/${encodeURIComponent(message.id)}/read`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        } catch {
          // ignore; optimistic UI already applied
        }

        const realId = message.id.startsWith('email-')
          ? message.id.replace(/^email-/, '')
          : message.id;
        navigate(`/inbox/email/${realId}?platform=${encodeURIComponent(message.platform)}`);
      } else if (message.platform === 'whatsapp' && message.roomId) {
        const roomParam = encodeURIComponent(message.roomId);
        const phoneParam = message.sender.phone
          ? `&phone=${encodeURIComponent(message.sender.phone)}`
          : '';
        navigate(`/inbox/chat/wa?room=${roomParam}&name=${encodeURIComponent(message.sender.name)}${phoneParam}`);
      } else if (message.platform === 'instagram' && message.roomId) {
        navigate(`/inbox/chat/ig?room=${encodeURIComponent(message.roomId)}&name=${encodeURIComponent(message.sender.name)}`);
      } else if (message.platform === 'linkedin' && message.roomId) {
        const avatarParam = message.sender.avatar ? `&avatar=${encodeURIComponent(message.sender.avatar)}` : '';
        navigate(
          `/inbox/chat/li?chat_id=${encodeURIComponent(message.roomId)}&name=${encodeURIComponent(message.sender.name)}${avatarParam}`
        );
      } else if (message.platform === 'telegram' && message.roomId) {
        const avatarParam = message.sender.avatar ? `&avatar=${encodeURIComponent(message.sender.avatar)}` : '';
        navigate(`/inbox/chat/${message.id}?name=${encodeURIComponent(message.sender.name)}${avatarParam}`);
      } else {
        navigate(`/inbox/chat/${message.id}`);
      }
    }
  }, [selectionMode, swipeState.isSwiping, toggleSelection, navigate, markAsRead, queryClient, selectedPlatform, inboxDebouncedSearch]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const markSelectedAsRead = useCallback(() => {
    toast({ description: `${selectedIds.size} message(s) marked as read` });
    exitSelectionMode();
  }, [selectedIds, toast, exitSelectionMode]);

  const archiveSelected = useCallback(() => {
    toast({ description: `${selectedIds.size} message(s) archived` });
    exitSelectionMode();
  }, [selectedIds, toast, exitSelectionMode]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return (
    <PageShell
      title="Inbox"
      toolbar={
        <div className="w-full min-w-0 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-muted/50 pl-9 pr-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </motion.div>

          <div className="flex items-center gap-3">
            <span className="shrink-0 text-[10px] font-bold tracking-widest text-muted-foreground/50 uppercase">Connect</span>
            <div className="scrollbar-hide flex gap-1.5 overflow-x-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'whatsapp', label: 'WhatsApp' },
                { id: 'linkedin', label: 'LinkedIn' },
                { id: 'instagram', label: 'Instagram' },
                { id: 'gmail', label: 'Gmail' },
                { id: 'outlook', label: 'Outlook' },
                { id: 'telegram', label: 'Telegram' },
                { id: 'erpnext', label: 'ERPNext' },
              ].map((filter) => {
                const config = platformConfig[filter.id] || DEFAULT_PLATFORM;
                const Icon = config.icon;

                const unreadCount = tabUnreadCount(filter.id);

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setSelectedPlatform(filter.id)}
                    className={cn(
                      'relative flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all',
                      selectedPlatform === filter.id
                        ? 'border-foreground bg-foreground text-background shadow-sm'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30 hover:bg-muted'
                    )}
                  >
                    {filter.id !== 'all' && <Icon className="h-3 w-3" />}
                    {filter.label}
                    {unreadCount > 0 && (
                      <span className={cn(
                        'ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                        selectedPlatform === filter.id
                          ? 'bg-background text-foreground'
                          : 'bg-primary text-primary-foreground'
                      )}>
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      }
    >
      <main className="w-full min-w-0 space-y-6 pb-8 pt-0">
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
                <button onClick={markSelectedAsRead} className="px-3 py-1.5 text-sm bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-lg transition-colors">
                  Mark Read
                </button>
                <button onClick={archiveSelected} className="px-3 py-1.5 text-sm bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-lg transition-colors">
                  Archive
                </button>
                <button onClick={exitSelectionMode} className="p-1.5 hover:bg-primary-foreground/20 rounded-lg transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {isPending && flatMessages.length === 0 ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-20"
            >
              <LoadingSpinner size="lg" label="Messages are syncing…" />
            </motion.div>
          ) : isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ErrorBanner 
                message={
                  (error instanceof Error && error.message)
                    ? error.message
                    : "We couldn't load your inbox. Messages are syncing in the background — try again in a moment."
                }
                onRetry={() => void refetch()} 
              />
            </motion.div>
          ) : (totalFiltered ?? flatMessages.length) === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              {showWizard ? (
                <div className="py-8">
                  <OnboardingWizard onComplete={() => setShowWizard(false)} />
                </div>
              ) : (
                <EmptyInbox 
                  onAddService={() => setShowWizard(true)}
                  onOpenSettings={() => navigate('/connections')}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
            >
              {isFetching && flatMessages.length > 0 && (
                <div className="border-b border-border/60 bg-muted/40 px-4 py-2 text-center text-xs font-medium text-muted-foreground">
                  Messages are syncing…
                </div>
              )}
              {showNewMessagesBanner && (
                <div className="border-b border-border/60 bg-primary/10 px-4 py-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">New messages</span>
                  <button
                    type="button"
                    className="text-sm font-semibold text-primary hover:underline"
                    onClick={() => {
                      setShowNewMessagesBanner(false);
                      void queryClient.resetQueries({
                        queryKey: inboxPageQueryKey(selectedPlatform, inboxDebouncedSearch),
                      });
                    }}
                  >
                    Refresh list
                  </button>
                </div>
              )}
              <AnimatePresence>
                {flatMessages.map((message, index) => {
                  const platformKey = (message.platform || 'email').toLowerCase();
                  const platform = platformConfig[platformKey] || DEFAULT_PLATFORM;
                  const PlatformIcon = platform.icon;
                  const isSelected = selectedIds.has(message.id);
                  const isBeingSwiped = swipeState.messageId === message.id;
                  const swipeOffset = isBeingSwiped ? swipeState.offsetX : 0;
                  const isRemoving = removingId === message.id;

                  return (
                    <motion.div
                      key={message.id}
                      layout="position"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: isRemoving ? 0 : 1,
                        x: isRemoving ? -300 : 0,
                        height: isRemoving ? 0 : 'auto'
                      }}
                      exit={{ opacity: 0, x: -300, height: 0 }}
                      transition={{
                        duration: 0.2,
                        layout: { duration: 0.2 }
                      }}
                      className={cn(
                        'relative overflow-hidden group',
                        index !== flatMessages.length - 1 && 'border-b border-border/50'
                      )}
                    >
                      {/* Swipe Backgrounds */}
                      <div
                        className="absolute inset-y-0 right-0 bg-destructive flex items-center justify-end px-6 transition-opacity"
                        style={{ opacity: swipeOffset < -20 ? Math.min(1, Math.abs(swipeOffset) / 100) : 0 }}
                      >
                        <div className="flex items-center gap-2 text-destructive-foreground">
                          <Archive className="h-5 w-5" />
                          <span className="font-semibold text-sm">Archive</span>
                        </div>
                      </div>

                      <div
                        className="absolute inset-y-0 left-0 bg-primary flex items-center justify-start px-6 transition-opacity"
                        style={{ opacity: swipeOffset > 20 ? Math.min(1, swipeOffset / 100) : 0 }}
                      >
                        <div className="flex items-center gap-2 text-primary-foreground">
                          <MailOpen className="h-5 w-5" />
                          <span className="font-semibold text-sm">{message.unread ? 'Mark Read' : 'Unread'}</span>
                        </div>
                      </div>

                      {/* Content Row */}
                      <div
                        className={cn(
                          'flex items-start gap-4 p-5 cursor-pointer transition-all bg-card relative',
                          'hover:bg-muted/30 active:scale-[0.99] transition-transform duration-100',
                          isSelected && 'bg-primary/5',
                          selectionMode && 'select-none'
                        )}
                        style={{
                          transform: `translateX(${swipeOffset}px)`,
                          transition: swipeState.isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
                        }}
                        onClick={() => handleRowClick(message)}
                        onTouchStart={(e) => handleTouchStart(e, message.id)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onMouseDown={(e) => handleMouseDown(e, message.id)}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      >
                        {/* Selector indicator */}
                        {selectionMode && (
                          <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="flex-shrink-0 self-center pr-2"
                          >
                            <div className={cn(
                              'h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all',
                              isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                            )}>
                              {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                            </div>
                          </motion.div>
                        )}

                        {/* Avatar Column */}
                        <div className="relative flex-shrink-0">
                          <Avatar
                            initials={message.sender.initials}
                            src={message.sender.avatar}
                            size="lg"
                            className="ring-2 ring-background border border-border/20 shadow-sm"
                          />
                          <div className={cn(
                            'absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center border-2 border-background shadow-md backdrop-blur-sm',
                            platform.bgColor
                          )}>
                            <PlatformIcon className="h-3 w-3 text-white" />
                          </div>
                        </div>

                        {/* Text Detail Column */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <h4 className={cn(
                              'truncate text-[16px] tracking-tight',
                              message.unread ? 'text-foreground font-bold' : 'text-foreground/80 font-semibold'
                            )}>
                              {highlightText(formatSenderName(message.sender.name), searchQuery)}
                            </h4>
                            <span className={cn(
                              'text-[12px] flex-shrink-0 font-medium',
                              message.unread ? 'text-primary' : 'text-muted-foreground/70'
                            )}>
                              {message.timestamp}
                            </span>
                          </div>

                          {/* Subject / Context */}
                          {['gmail', 'outlook', 'email'].includes(message.platform) ? (
                            <div className="space-y-0.5">
                              {message.subject && (
                                <p className={cn(
                                  "text-[14px] truncate leading-tight",
                                  message.unread ? "font-bold text-foreground" : "font-semibold text-muted-foreground/80"
                                )}>
                                  {highlightText(message.subject, searchQuery)}
                                </p>
                              )}
                              <p className="text-[14px] text-muted-foreground/90 line-clamp-1 leading-normal font-medium">
                                {highlightText(cleanPreview(message.preview) || 'No preview', searchQuery)}
                              </p>
                            </div>
                          ) : (
                            <p className={cn(
                              "text-[14px] line-clamp-2 text-muted-foreground/90 leading-snug font-medium"
                            )}>
                              {highlightText(cleanPreview(message.preview) || 'No messages yet', searchQuery)}
                            </p>
                          )}
                        </div>

                        {/* Unread indicators */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0 self-center">
                          {message.unread && (
                            <div className={cn(
                              "rounded-full flex items-center justify-center shadow-sm",
                              message.platform === 'whatsapp' ? "bg-[#25D366]" : "bg-blue-500",
                              message.unreadCount && message.unreadCount > 1 ? "h-5 min-w-[20px] px-1.5" : "h-2.5 w-2.5"
                            )}>
                              {message.unreadCount && message.unreadCount > 1 && (
                                <span className="text-[10px] font-black text-white">
                                  {message.unreadCount}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {hasNextPage && (
                <div
                  ref={loadMoreSentinelRef}
                  className="py-4 flex justify-center text-xs text-muted-foreground min-h-[48px]"
                >
                  {isFetchingNextPage ? 'Loading more…' : '\u00a0'}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </PageShell>
  );
}