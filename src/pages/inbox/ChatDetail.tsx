import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MoreVertical, Plus, Sparkles, Send, MessageCircle, Linkedin, Check, CheckCheck, Clock, Camera, FileText, MapPin, User, Mic, X, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatPhone, formatSenderName } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useSwipeable } from 'react-swipeable';
import { useAuthStore } from '@/stores/authStore';
import { useInboxStore } from '@/stores/inboxStore';
import { API_BASE_URL, API_HOST_URL } from '@/lib/api-client';
import { bridgesApi } from '@/api/bridges';
import { Avatar } from '@/components/Avatar';
import { whatsappWS } from '@/lib/whatsappWebSocket';
import { telegramWS } from '@/lib/telegramWebSocket';
import { useQueryClient } from '@tanstack/react-query';
import { patchInboxInfiniteCache } from '@/hooks/useInbox';

interface ChatMessage {
  id: number | string;
  type: 'incoming' | 'outgoing';
  text: string;
  timestamp: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read';
  media_url?: string;
  media_mimetype?: string;
  message_type?: string;
  sender_name?: string;
  direction?: string;
  from_me?: boolean;
  fromMe?: boolean;
  attachment?: {
    name: string;
    size: string;
    type: 'image' | 'document' | 'video' | 'audio';
    url?: string;
  };
  mxc_uri?: string;
}

interface ContactInfo {
  id: string;
  name: string;
  initials: string;
  platform: 'whatsapp' | 'linkedin' | 'signal' | 'telegram' | 'instagram';
  lastSeen: string;
  phone?: string;
  avatar?: string;
}

const platformConfig = {
  whatsapp: {
    icon: MessageCircle,
    bgColor: 'bg-[#25D366]',
    label: 'WhatsApp',
  },
  linkedin: {
    icon: Linkedin,
    bgColor: 'bg-[#0A66C2]',
    label: 'LinkedIn',
  },
  signal: {
    icon: MessageCircle,
    bgColor: 'bg-[#3A76F0]',
    label: 'Signal',
  },
  telegram: {
    icon: MessageCircle,
    bgColor: 'bg-[#229ED9]',
    label: 'Telegram',
  },
  instagram: {
    icon: Camera,
    bgColor: 'bg-[#E1306C]',
    label: 'Instagram',
  },
};

const sampleContacts: Record<string, ContactInfo> = {
  '1': { id: '1', name: 'Sarah Chen', initials: 'SC', platform: 'whatsapp', lastSeen: '5m ago' },
  '2': { id: '2', name: 'John Investor', initials: 'JI', platform: 'linkedin', lastSeen: '2h ago' },
  '4': { id: '4', name: 'Michael Chang', initials: 'MC', platform: 'signal', lastSeen: 'Online' },
  '5': { id: '5', name: 'Lisa Park', initials: 'LP', platform: 'whatsapp', lastSeen: '1d ago' },
};

const sampleMessages: ChatMessage[] = [
  { id: 1, type: 'incoming', text: "Hey! How's everything going?", timestamp: '10:30 AM' },
  { id: 2, type: 'outgoing', text: "Going great! Just wrapped up the presentation.", timestamp: '10:32 AM', status: 'read' },
  { id: 3, type: 'incoming', text: "That's awesome! How did it go?", timestamp: '10:33 AM' },
  { id: 4, type: 'outgoing', text: "Really well! The team loved the new direction. 🎉", timestamp: '10:35 AM', status: 'delivered' },
  { id: 5, type: 'incoming', text: "Congratulations! Want to celebrate over lunch?", timestamp: '10:40 AM' },
  { id: 6, type: 'outgoing', text: "Absolutely! How about Thursday?", timestamp: '10:42 AM', status: 'sent' },
  { id: 7, type: 'incoming', text: "Thursday works perfectly! Let me know what time suits you best.", timestamp: '10:45 AM' },
  { id: 8, type: 'incoming', text: "I know a great place downtown that just opened.", timestamp: '10:46 AM' },
];

// AI fallbacks removed - we prioritize real AI responses or error messages.

const attachmentMenuItems = [
  { id: 'photo', icon: Camera, label: 'Photo', color: 'text-blue-500', accept: 'image/*' },
  { id: 'document', icon: FileText, label: 'Document', color: 'text-green-500', accept: '.pdf,.doc,.docx,.txt' },
  { id: 'location', icon: MapPin, label: 'Location', color: 'text-red-500', comingSoon: true },
  { id: 'contact', icon: User, label: 'Contact', color: 'text-purple-500', comingSoon: true },
  { id: 'voice', icon: Mic, label: 'Voice Message', color: 'text-orange-500', comingSoon: true },
];

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// Mock inbox contacts for navigation
const mockInboxChats = ['1', '2', '4', '5'];

