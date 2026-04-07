import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageCircle, MessageSquare, Linkedin, Mail, X, Check, Archive, MailOpen, Loader2, Instagram, Building2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TopBar } from '@/components/TopBar';
import { Avatar } from '@/components/Avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUnreadStore } from '@/stores/unreadStore';
import { useAuthStore } from '@/stores/authStore';
import { useInboxStore, type InboxMessage } from '@/stores/inboxStore';
import { API_BASE_URL, API_HOST_URL } from '@/lib/api-client';
import { formatPhone } from '@/lib/utils';
import { telegramWS } from '@/lib/telegramWebSocket';
import { whatsappWS } from '@/lib/whatsappWebSocket';

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
  const { messages, setMessages, addMessages, setLoading, markFetched, shouldRefetch, isLoading, updateOrAddMessage, markAsRead } = useInboxStore();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [localMessages, setLocalMessages] = useState<InboxMessage[]>([]);
  const [swipeState, setSwipeState] = useState<SwipeState>({
    messageId: null,
    offsetX: 0,
    startX: 0,
    isSwiping: false,
  });
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { accessToken } = useAuthStore();
  const { toast } = useToast();
  const { clearUnreadInbox } = useUnreadStore();
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

  const [tgOffset, setTgOffset] = useState(0);
  const [hasMoreTg, setHasMoreTg] = useState(true);
  const [isFetchingTg, setIsFetchingTg] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Unified Inbox Data Fetching
  // ============================================================================
  const fetchAllData = useCallback(async () => {
    if (!accessToken) return;

    console.log('[Inbox] Fetching unified inbox data...');
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/inbox/`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        throw new Error(`Inbox fetch failed: ${response.status}`);
      }

      const json = await response.json();
      const chats = json.chats || [];
      console.log('[Inbox] Unified chats received:', chats.length);

      // Convert to InboxMessage format
      const inboxMessages: InboxMessage[] = chats.map((chat: any) => {
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

      setMessages(inboxMessages);
      markFetched();
      setTgOffset(20); // Reset for potential infinite scroll on TG if still used
    } catch (error) {
      console.error('[Inbox] Unified fetch error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages. Please refresh.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken, setLoading, setMessages, markFetched, toast]);

  useEffect(() => {
    if (shouldRefetch() || messages.length === 0) {
      fetchAllData();
    }
  }, [shouldRefetch, messages.length, fetchAllData]);

  // ============================================================================
  // Instagram Auto-refresh (fallback until IG WebSocket is ready)
  // ============================================================================
  useEffect(() => {
    if (!accessToken) return;

    const intervalId = setInterval(async () => {
      console.log('[Inbox] Auto-refreshing inbox...');
      fetchAllData();
    }, 60000); // Increased to 1 min to be gentler

    return () => clearInterval(intervalId);
  }, [accessToken, fetchAllData]);

  // ============================================================================
  // WhatsApp Real-time Updates via WebSocket
  // ============================================================================
  useEffect(() => {
    if (!accessToken) return;

    whatsappWS.connect(accessToken);

    const unsubscribe = whatsappWS.onMessage((msg) => {
      console.log('[Inbox] Received real-time WhatsApp message:', msg);

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
    });

    return () => {
      unsubscribe();
    };
  }, [accessToken, updateOrAddMessage]);

  // ============================================================================
  // Telegram Real-time Updates via WebSocket
  // ============================================================================
  useEffect(() => {
    if (!accessToken) return;

    // 1. Connect
    telegramWS.connect(accessToken);

    // 2. Subscribe
    const unsubscribe = telegramWS.onMessage((msg) => {
      console.log('[Inbox] Received real-time Telegram message:', msg);

      // Update global store
      updateOrAddMessage(
        'telegram',
        msg.chat_id,
        msg.contact_name,
        msg.text,
        new Date(msg.timestamp)
      );
    });

    return () => {
      unsubscribe();
      // We don't necessarily want to disconnect here if the user just navigates away
      // but stayed in the app. However, since this is a page-level effect:
      // if we want it global, it should be in App.tsx. 
      // For now, let's keep it here but maybe don't disconnect if we want background updates.
      // But for correctness of "this page", unsubscribe is enough for UI.
    };
  }, [accessToken, updateOrAddMessage]);

  // Telegram infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMoreTg && !isFetchingTg) {
          setIsFetchingTg(true);
          // Fallback infinite scroll for TG if needed, but for now we rely on unified fetch
          setIsFetchingTg(false);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMoreTg, isFetchingTg, tgOffset]);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    clearUnreadInbox();
  }, [clearUnreadInbox]);

  const filteredMessages = localMessages.filter((msg) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query ||
      msg.sender.name.toLowerCase().includes(query) ||
      msg.preview.toLowerCase().includes(query) ||
      (msg.subject && msg.subject.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (selectedPlatform !== 'all') {
      if (selectedPlatform === 'whatsapp') {
        if (msg.platform !== 'whatsapp') return false;
      } else if (selectedPlatform === 'gmail') {
        if (msg.platform !== 'gmail') return false;
      } else if (selectedPlatform === 'outlook') {
        if (msg.platform !== 'outlook') return false;
      } else if (selectedPlatform === 'telegram') {
        if (msg.platform !== 'telegram') return false;
      } else if (selectedPlatform === 'instagram') {
        if (msg.platform !== 'instagram') return false;
      } else if ((selectedPlatform as string) === 'erpnext') {
        if ((msg.platform as string) === 'erpnext') return true;
      }
    }

    return true;
  });

  const getCount = (tab: 'all' | 'whatsapp' | 'email') => {
    if (tab === 'all') return localMessages.length;
    if (tab === 'whatsapp') return localMessages.filter(m => m.platform === 'whatsapp').length;
    return localMessages.filter(m => ['email', 'gmail', 'outlook'].includes((m.platform || '').toLowerCase())).length;
  };

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
      toast({ description: "Message archived" });
    } else if (swipeState.offsetX > SWIPE_THRESHOLD) {
      const msgId = swipeState.messageId;
      const msg = localMessages.find(m => m.id === msgId);
      if (msg) {
        setLocalMessages(prev =>
          prev.map(m => m.id === msgId ? { ...m, unread: !m.unread } : m)
        );
        toast({ description: msg.unread ? "Marked as read" : "Marked as unread" });
      }
    }
    setSwipeState({ messageId: null, offsetX: 0, startX: 0, isSwiping: false });
  }, [selectionMode, swipeState, localMessages, toast, handleLongPressEnd]);

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
      if (message.unread) {
        markAsRead(message.id, message.roomId, message.normalizedPhone, message.identityKey);
      }

      if (['email', 'outlook', 'gmail'].includes(message.platform)) {
        navigate(`/inbox/email/${message.id}`);
      } else if (message.platform === 'whatsapp' && message.roomId) {
        const roomParam = encodeURIComponent(message.roomId);
        const phoneParam = message.sender.phone
          ? `&phone=${encodeURIComponent(message.sender.phone)}`
          : '';
        navigate(`/inbox/chat/wa?room=${roomParam}&name=${encodeURIComponent(message.sender.name)}${phoneParam}`);
      } else if (message.platform === 'instagram' && message.roomId) {
        navigate(`/inbox/chat/ig?room=${encodeURIComponent(message.roomId)}&name=${encodeURIComponent(message.sender.name)}`);
      } else if (message.platform === 'telegram' && message.roomId) {
        const avatarParam = message.sender.avatar ? `&avatar=${encodeURIComponent(message.sender.avatar)}` : '';
        navigate(`/inbox/chat/${message.id}?name=${encodeURIComponent(message.sender.name)}${avatarParam}`);
      } else {
        navigate(`/inbox/chat/${message.id}`);
      }
    }
  }, [selectionMode, swipeState.isSwiping, toggleSelection, navigate]);

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
    <div className="min-h-screen bg-background pb-24 pt-0">
      <TopBar title="Inbox" />
      {/* Filter Bar - from api integrate but styled to fit under TopBar */}
      <main className="max-w-5xl mx-auto px-6 pt-0 pb-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </motion.div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest shrink-0">Connect</span>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {[
              { id: 'all', label: 'All' },
              { id: 'whatsapp', label: 'WhatsApp' },
              { id: 'gmail', label: 'Gmail' },
              { id: 'outlook', label: 'Outlook' },
              { id: 'telegram', label: 'Telegram' },
              { id: 'erpnext', label: 'ERPNext' },
            ].map((filter) => {
              const config = platformConfig[filter.id] || DEFAULT_PLATFORM;
              const Icon = config.icon;

              const unreadCount = filter.id === 'all'
                ? localMessages.filter(m => m.unread).length
                : localMessages.filter(m => m.unread && m.platform === filter.id).length;

              return (
                <button
                  key={filter.id}
                  onClick={() => setSelectedPlatform(filter.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border relative",
                    selectedPlatform === filter.id
                      ? "bg-foreground text-background border-foreground shadow-sm"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/30"
                  )}
                >
                  {filter.id !== 'all' && <Icon className="h-3 w-3" />}
                  {filter.label}
                  {unreadCount > 0 && (
                    <span className={cn(
                      "ml-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                      selectedPlatform === filter.id
                        ? "bg-background text-foreground"
                        : "bg-primary text-primary-foreground"
                    )}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reverted Tabs UI to single list as per user request */}

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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-card rounded-2xl border border-border overflow-hidden"
        >
          <AnimatePresence>
            {filteredMessages.map((message, index) => {
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
                  initial={{ opacity: 0, x: -10 }}
                  animate={{
                    opacity: isRemoving ? 0 : 1,
                    x: isRemoving ? -300 : 0,
                    height: isRemoving ? 0 : 'auto'
                  }}
                  exit={{ opacity: 0, x: -300, height: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: isRemoving ? 0 : Math.min(index, 20) * 0.05
                  }}
                  className={cn(
                    'relative overflow-hidden',
                    index !== filteredMessages.length - 1 && 'border-b border-border'
                  )}
                >
                  <div
                    className="absolute inset-y-0 right-0 bg-destructive flex items-center justify-end px-6 transition-opacity"
                    style={{ opacity: swipeOffset < -20 ? Math.min(1, Math.abs(swipeOffset) / 100) : 0 }}
                  >
                    <div className="flex items-center gap-2 text-destructive-foreground">
                      <Archive className="h-5 w-5" />
                      <span className="font-medium">Archive</span>
                    </div>
                  </div>

                  <div
                    className="absolute inset-y-0 left-0 bg-primary flex items-center justify-start px-6 transition-opacity"
                    style={{ opacity: swipeOffset > 20 ? Math.min(1, swipeOffset / 100) : 0 }}
                  >
                    <div className="flex items-center gap-2 text-primary-foreground">
                      <MailOpen className="h-5 w-5" />
                      <span className="font-medium">{message.unread ? 'Read' : 'Unread'}</span>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'flex items-start gap-3 p-4 cursor-pointer transition-all bg-card relative',
                      'hover:bg-muted/50',
                      isSelected && 'bg-primary/10',
                      selectionMode && 'select-none'
                    )}
                    style={{
                      transform: `translateX(${swipeOffset}px)`,
                      transition: swipeState.isSwiping ? 'none' : 'transform 0.2s ease-out'
                    }}
                    onClick={() => handleRowClick(message)}
                    onTouchStart={(e) => handleTouchStart(e, message.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={(e) => handleMouseDown(e, message.id)}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <AnimatePresence>
                      {selectionMode && (
                        <motion.div
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.15 }}
                          className="flex-shrink-0 self-center"
                        >
                          <div
                            className={cn(
                              'h-5 w-5 rounded border-2 flex items-center justify-center transition-all',
                              isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative flex-shrink-0">
                      <Avatar
                        initials={message.sender.initials}
                        src={message.sender.avatar}
                        size="lg"
                        isGroup={message.isGroup || false}
                      />
                      <div
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full flex items-center justify-center border-2 border-card',
                          platform.bgColor
                        )}
                      >
                        <PlatformIcon className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <span
                          className={cn(
                            'truncate text-[17px]',
                            message.unread ? 'text-foreground font-semibold' : 'text-foreground font-medium'
                          )}
                        >
                          {highlightText(message.sender.name, searchQuery)}
                        </span>
                        <span
                          className={cn(
                            'text-[11px] flex-shrink-0 mt-1',
                            message.unread ? 'text-primary font-bold' : 'text-muted-foreground'
                          )}
                        >
                          {message.timestamp}
                        </span>
                      </div>

                      {/* Unified Gmail-style Layout */}
                      {['gmail', 'outlook', 'email'].includes(message.platform) ? (
                        <div className="mt-0.5">
                          {message.subject && (
                            <p className={cn(
                              "text-[14px] truncate leading-tight",
                              message.unread ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                            )}>
                              {highlightText(message.subject, searchQuery)}
                            </p>
                          )}
                          {message.email_direction && (
                            <span
                              className={cn(
                                "inline-flex items-center mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                message.email_direction === 'OUTGOING'
                                  ? "bg-success/10 text-success border-success/20"
                                  : "bg-primary/10 text-primary border-primary/20"
                              )}
                            >
                              {message.email_direction === 'OUTGOING' ? 'Sent' : 'Received'}
                            </span>
                          )}
                          <p className="text-[14px] text-muted-foreground line-clamp-1 mt-0 font-normal leading-normal">
                            {highlightText(cleanPreview(message.preview) || 'No preview available', searchQuery)}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-0.5">
                          <p className={cn(
                            "text-[14px] line-clamp-2 text-muted-foreground font-normal leading-snug"
                          )}>
                            {highlightText(cleanPreview(message.preview) || 'No messages yet', searchQuery)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0 self-center">
                      {message.unread && (
                        message.unreadCount && message.unreadCount > 1 ? (
                          <div className="h-5 min-w-5 px-1.5 rounded-full bg-[#25D366] flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">
                              {message.unreadCount}
                            </span>
                          </div>
                        ) : (
                          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredMessages.length === 0 && !isLoading && (
            <div className="p-8 text-center text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No messages found</p>
            </div>
          )}

          {isLoading && (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">Loading messages...</p>
            </div>
          )}

          <div ref={observerTarget} className="h-4 w-full flex items-center justify-center p-4">
            {isFetchingTg && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </motion.div>
      </main>
    </div>
  );
}