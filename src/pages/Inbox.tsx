import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageCircle, Linkedin, Mail, X, Check, Archive, MailOpen, Loader2, Instagram } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TopBar } from '@/components/TopBar';
import { Avatar } from '@/components/Avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUnreadStore } from '@/stores/unreadStore';
import { useAuthStore } from '@/stores/authStore';
import { useInboxStore, type InboxMessage } from '@/stores/inboxStore';
import { API_BASE_URL } from '@/lib/api-client';
import { formatPhone } from '@/lib/utils';

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
  signal: { icon: MessageCircle, bgColor: 'bg-[#3A76F0]', label: 'Signal' },
  gmail: { icon: Mail, bgColor: 'bg-[#EA4335]', label: 'Gmail' },
  telegram: { icon: MessageCircle, bgColor: 'bg-[#229ED9]', label: 'Telegram' },
  instagram: { icon: Instagram, bgColor: 'bg-[#E1306C]', label: 'Instagram' },
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
  const { messages, setMessages, addMessages, setLoading, markFetched, shouldRefetch, isLoading, updateOrAddMessage } = useInboxStore();
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

  const [tgOffset, setTgOffset] = useState(0);
  const [hasMoreTg, setHasMoreTg] = useState(true);
  const [isFetchingTg, setIsFetchingTg] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // FIXED: Comprehensive WhatsApp Chat Fetching
  // ============================================================================
  const fetchWhatsAppMessages = useCallback(async () => {
    if (!accessToken) return [];

    try {
      console.log('[Inbox] Fetching WhatsApp chats...');

      const response = await fetch(
        `${API_BASE_URL}/whatsapp/chats/`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        console.error('[Inbox] WhatsApp fetch failed:', response.status);
        return [];
      }

      const json = await response.json();
      const chats = (json.chats || []).filter((chat: any) => {
        const jid = String(chat.chat_id || chat.id || '').toLowerCase();
        const name = String(chat.display_name || chat.name || '').toLowerCase();
        // Hide WhatsApp status pseudo-chat from inbox list.
        if (jid.includes('status@broadcast')) return false;
        if (name === 'status') return false;
        return true;
      });
      console.log('[Inbox] Raw WhatsApp chats:', chats);

      // Convert to InboxMessage format
      const waMessages: InboxMessage[] = chats.map((chat: any) => {
        const msgDate = chat.last_message_time ? new Date(chat.last_message_time) : null;
        const validDate = msgDate && !isNaN(msgDate.getTime());

        // ✅ Fallback logic for preview: Use media emoji if text is empty
        let preview = chat.last_message_preview || '';
        const MEDIA_EMOJI: Record<string, string> = {
          "image": "📷 Photo",
          "audio": "🎤 Voice message",
          "video": "🎥 Video",
          "document": "📄 Document",
          "sticker": "😊 Sticker",
          "location": "📍 Location",
          "vcard": "👤 Contact",
          "contact": "👤 Contact",
        };

        if (!preview && chat.last_message_type) {
          preview = MEDIA_EMOJI[chat.last_message_type] || `📎 ${chat.last_message_type}`;
        }

        return {
          id: `wa-chat-${chat.id}`,
          sender: {
            name: chat.display_name || chat.name || chat.phone || 'WhatsApp User',
            avatar: chat.profile_picture_url || undefined,
            initials: (chat.display_name?.[0] || chat.name?.[0] || chat.phone?.[0] || 'W').toUpperCase(),
            phone: chat.phone || undefined,
          },
          platform: 'whatsapp' as const,
          preview: preview || 'No messages yet',
          timestamp: validDate ? formatGmailDate(msgDate!) : '',
          sortDate: validDate ? msgDate! : new Date(0),
          roomId: chat.chat_id || chat.id, // Canonical JID from backend
          unread: (chat.unread_count || 0) > 0,
          unreadCount: chat.unread_count || 0
        };
      });

      console.log('[Inbox] Processed WhatsApp chats:', waMessages.length);
      return waMessages;

    } catch (error) {
      console.error('[Inbox] WhatsApp fetch error:', error);
      return [];
    }
  }, [accessToken]);

  // ============================================================================
  // FIXED: Telegram Message Fetching
  // ============================================================================
  const fetchTelegramMessages = useCallback(async (offset: number) => {
    if (!accessToken) return [];

    try {
      const response = await fetch(
        `${API_BASE_URL}/telegram/messages?limit=20&offset=${offset}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) return [];

      const json = await response.json();
      const data = json.messages || [];
      const tgMessages: InboxMessage[] = data.map((msg: any) => {
        const msgDate = new Date(msg.timestamp * 1000);
        return {
          id: `telegram-${msg.chat_id}`,
          sender: {
            name: msg.contact_name || 'Telegram User',
            initials: (msg.contact_name?.[0] || 'T').toUpperCase()
          },
          platform: 'telegram',
          preview: msg.text || '',
          timestamp: formatGmailDate(msgDate),
          sortDate: msgDate,
          roomId: msg.chat_id,
          unread: msg.direction === 'incoming',
        };
      });

      if (tgMessages.length < 20) {
        setHasMoreTg(false);
      }
      return tgMessages;
    } catch (error) {
      console.error('[Inbox] Telegram fetch error:', error);
      return [];
    }
  }, [accessToken]);

  // ============================================================================
  // FIXED: Email Fetching
  // ============================================================================
  const fetchEmails = useCallback(async () => {
    if (!accessToken) return [];

    try {
      const response = await fetch(
        `${API_BASE_URL}/emails/?limit=50&direction=INCOMING`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) return [];

      const data = await response.json();
      console.log('[Inbox] Raw Email data:', data.slice(0, 5));
      const emailMessages: InboxMessage[] = data.map((email: any) => {
        const emailDate = email.sent_at ? new Date(email.sent_at) : new Date(0);
        const platform = (email.platform || 'email').toLowerCase();
        return {
          id: `email-${email.id}`,
          sender: {
            name: email.from_email.split('<')[0].replace(/"/g, '').trim() || email.from_email,
            initials: (email.from_email[0] || '?').toUpperCase()
          },
          platform: platform as any,
          subject: email.subject || '(No Subject)',
          preview: email.body_text || '',
          timestamp: formatGmailDate(emailDate, true),
          sortDate: emailDate,
          unread: email.status === 'RECEIVED',
        };
      });

      console.log('[Inbox] Processed Emails:', emailMessages.length);
      return emailMessages;
    } catch (error) {
      console.error('[Inbox] Email fetch error:', error);
      return [];
    }
  }, [accessToken]);

  // ============================================================================
  // Instagram DM Fetching
  // ============================================================================
  const fetchInstagramMessages = useCallback(async () => {
    if (!accessToken) return [];

    try {
      console.log('[Inbox] Fetching Instagram chats...');
      const response = await fetch(
        `${API_BASE_URL}/instagram/chats/`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) return [];

      const json = await response.json();
      const chats = json.chats || [];

      return chats.map((chat: any) => {
        const msgDate = chat.last_message_time ? new Date(chat.last_message_time) : null;
        const validDate = msgDate && !isNaN(msgDate.getTime());

        return {
          id: `ig-chat-${chat.id}`,
          sender: {
            name: chat.display_name || chat.username || 'Instagram User',
            avatar: chat.profile_pic_url || undefined,
            initials: (chat.display_name?.[0] || chat.username?.[0] || 'I').toUpperCase()
          },
          platform: 'instagram' as const,
          preview: chat.last_message_preview || 'No messages yet',
          timestamp: validDate ? formatGmailDate(msgDate!) : '',
          sortDate: validDate ? msgDate! : new Date(0),
          roomId: chat.id,
          unread: (chat.unread_count || 0) > 0,
          unreadCount: chat.unread_count || 0
        };
      });
    } catch (error) {
      console.error('[Inbox] Instagram fetch error:', error);
      return [];
    }
  }, [accessToken]);

  // ============================================================================
  // FIXED: Initial Data Loading with Auto-Refresh
  // ============================================================================
  useEffect(() => {
    const fetchAllData = async () => {
      if (!accessToken) return;

      console.log('[Inbox] Starting comprehensive data fetch...');
      setLoading(true);

      try {
        const [emails, whatsappMsgs, telegramMsgs, instagramMsgs] = await Promise.all([
          fetchEmails(),
          fetchWhatsAppMessages(),
          fetchTelegramMessages(0),
          fetchInstagramMessages()
        ]);

        console.log('[Inbox] Fetched:', {
          emails: emails.length,
          whatsapp: whatsappMsgs.length,
          telegram: telegramMsgs.length,
          instagram: instagramMsgs.length
        });

        const allMessages = [...emails, ...whatsappMsgs, ...telegramMsgs, ...instagramMsgs];

        if (allMessages.length > 0) {
          allMessages.sort((a, b) => {
            const dateA = a.sortDate ? new Date(a.sortDate).getTime() : 0;
            const dateB = b.sortDate ? new Date(b.sortDate).getTime() : 0;
            return dateB - dateA;
          });

          setMessages(allMessages);
          markFetched();
        }

        setTgOffset(20);
      } catch (error) {
        console.error('[Inbox] Fetch error:', error);
        toast({
          title: 'Error',
          description: 'Failed to load messages. Please refresh.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    if (shouldRefetch() || messages.length === 0) {
      fetchAllData();
    }
  }, [accessToken, shouldRefetch, messages.length]);

  // ============================================================================
  // FIXED: Auto-refresh every 30 seconds for new WhatsApp messages
  // ============================================================================
  useEffect(() => {
    if (!accessToken) return;

    const intervalId = setInterval(async () => {
      console.log('[Inbox] Auto-refreshing WhatsApp messages...');
      const freshWhatsAppMsgs = await fetchWhatsAppMessages();

      if (freshWhatsAppMsgs.length > 0) {
        // Update only WhatsApp messages, keep others
        const nonWhatsAppMsgs = messages.filter(m => m.platform !== 'whatsapp');
        const allMsgs = [...nonWhatsAppMsgs, ...freshWhatsAppMsgs];

        allMsgs.sort((a, b) => {
          const dateA = a.sortDate ? new Date(a.sortDate).getTime() : 0;
          const dateB = b.sortDate ? new Date(b.sortDate).getTime() : 0;
          return dateB - dateA;
        });

        setMessages(allMsgs);
      }

      console.log('[Inbox] Auto-refreshing Instagram messages...');
      const freshInstagramMsgs = await fetchInstagramMessages();
      if (freshInstagramMsgs.length > 0) {
        setMessages(prev => {
          const others = prev.filter(m => m.platform !== 'instagram');
          const combined = [...others, ...freshInstagramMsgs];
          return combined.sort((a, b) => {
            const dateA = a.sortDate ? new Date(a.sortDate).getTime() : 0;
            const dateB = b.sortDate ? new Date(b.sortDate).getTime() : 0;
            return dateB - dateA;
          });
        });
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, [accessToken, fetchWhatsAppMessages, messages, addMessages]);

  // Telegram infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMoreTg && !isFetchingTg) {
          setIsFetchingTg(true);
          const moreTg = await fetchTelegramMessages(tgOffset);
          if (moreTg.length > 0) {
            addMessages(moreTg);
            setTgOffset(prev => prev + 20);
          }
          setIsFetchingTg(false);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMoreTg, isFetchingTg, tgOffset, fetchTelegramMessages, addMessages]);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    clearUnreadInbox();
  }, [clearUnreadInbox]);

  const filteredMessages = localMessages.filter((msg) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;

    return (
      msg.sender.name.toLowerCase().includes(query) ||
      msg.preview.toLowerCase().includes(query) ||
      (msg.subject && msg.subject.toLowerCase().includes(query))
    );
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
        setLocalMessages(prev =>
          prev.map(m => m.id === message.id ? { ...m, unread: false } : m)
        );
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
        navigate(`/inbox/chat/${message.id}?name=${encodeURIComponent(message.sender.name)}`);
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
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </motion.div>

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
                        isGroup={message.platform === 'whatsapp' && message.id.includes('@g.us')}
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