export default function ChatDetail() {
  const navigate = useNavigate();
  const { contactId } = useParams<{ contactId: string }>();
  const queryClient = useQueryClient();
  const parseRoomId = useCallback((room: string) => {
    const s = (room || '').trim();
    if (!s) return { provider: '', actualId: '' };
    if (s.includes('--')) {
      const [provider, ...rest] = s.split('--');
      const p = provider.trim().toLowerCase();
      // NOTE: Telegram group/channel ids are negative. In our URL scheme we encode the
      // leading '-' as the second dash in `telegram--100...`.
      let actual = rest.join('--');
      if (p === 'telegram' && actual && !actual.startsWith('-')) {
        actual = `-${actual}`;
      }
      return { provider: p, actualId: actual };
    }
    const [provider, ...rest] = s.split('-');
    return { provider: provider.trim().toLowerCase(), actualId: rest.join('-') };
  }, []);

  const parsed = parseRoomId(contactId || '');
  const parsedProvider = parsed.provider;
  const parsedActualId = parsed.actualId;

  if (import.meta.env.DEV) {
    // Temporary debug to validate parsing for ids like "telegram--100..."
    // eslint-disable-next-line no-console
    console.log('roomId:', contactId, 'provider:', parsedProvider, 'actualId:', parsedActualId);
  }
  // ✅ Robust Room ID extraction from URL
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('room');
  const linkedInChatId = searchParams.get('chat_id');
  const contactNameFromParams = searchParams.get('name');
  const phoneFromParams = searchParams.get('phone');
  const avatarFromParams = searchParams.get('avatar');
  const bridgeId = searchParams.get('bridge_id');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const attemptedSyncRef = useRef(false);
  const [chatIdentity, setChatIdentity] = useState<{ normalized_phone?: string; identity_key?: string }>({});
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const pollingErrorCountRef = useRef(0);
  const MAX_POLLING_ERRORS = 3;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileAccept, setFileAccept] = useState('');
  const { toast } = useToast();
  const { accessToken, user } = useAuthStore();
  const getMediaUrl = (mxc?: string, fallbackUrl?: string) => {
    // Fall back to backend media proxy URL with JWT token for auth
    if (fallbackUrl && accessToken) {
      return `${fallbackUrl}${fallbackUrl.includes('?') ? '&' : '?'}token=${accessToken}`;
    }
    return fallbackUrl || '';
  };
  const archiveMessage = useInboxStore((state) => state.archiveMessage);
  const toggleReadUnread = useInboxStore((state) => state.toggleReadUnread);
  const markAsRead = useInboxStore((state) => state.markAsRead);

  const inboxMessages = useInboxStore((state) => state.messages);
  const formatMessageTime = useCallback((rawTimestamp: any): string => {
    if (!rawTimestamp) return '';
    let date: Date;
    if (typeof rawTimestamp === 'number') {
      const ms = rawTimestamp > 1e11 ? rawTimestamp : rawTimestamp * 1000;
      date = new Date(ms);
    } else if (typeof rawTimestamp === 'string') {
      const ts = /\d{4}-\d{2}-\d{2}T/.test(rawTimestamp) && !/[zZ]|[+-]\d{2}:\d{2}$/.test(rawTimestamp)
        ? `${rawTimestamp}Z`
        : rawTimestamp;
      date = new Date(ts);
    } else {
      date = new Date(rawTimestamp);
    }
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
  }, []);

  const normalizeMediaUrl = useCallback((url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `${API_HOST_URL}${url}`;
    return `${API_HOST_URL}/${url}`;
  }, []);

  // Reset messages on ID change to avoid "ghosting" previous conversation
  useEffect(() => {
    setMessages([]);
    // We don't reset dynamicContact to null here IF we have enough info to keep it
    // But setting isLoadingMessages is correct as we are starting a new load
    setIsLoadingMessages(true);
    setLoadError(null);
    attemptedSyncRef.current = false;
  }, [contactId, roomId, linkedInChatId]);

  useEffect(() => {
    const isTelegram = parsedProvider === 'telegram';
    const isLinkedIn = contactId === 'li' && linkedInChatId;

    if (contactId === 'wa' && roomId) {
      const chatJid = decodeURIComponent(roomId);
      markAsRead(`wa-chat-${chatJid}`, chatJid);
      markAsRead(chatJid, chatJid);
    } else if (isTelegram && parsedActualId) {
      markAsRead(contactId || `telegram-${parsedActualId}`);
      markAsRead(parsedActualId);
      // Persist on backend so Telegram unread_count is no longer "incoming => unread forever".
      if (accessToken) {
        void fetch(`${API_BASE_URL}/telegram/chat/${encodeURIComponent(parsedActualId)}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => {
          /* ignore */
        });
      }

      // Optimistically clear unread dot in cached inbox pages.
      const threadId = contactId || `telegram-${parsedActualId}`;
      patchInboxInfiniteCache(
        queryClient,
        'all',
        '',
        (c) => String(c.id) === String(threadId),
        (c) => ({ ...c, unread_count: 0 })
      );
      patchInboxInfiniteCache(
        queryClient,
        'telegram',
        '',
        (c) => String(c.id) === String(threadId),
        (c) => ({ ...c, unread_count: 0 })
      );
    } else if (contactId === 'ig' && roomId) {
      markAsRead(`ig-chat-${roomId}`, roomId);
    } else if (isLinkedIn) {
      markAsRead(`li-chat-${linkedInChatId}`, linkedInChatId);
    }

    const decodedRoom = roomId ? decodeURIComponent(roomId) : '';
    const currentMsg = inboxMessages.find(
      (m) =>
        (roomId && (m.roomId === roomId || m.roomId === decodedRoom)) ||
        (linkedInChatId && m.platform === 'linkedin' && m.roomId === linkedInChatId) ||
        m.id === contactId ||
        (roomId && m.id === `wa-chat-${decodedRoom}`)
    );
    if (currentMsg) {
      markAsRead(currentMsg.id, currentMsg.roomId, currentMsg.normalizedPhone, currentMsg.identityKey);
    }
  }, [contactId, roomId, linkedInChatId, parsedProvider, parsedActualId, accessToken, markAsRead, inboxMessages, queryClient]);

  // Dynamic contact based on params or sample
  const [dynamicContact, setDynamicContact] = useState<ContactInfo | null>(null);

  // Use dynamic contact if available; otherwise build from URL params for provider routes.
  const inferredTelegramContact: ContactInfo | null =
    parsedProvider === 'telegram'
      ? {
          id: contactId || 'telegram',
          name: contactNameFromParams || 'Telegram',
          initials: ((contactNameFromParams || 'T')[0] || 'T').toUpperCase(),
          platform: 'telegram',
          lastSeen: 'Telegram',
          avatar: avatarFromParams || undefined,
        }
      : null;

  const contact =
    dynamicContact ||
    inferredTelegramContact ||
    (contactId && contactId.length < 5 ? (sampleContacts[contactId] || sampleContacts['1']) : null);
  
  if (!contact && isLoadingMessages) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!contact) {
      return (
          <div className="min-h-screen bg-background flex items-center justify-center p-4 text-center">
              <div>
                <p className="text-muted-foreground text-lg">Chat not found</p>
                <Button variant="link" onClick={() => navigate('/inbox')} className="mt-2">Back to Inbox</Button>
              </div>
          </div>
      );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-center">
        <div className="max-w-md">
          <p className="text-muted-foreground text-lg">Failed to load chat</p>
          <p className="text-sm text-muted-foreground/80 mt-1">{loadError}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setLoadError(null);
                setIsLoadingMessages(true);
                if (parsedProvider === 'telegram') void fetchTgMessages(false);
                else if (contactId === 'wa' && roomId) void fetchWaMessages();
                else if (contactId === 'li' && linkedInChatId) void fetchLiMessages();
                else if (contactId === 'ig' && roomId) void fetchIgMessages();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button variant="ghost" onClick={() => navigate('/inbox')}>
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const platform = platformConfig[contact.platform];
  const PlatformIcon = platform.icon;

  // Telegram State & Logic

  const fetchWaMessages = useCallback(async () => {
    if (!roomId || !accessToken) return;
    const decodedRoomId = decodeURIComponent(roomId);
    setIsLoadingMessages(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/whatsapp/messages/${encodeURIComponent(decodedRoomId)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        // Handle both old array format and new object format
        const msgs = Array.isArray(data) ? data : (data.messages || []);
        setChatIdentity({
          normalized_phone: data.normalized_phone,
          identity_key: data.identity_key
        });

        const chatMessages: ChatMessage[] = msgs.map((msg: any) => {
          const direction = (msg.direction || '').toUpperCase();
          const isOutgoing = direction === 'OUTGOING';

          return {
            id: msg.id,
            type: isOutgoing ? 'outgoing' : 'incoming',
            text: msg.text || msg.body || '',
            timestamp: formatMessageTime(msg.timestamp),
            status: isOutgoing ? 'delivered' : undefined,
            message_type: msg.message_type,
            media_url: msg.media_url ? `${API_HOST_URL}${msg.media_url}?token=${accessToken}` : undefined,
            media_mimetype: msg.media_mimetype,
            mxc_uri: msg.mxc_uri,
            sender_name: msg.sender_name,
            attachment: msg.attachment
              ? {
                name: msg.attachment.name || 'Attachment',
                size: msg.attachment.size || '',
                type: msg.attachment.type || 'document',
                url: normalizeMediaUrl(msg.attachment.url),
              }
              : undefined,
          };
        });
        setMessages(chatMessages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [roomId, accessToken, formatMessageTime, normalizeMediaUrl]);
  // No messages.length — uses ref instead

  const fetchTgMessages = useCallback(async (isLoadMore = false) => {
    if (parsedProvider !== 'telegram' || !parsedActualId || !accessToken) return;
    const tgChatId = parsedActualId;

    setIsLoadingMessages(true);
    try {
      const limit = 20;
      // eslint-disable-next-line no-console
      console.log('Fetching Telegram messages for:', tgChatId);
      // const currentOffset = isLoadMore ? msgOffset : 0; // msgOffset is not defined, removing for now

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(
        `${API_BASE_URL}/telegram/messages/${encodeURIComponent(tgChatId)}?limit=${limit}`,
        { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal }
      ).finally(() => clearTimeout(t));
      if (!response.ok) {
        const msg = `Failed to load Telegram chat (${response.status})`;
        setLoadError(msg);
        return;
      }

      const data = await response.json();
        // Handle both simple array and object results
        const rows = Array.isArray(data) ? data : (data.messages || []);
        
        const chatMessages: ChatMessage[] = rows.map((msg: any) => {
          const direction = (msg.direction || '').toUpperCase();
          return {
            id: msg.id,
            type: direction === 'OUTGOING' ? 'outgoing' : 'incoming',
            text: msg.text,
            timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            status: direction === 'OUTGOING' ? 'sent' : undefined,
            media_url: msg.media_url ? `${API_HOST_URL}${msg.media_url}?token=${accessToken}` : undefined,
            media_mimetype: msg.media_mimetype,
          };
        });

        // if (data.length < limit) { // Removed hasMoreMessages state
        //   setHasMoreMessages(false);
        // }

      if (rows.length === 0 && !attemptedSyncRef.current) {
        attemptedSyncRef.current = true;
        try {
          await bridgesApi.syncTelegram();
          // try again after sync
          const r2 = await fetch(
            `${API_BASE_URL}/telegram/messages/${encodeURIComponent(tgChatId)}?limit=${limit}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (r2.ok) {
            const j2 = await r2.json();
            const rrows = Array.isArray(j2) ? j2 : (j2.messages || []);
            const chatMessages2: ChatMessage[] = rrows.map((msg: any) => {
              const direction = (msg.direction || '').toUpperCase();
              return {
                id: msg.id,
                type: direction === 'OUTGOING' ? 'outgoing' : 'incoming',
                text: msg.text,
                timestamp: msg.timestamp
                  ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '',
                status: direction === 'OUTGOING' ? 'sent' : undefined,
                media_url: msg.media_url ? `${API_HOST_URL}${msg.media_url}?token=${accessToken}` : undefined,
                media_mimetype: msg.media_mimetype,
              };
            });
            setMessages(chatMessages2);
            return;
          }
        } catch (e) {
          // ignore; we show empty state below
        }
      }

      if (isLoadMore) setMessages(prev => [...chatMessages, ...prev]);
      else setMessages(chatMessages);
    } catch (e) {
      console.error(e);
      setLoadError(e instanceof Error ? e.message : 'Failed to load chat');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [parsedProvider, parsedActualId, accessToken, formatMessageTime]);

  const fetchLiMessages = useCallback(async () => {
    if (!linkedInChatId || !accessToken) return;
    setIsLoadingMessages(true);
    try {
      const rows = await bridgesApi.getLinkedInChatMessages(linkedInChatId);
      const chatMessages: ChatMessage[] = rows.map((msg) => {
        const direction = (msg.direction || '').toUpperCase();
        const isOutgoing = direction === 'OUTGOING';
        return {
          id: msg.id,
          type: isOutgoing ? 'outgoing' : 'incoming',
          text: msg.text || '',
          timestamp: formatMessageTime(msg.timestamp),
          status: isOutgoing ? 'sent' : undefined,
        };
      });
      setMessages(chatMessages);
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        description: 'Could not load LinkedIn messages',
      });
    } finally {
      setIsLoadingMessages(false);
    }
  }, [linkedInChatId, accessToken, formatMessageTime, toast]);

  const fetchIgMessages = useCallback(async () => {
    if (!roomId || !accessToken) return;
    setIsLoadingMessages(true);
    try {
      const rows = await bridgesApi.getInstagramChatMessages(roomId);
      const chatMessages: ChatMessage[] = rows.map((msg) => {
        const direction = (msg.direction || '').toUpperCase();
        const isOutgoing = direction === 'OUTGOING';
        return {
          id: msg.id,
          type: isOutgoing ? 'outgoing' : 'incoming',
          text: msg.content || msg.text || '',
          timestamp: formatMessageTime(msg.timestamp),
          status: isOutgoing ? 'sent' : undefined,
        };
      });
      setMessages(chatMessages);
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        description: 'Could not load Instagram messages',
      });
    } finally {
      setIsLoadingMessages(false);
    }
  }, [roomId, accessToken, formatMessageTime, toast]);

  // Real-time message updates via WebSocket
  useEffect(() => {
    if (contactId !== 'wa' || !roomId || !accessToken) return;

    // Connect to WebSocket
    whatsappWS.connect(accessToken);

    const unsubscribe = whatsappWS.onMessage((msg) => {
      // 1. Only handle messages for the CURRENT room
      // Matches by room_id, normalized_phone, or identity_key for robust cross-JID support
      const isMatch =
        msg.room_id === roomId ||
        (msg.normalized_phone && msg.normalized_phone === chatIdentity.normalized_phone) ||
        (msg.identity_key && msg.identity_key === chatIdentity.identity_key);

      if (!isMatch) return;

      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        if (existingIds.has(msg.id)) return prev;

        const isOutgoing = msg.type === 'outgoing';
        const newMsg: ChatMessage = {
          id: msg.id,
          type: msg.type,
          text: msg.text,
          timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: (msg.status as any) || 'delivered',
          message_type: msg.message_type,
          media_url: msg.media_url ? (msg.media_url.startsWith('http') ? msg.media_url : `${API_HOST_URL}${msg.media_url}?token=${accessToken}`) : undefined,
          media_mimetype: msg.media_mimetype,
          sender_name: msg.sender_name,
          from_me: isOutgoing,
          fromMe: isOutgoing,
        };

        return [...prev, newMsg];
      });

      // Scroll to bottom when new message arrives
      setTimeout(() => {
        if (messagesContainerRef?.current) {
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    });

    return () => {
      unsubscribe();
    };
  }, [contactId, roomId, accessToken]);

  // Real-time Telegram message updates via WebSocket
  useEffect(() => {
    if (parsedProvider !== 'telegram' || !parsedActualId || !accessToken) return;
    const tgChatId = parsedActualId;

    // Connect to WebSocket
    telegramWS.connect(accessToken);

    const unsubscribe = telegramWS.onMessage((msg) => {
      // 1. Only handle messages for the CURRENT chat
      if (String(msg.chat_id) !== String(tgChatId)) return;

      setMessages(prev => {
        const existingIds = new Set(prev.map(m => String(m.id)));
        if (existingIds.has(String(msg.id))) return prev;

        const isOutgoing = msg.direction === 'OUTGOING';
        const newMsg: ChatMessage = {
          id: msg.id,
          type: isOutgoing ? 'outgoing' : 'incoming',
          text: msg.text,
          timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: isOutgoing ? 'sent' : undefined,
          media_url: msg.media_url ? (msg.media_url.startsWith('http') ? msg.media_url : `${API_HOST_URL}${msg.media_url}?token=${accessToken}`) : undefined,
          media_mimetype: msg.media_mimetype,
          sender_name: msg.contact_name,
        };

        return [...prev, newMsg];
      });

      // Scroll to bottom
      setTimeout(() => {
        if (messagesContainerRef?.current) {
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    });

    return () => {
      unsubscribe();
    };
  }, [parsedProvider, parsedActualId, accessToken]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    // Removed hasMoreMessages check as it's no longer used for Telegram
    if (scrollTop === 0 && !isLoadingMessages) {
      const scrollHeightBefore = e.currentTarget.scrollHeight;
      const fetchFunc =
        contact.platform === 'telegram'
          ? fetchTgMessages
          : contact.platform === 'linkedin'
            ? async () => {
                await fetchLiMessages();
              }
            : contact.platform === 'instagram'
              ? async () => {
                  await fetchIgMessages();
                }
              : fetchWaMessages;
      fetchFunc(true).then(() => {
        if (e.currentTarget) {
          e.currentTarget.scrollTop = e.currentTarget.scrollHeight - scrollHeightBefore;
        }
      });
    }
  };

  // Part 1: Setup Contact Identity (runs immediately without waiting for accessToken)
  useEffect(() => {
    if (!contactId) return;

    if (contactId === 'wa' && roomId) {
      const safeName = contactNameFromParams?.trim() || 'Unknown';
      const nameParts = safeName.split(/\s+/).filter(Boolean);
      const initials =
        nameParts.length >= 2
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : safeName.slice(0, 2).toUpperCase() || '?';

      setDynamicContact({
        id: contactId,
        name: safeName,
        initials,
        platform: 'whatsapp',
        lastSeen: 'WhatsApp',
        phone: phoneFromParams || undefined,
        avatar: avatarFromParams || undefined,
      });
    } else if (contactId === 'li' && linkedInChatId) {
      const safeName = contactNameFromParams?.trim() || 'LinkedIn';
      const nameParts = safeName.split(/\s+/).filter(Boolean);
      const initials =
        nameParts.length >= 2
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : safeName.slice(0, 2).toUpperCase() || '?';

      setDynamicContact({
        id: contactId,
        name: safeName,
        initials,
        platform: 'linkedin',
        lastSeen: 'LinkedIn',
        avatar: avatarFromParams || undefined,
      });
    } else if (parsedProvider === 'telegram') {
      const tgContactName = contactNameFromParams || 'Telegram User';

      setDynamicContact({
        id: contactId,
        name: tgContactName,
        initials: (tgContactName[0] || 'T').toUpperCase(),
        platform: "telegram",
        lastSeen: "Telegram",
        avatar: avatarFromParams || undefined,
      });
    } else if (contactId === 'ig' && roomId) {
      const safeName = contactNameFromParams?.trim() || 'Instagram User';
      setDynamicContact({
        id: contactId,
        name: safeName,
        initials: (safeName[0] || 'I').toUpperCase(),
        platform: 'instagram',
        lastSeen: 'Instagram',
        avatar: avatarFromParams || undefined,
      });
    }
  }, [
    contactId,
    roomId,
    linkedInChatId,
    contactNameFromParams,
    phoneFromParams,
    avatarFromParams,
  ]);

  // Part 2: Fetch Messages (runs when accessToken is available)
  useEffect(() => {
    if (!accessToken) {
      // Prevent infinite loader when auth is missing/expired.
      setIsLoadingMessages(false);
      setLoadError('Please log in again to view this chat.');
      return;
    }

    if (contactId === 'wa' && roomId) {
      fetchWaMessages();
    } else if (contactId === 'li' && linkedInChatId) {
      void fetchLiMessages();
    } else if (parsedProvider === 'telegram') {
      fetchTgMessages(false);
    } else if (contactId === 'ig' && roomId) {
      fetchIgMessages();
    }
  }, [
    accessToken,
    contactId,
    roomId,
    linkedInChatId,
    parsedProvider,
    fetchTgMessages,
    fetchWaMessages,
    fetchLiMessages,
    fetchIgMessages,
  ]);


  // Navigation logic removed as it was based on static mocks
  // Navigation logic using inbox store
  const decodedRoomForNav = roomId ? decodeURIComponent(roomId) : '';
  const currentInboxIndex = inboxMessages.findIndex(
    (m) =>
      (contactId === 'wa' &&
        roomId &&
        (m.roomId === roomId || m.roomId === decodedRoomForNav)) ||
      (contactId === 'li' &&
        linkedInChatId &&
        m.platform === 'linkedin' &&
        m.roomId === linkedInChatId) ||
      m.id === `telegram-${contactId?.replace('telegram-', '')}` ||
      m.id === contactId
  );
  const hasPrevious = currentInboxIndex > 0;
  const hasNext = currentInboxIndex < inboxMessages.length - 1 && currentInboxIndex !== -1;
  const currentIndex = currentInboxIndex;
  const totalMessages = messages.length;
  const navigateToInboxMessage = (inboxMsg: any) => {
    console.log('navigating to:', inboxMsg.id, 'unread:', inboxMsg.unread, 'roomId:', inboxMsg.roomId);
    console.log('currentInboxIndex:', currentInboxIndex);
    console.log('inboxMessages count:', inboxMessages.length);
    // markAsRead pehle karo — navigate se pehle store update hona chahiye
    markAsRead(inboxMsg.id, inboxMsg.roomId, inboxMsg.normalizedPhone, inboxMsg.identityKey);

    // Email ke liye alag ID format use hota hai store mein
    if (['email', 'gmail', 'outlook'].includes(inboxMsg.platform)) {
      // Email store ID se bhi markAsRead karo
      const emailStoreId = inboxMsg.id.startsWith('email-') ? inboxMsg.id : `email-${inboxMsg.id}`;
      markAsRead(emailStoreId, inboxMsg.roomId, inboxMsg.normalizedPhone, inboxMsg.identityKey);
      setTimeout(() => navigate(`/inbox/email/${inboxMsg.id}`), 0);
    } else if (inboxMsg.platform === 'whatsapp' && inboxMsg.roomId) {
      const waStoreId = inboxMsg.id.startsWith('wa-chat-') ? inboxMsg.id : `wa-chat-${inboxMsg.roomId}`;
      markAsRead(waStoreId, inboxMsg.roomId, inboxMsg.normalizedPhone, inboxMsg.identityKey);
      const roomParam = encodeURIComponent(inboxMsg.roomId);
      const phoneParam = inboxMsg.sender?.phone
        ? `&phone=${encodeURIComponent(inboxMsg.sender.phone)}`
        : '';
      setTimeout(() => navigate(`/inbox/chat/wa?room=${roomParam}&name=${encodeURIComponent(inboxMsg.sender?.name || '')}${phoneParam}`), 0);
    } else if (inboxMsg.platform === 'linkedin' && inboxMsg.roomId) {
      const avatarParam = inboxMsg.sender?.avatar ? `&avatar=${encodeURIComponent(inboxMsg.sender.avatar)}` : '';
      setTimeout(
        () =>
          navigate(
            `/inbox/chat/li?chat_id=${encodeURIComponent(inboxMsg.roomId)}&name=${encodeURIComponent(inboxMsg.sender?.name || '')}${avatarParam}`
          ),
        0
      );
    } else if (inboxMsg.platform === 'instagram' && inboxMsg.roomId) {
      setTimeout(
        () =>
          navigate(
            `/inbox/chat/ig?room=${encodeURIComponent(inboxMsg.roomId)}&name=${encodeURIComponent(inboxMsg.sender?.name || '')}`
          ),
        0
      );
    } else if (inboxMsg.platform === 'telegram' && inboxMsg.roomId) {
      const avatarParam = inboxMsg.sender?.avatar ? `&avatar=${encodeURIComponent(inboxMsg.sender.avatar)}` : '';
      setTimeout(() => navigate(`/inbox/chat/${inboxMsg.id}?name=${encodeURIComponent(inboxMsg.sender?.name || '')}${avatarParam}`), 0);
    }
  };
  const goToPrevious = () => {
    if (!hasPrevious) return;
    navigateToInboxMessage(inboxMessages[currentInboxIndex - 1]);
  };
  const goToNext = () => {
    if (!hasNext) return;
    navigateToInboxMessage(inboxMessages[currentInboxIndex + 1]);
  };

  // Swipe handlers for navigation
  const navSwipeHandlers = useSwipeable({
    onSwipedLeft: () => hasNext && goToNext(),
    onSwipedRight: () => hasPrevious && goToPrevious(),
    trackMouse: false,
    trackTouch: true,
    delta: 80,
    preventScrollOnSwipe: false,
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' || e.key === 'k') goToPrevious();
      if (e.key === 'ArrowRight' || e.key === 'j') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      scrollToBottom('auto');
      return;
    }
    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);
    if (distanceFromBottom < 120) {
      scrollToBottom('smooth');
    }
  }, [messages]);

  const typeText = useCallback((text: string, callback?: () => void) => {
    // Aggressive cleaning
    const cleanText = (text || '').replace(/undefined/gi, '').trim();

    let index = 0;
    let currentBuildingText = '';
    setInputText('');

    const interval = setInterval(() => {
      if (index < cleanText.length) {
        currentBuildingText += cleanText[index];
        setInputText(currentBuildingText);
        index++;
      } else {
        clearInterval(interval);
        callback?.();
      }
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Catch-all safety for any "undefined" leaking into the input
  useEffect(() => {
    if (inputText && inputText.toString().toLowerCase().includes('undefined')) {
      const cleaned = inputText.toString().replace(/undefined/gi, '');
      if (cleaned !== inputText) {
        setInputText(cleaned);
      }
    }
  }, [inputText]);

  // Handle auto-resize when inputText changes programmatically (e.g. AI draft)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [inputText]);

  const handleAiSparkle = useCallback(async () => {
    setIsAiLoading(true);

    if (!inputText.trim()) {
      // STATE 1: Empty text - Generate draft using AI with chat history
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://knudge-api-dev.finbyz.com';
        // Sanitize history before sending to API to prevent learning "undefined"
        const historyForApi = messages.slice(-20).map(msg => ({
          type: msg.type,
          text: msg.text
        }));

        const response = await fetch(`${API_BASE_URL}/bridges/whatsapp/generate-reply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            contact_name: contact.name,
            history: historyForApi,
            room_id: roomId,
          }),
        });

        if (response.ok) {
          const data = await response.json();

          let cleanBody = (data.body || '').trim();

          // Aggressive "undefined" removal
          cleanBody = cleanBody.replace(/undefined/gi, '');

          // Clean extra spaces
          cleanBody = cleanBody.replace(/\s+/g, ' ').trim();

          setIsAiLoading(false);

          // Use the robust typeText helper
          typeText(cleanBody, () => {
            toast({
              description: "Draft generated",
            });
          });
        } else {
          toast({
            variant: "destructive",
            description: "Failed to generate AI draft",
          });
          setIsAiLoading(false);
        }
      } catch (error) {
        console.error('AI Sparkle error:', error);
        toast({
          variant: "destructive",
          description: "Network error while generating draft",
        });
        setIsAiLoading(false);
      }
    } else {
      // STATE 2: Has text - Polish/refine logic
      setOriginalText(inputText);
      const polished = polishText(inputText);
      setInputText(polished);
      setIsAiLoading(false);
      setShowUndo(true);
      toast({
        description: "Message polished",
      });
      setTimeout(() => setShowUndo(false), 3000);
    }
  }, [inputText, toast, typeText, messages, contact.name, accessToken]);

  const polishText = (text: string): string => {
    // Simple polish logic - in real app this would be AI
    const polished = text.charAt(0).toUpperCase() + text.slice(1);
    if (!polished.endsWith('!') && !polished.endsWith('?') && !polished.endsWith('.')) {
      return polished + '! Looking forward to it!';
    }
    return polished.replace(/yeah/gi, 'Yes').replace(/ok/gi, 'sounds great');
  };

  const handleUndo = () => {
    setInputText(originalText);
    setShowUndo(false);
  };



  const handleSend = useCallback(async () => {
    const messageText = inputText.trim();
    if (!messageText) {
      return;
    }

    const tempId = Date.now();
    const newMessage: ChatMessage = {
      id: tempId,
      type: 'outgoing',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'pending',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setShowUndo(false);

    const isTelegram = contact.platform === 'telegram';
    const isLinkedIn = contact.platform === 'linkedin';
    const decodedRoomId = roomId
      ? decodeURIComponent(roomId)
      : isTelegram
        ? contactId?.replace('telegram-', '') ?? null
        : null;

    if (isLinkedIn && !linkedInChatId) {
      toast({
        description: "Missing chat",
        variant: "destructive"
      });
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(messageText);
      return;
    }

    if (!isLinkedIn && !decodedRoomId) {
      toast({
        description: "Missing ID",
        variant: "destructive"
      });
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(messageText);
      return;
    }

    try {
      let ok = false;
      let realId: string | number = tempId;
      let errDetail: string | undefined;

      if (isLinkedIn && linkedInChatId) {
        // Try native first if connected, otherwise fallback to unipile (deprecating)
        const liStatus = await bridgesApi.getLinkedInStatus();
        if (liStatus.messaging_connected) {
          const sendResult = await bridgesApi.sendLinkedIn(linkedInChatId, messageText);
          ok = sendResult.status === 'success' || sendResult.status === 'ok';
          realId = sendResult.message_id ?? tempId;
        }
      } else if (isTelegram) {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://knudge-api-dev.finbyz.com'}/api/v1/telegram/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: messageText,
            chat_id: decodedRoomId,
          }),
        });
        const result = await response.json();
        ok = response.ok;
        realId = result.event_id || tempId;
        errDetail = typeof result.detail === 'string' ? result.detail : undefined;
      } else if (contact.platform === 'instagram') {
        const sendResult = await bridgesApi.sendInstagram(decodedRoomId || '', messageText);
        ok = sendResult.status === 'sent';
        realId = sendResult.message_id ?? tempId;
      } else {
        const response = await fetch(`${API_BASE_URL}/bridges/whatsapp/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: messageText,
            room_id: decodedRoomId,
            bridge_id: bridgeId,
          }),
        });
        const result = await response.json();
        ok = response.ok;
        realId = result.event_id || tempId;
        errDetail = typeof result.detail === 'string' ? result.detail : undefined;
      }

      if (ok) {
        setMessages(prev => prev.map(m =>
          m.id === tempId ? { ...m, id: realId, status: 'sent' } : m
        ));

        setTimeout(() => {
          setMessages(prev => prev.map(m =>
            m.id === realId ? { ...m, status: 'delivered' } : m
          ));
        }, 1500);

        toast({ description: "Message sent!" });
        setInputText('');

        setTimeout(async () => {
          try {
            if (isTelegram) {
              await fetchTgMessages(false);
            } else if (isLinkedIn) {
              await fetchLiMessages();
            } else if (contact.platform === 'instagram') {
              await fetchIgMessages();
            } else if (decodedRoomId) {
              const response = await fetch(
                `${API_BASE_URL}/whatsapp/messages/${encodeURIComponent(decodedRoomId)}?limit=50`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );

              if (response.ok) {
                const data = await response.json();
                const rawMessages = Array.isArray(data) ? data : (data.messages || []);
                const chatMessages: ChatMessage[] = rawMessages.map((msg: any, idx: number) => {
                  const direction = (msg.direction || '').toUpperCase();
                  const isOutgoing = direction === 'OUTGOING' || direction === 'outgoing';
                  const messageType = isOutgoing ? 'outgoing' : 'incoming';

                  return {
                    id: msg.event_id || msg.id || idx + 1,
                    type: messageType,
                    text: msg.text || msg.body || '',
                    timestamp: formatMessageTime(msg.timestamp),
                    status: isOutgoing ? 'delivered' : undefined,
                    attachment: msg.attachment ? {
                      name: msg.attachment.name,
                      size: msg.attachment.size,
                      type: msg.attachment.type,
                      url: normalizeMediaUrl(msg.attachment.url)
                    } : undefined,
                  };
                });

                setMessages(chatMessages);
              }
            }
          } catch {
            // Silent fail
          }
        }, 500);
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setInputText(messageText);
        toast({
          description: errDetail || "Failed to send",
          variant: "destructive"
        });
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(messageText);
      toast({
        description: error instanceof Error ? error.message : "Network error",
        variant: "destructive"
      });
    }
  }, [inputText, accessToken, roomId, linkedInChatId, toast, contact.platform, contactId, fetchTgMessages, fetchLiMessages, formatMessageTime, normalizeMediaUrl, bridgeId]);


  const renderStatus = (status?: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3 text-white/60 animate-pulse" />;
      case 'sent':
        return <Check className="h-3 w-3 text-white/80" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-white/80" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-cyan-300" />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col relative" {...navSwipeHandlers}>
      {/* Header - Stays sticky within the flex container's scroll context if main overflows, or just static at the top */}
      <header className="sticky top-0 z-50 bg-card border-b border-border flex-shrink-0">
        <div className="flex h-16 w-full min-w-0 items-center justify-between px-2 sm:px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inbox')}
              className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>

            <div className="relative">
              <Avatar initials={contact.initials} src={contact.avatar} size="md" />
              <div className={cn(
                'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center border-2 border-card',
                platform.bgColor
              )}>
                <PlatformIcon className="h-2 w-2 text-white" />
              </div>
            </div>

            <div>
              <h1 className="font-semibold text-foreground">{formatSenderName(contact.name)}</h1>
              <p className="text-xs text-muted-foreground">
                {contact.platform === 'whatsapp' ? (
                  roomId?.endsWith('@g.us')
                    ? 'Group Chat'
                    : (contact.phone ? formatPhone(contact.phone) : formatPhone((roomId || '').split('@')[0] || ''))
                ) : contact.lastSeen}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Message counter */}
            {messages.length > 0 && (
              <div className="bg-muted/80 px-2 py-0.5 rounded-full mr-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {messages.length} messages
                </span>
              </div>
            )}

            {/* Navigation arrows */}
            <button
              onClick={goToPrevious}
              disabled={!hasPrevious}
              className={cn(
                "p-2 rounded-full transition-colors",
                hasPrevious ? "hover:bg-muted" : "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={goToNext}
              disabled={!hasNext}
              className={cn(
                "p-2 rounded-full transition-colors",
                hasNext ? "hover:bg-muted" : "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button className="p-2 hover:bg-muted rounded-full transition-colors">
              <MoreVertical className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Swipe indicators */}
      <div className="fixed inset-y-0 left-0 w-1 pointer-events-none z-40">
        {hasPrevious && (
          <div className="absolute top-1/2 -translate-y-1/2 h-16 w-full bg-gradient-to-r from-primary/30 to-transparent rounded-r-full" />
        )}
      </div>
      <div className="fixed inset-y-0 right-0 w-1 pointer-events-none z-40">
        {hasNext && (
          <div className="absolute top-1/2 -translate-y-1/2 h-16 w-full bg-gradient-to-l from-primary/30 to-transparent rounded-l-full" />
        )}
      </div>

      {/* Messages */}
      <main
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
        ref={(el) => {
          messagesContainerRef.current = el;
        }}
      >
        <div className="w-full min-w-0 space-y-1 p-4 pb-[180px] md:pb-4">
          {/* Initial Loading State */}
          {isLoadingMessages && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Loading message history...</p>
            </div>
          )}


          <AnimatePresence>
            {messages.map((message, idx) => {
              const nextMsg = messages[idx + 1];
              const isOutgoing = message.type === 'outgoing' ||
                message.direction === 'OUTGOING' ||
                message.from_me === true ||
                message.fromMe === true;
              const isLastInGroup = !nextMsg || (nextMsg.type !== (isOutgoing ? 'outgoing' : 'incoming'));

              return (
                <motion.div
                  key={`${String(message.id)}-${String((message as any).timestamp_raw ?? message.timestamp ?? '')}-${idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'flex',
                    isOutgoing ? 'justify-end' : 'justify-start',
                    !isLastInGroup ? 'mb-1' : 'mb-3'
                  )}
                >
                  <div className="flex flex-col max-w-[70%]">
                    <div
                      className={cn(
                        'px-4 py-2.5 transition-all',
                        isOutgoing
                          ? 'bg-gradient-to-r from-primary to-cyan-500 text-white rounded-2xl rounded-tr-sm'
                          : 'bg-muted text-foreground rounded-2xl rounded-tl-sm'
                      )}
                    >
                      {/* Sender Name for groups */}
                      {!isOutgoing && roomId?.endsWith('@g.us') && message.sender_name && (
                        <div className="text-[11px] font-bold text-primary mb-0.5 px-1 truncate">
                          {formatSenderName(message.sender_name)}
                        </div>
                      )}

                      {/* Media / Attachment Preview */}
                      {(message.media_url || message.attachment) && (() => {
                        // Backend media (received WhatsApp messages)
                        if (message.media_url) {
                          const mime = message.media_mimetype || '';
                          const isImg = mime.startsWith('image/');
                          const isVideo = mime.startsWith('video/');
                          const isAudio = mime.startsWith('audio/');

                          const mediaUrl = getMediaUrl(message.mxc_uri, message.media_url);

                          if (isImg) {
                            return (
                              <div className="mb-2 -mx-2 -mt-1 overflow-hidden rounded-t-xl">
                                <img
                                  src={mediaUrl}
                                  alt="Photo"
                                  loading="lazy"
                                  className="w-full h-auto object-cover max-h-[400px] cursor-pointer hover:opacity-95 transition-opacity"
                                  onClick={() => setFullScreenImage(mediaUrl)}
                                />
                              </div>
                            );
                          } else if (message.message_type === 'sticker') {
                            return (
                              <div className="mb-2 flex justify-center">
                                <img
                                  src={mediaUrl}
                                  alt="Sticker"
                                  className="w-[160px] h-auto object-contain cursor-default"
                                  style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.1))' }}
                                />
                              </div>
                            );
                          } else if (isVideo) {
                            return (
                              <div className="mb-2 -mx-2 -mt-1 overflow-hidden rounded-t-xl bg-black">
                                <video
                                  src={mediaUrl}
                                  controls
                                  className="w-full h-auto max-h-[400px]"
                                />
                              </div>
                            );
                          } else if (isAudio) {
                            return (
                              <div className="mb-2">
                                <audio src={mediaUrl} controls className="w-full" />
                              </div>
                            );
                          } else {
                            // Document / other
                            return (
                              <div className={cn(
                                "flex items-center gap-2 p-3 rounded-xl mb-2 cursor-pointer transition-colors",
                                message.type === 'outgoing' ? 'bg-white/20 hover:bg-white/30' : 'bg-background hover:bg-muted'
                              )} onClick={() => {
                                window.open(mediaUrl, '_blank');
                              }}>
                                {/* <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-6 w-6 text-primary" />
                                </div> */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{message.text || 'Document'}</p>
                                  <p className="text-[10px] opacity-70 uppercase tracking-tight">Attachment</p>
                                </div>
                              </div>
                            );
                          }
                        }

                        // User-sent attachment (outgoing, local file) - This block is now effectively for received attachments only
                        if (message.attachment) {
                          if (message.attachment.type === 'image' && message.attachment.url) {
                            return (
                              <div className="mb-2 -mx-2 -mt-1 overflow-hidden rounded-t-xl">
                                <img src={message.attachment.url} alt={message.attachment.name} className="w-full h-auto object-cover max-h-[400px]" />
                              </div>
                            );
                          } else if (message.attachment.type === 'video' && message.attachment.url) {
                            return (
                              <div className="mb-2 -mx-2 -mt-1 overflow-hidden rounded-t-xl bg-black">
                                <video src={message.attachment.url} controls className="w-full h-auto max-h-[400px]" />
                              </div>
                            );
                          } else if (message.attachment.type === 'audio' && message.attachment.url) {
                            return (
                              <div className="mb-2">
                                <audio src={message.attachment.url} controls className="w-full" />
                              </div>
                            );
                          } else {
                            return (
                              <div className={cn(
                                "flex items-center gap-2 p-3 rounded-xl mb-2 transition-colors",
                                message.type === 'outgoing' ? 'bg-white/20 hover:bg-white/30' : 'bg-background hover:bg-muted'
                              )}>
                                {/* <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-6 w-6 text-primary" />
                                </div> */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{message.attachment.name}</p>
                                  <p className="text-[10px] opacity-70 uppercase tracking-tight">{/* formatFileSize(message.attachment.size) */}</p>
                                </div>
                              </div>
                            );
                          }
                        }
                        return null;
                      })()}

                      {message.text && !/^\[(document|video|audio|image|sticker|ptt|location|vcard|contact)\]$/i.test(message.text) && (
                        <p className="text-base leading-relaxed">{message.text}</p>
                      )}

                      {isLastInGroup && (
                        <div className={cn(
                          'flex items-center gap-1 mt-1',
                          isOutgoing ? 'justify-end' : 'justify-start'
                        )}>
                          <span className={cn(
                            'text-xs',
                            isOutgoing ? 'text-white/70' : 'text-muted-foreground'
                          )}>
                            {message.timestamp}
                          </span>
                          {message.type === 'outgoing' && renderStatus(message.status)}
                        </div>
                      )}
                    </div>

                    {/* Reply hint for incoming messages - OUTSIDE bubble, clickable */}
                    {/* Removed reply button */}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Image Viewer Modal */}
      <AnimatePresence>
        {fullScreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 md:p-10"
            onClick={() => setFullScreenImage(null)}
          >
            <button
              className="absolute top-6 right-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
              onClick={() => setFullScreenImage(null)}
            >
              <X className="h-6 w-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={fullScreenImage}
              alt="Full Screen"
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>


      {/* Hidden File Input */}
      {/* Removed hidden file input */}

      {/* Input Bar - Fixed above bottom nav on mobile (64px), Sticky bottom on desktop */}
      <div
        className="fixed bottom-[calc(64px+env(safe-area-inset-bottom,0px))] left-0 right-0 md:relative md:bottom-auto z-20 bg-card border-t border-border shadow-lg mt-auto"
      >
        <div className="w-full min-w-0 px-4 py-3">
          {/* File Preview */}
          {/* Removed file preview */}

          <div className="flex items-center gap-3">
            {/* Attachment Button - Fixed 44px */}
            {/* Removed attachment button */}

            {/* Text Input - Auto-expanding textarea */}
            <div className="flex-1 relative min-w-0">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                }}
                placeholder="Type a message..."
                className="w-full min-h-[40px] max-h-[200px] bg-muted rounded-2xl px-4 py-2.5 pr-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none overflow-y-auto transition-[height] duration-100"
                style={{ fontSize: '16px' }}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              {/* AI Sparkle Button - Inside input */}
              <button
                onClick={handleAiSparkle}
                disabled={isAiLoading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-primary text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-transform disabled:opacity-50"
                title={inputText.trim() === '' ? 'AI Draft' : 'AI Polish'}
              >
                {isAiLoading ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </button>

              {showUndo && (
                <button
                  onClick={handleUndo}
                  className="absolute right-12 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-foreground text-background font-medium rounded-full"
                >
                  ↶ Undo
                </button>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className={cn(
                "flex-shrink-0 h-11 w-11 rounded-full flex items-center justify-center transition-all",
                (inputText.trim())
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
              )}
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}