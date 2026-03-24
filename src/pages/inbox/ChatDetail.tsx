import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MoreVertical, Plus, Sparkles, Send, MessageCircle, Linkedin, Check, CheckCheck, Clock, Camera, FileText, MapPin, User, Mic, X, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatPhone } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useSwipeable } from 'react-swipeable';
import { useAuthStore } from '@/stores/authStore';
import { useInboxStore } from '@/stores/inboxStore';
import { API_BASE_URL, API_HOST_URL } from '@/lib/api-client';
import { Avatar } from '@/components/Avatar';

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
    type: 'image' | 'document';
    url?: string;
  };
  mxc_uri?: string;
}

interface ContactInfo {
  id: string;
  name: string;
  initials: string;
  platform: 'whatsapp' | 'linkedin' | 'signal' | 'telegram';
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
  // ✅ Robust Room ID extraction from URL
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('room');
  const contactNameFromParams = searchParams.get('name');
  const phoneFromParams = searchParams.get('phone');
  const avatarFromParams = searchParams.get('avatar');
  const bridgeId = searchParams.get('bridge_id');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const pollingErrorCountRef = useRef(0);
  const MAX_POLLING_ERRORS = 3;

  const messagesEndRef = useRef<HTMLDivElement>(null);
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
  const markAsRead = useInboxStore((state) => state.markAsRead);

  // Mark as read when opened
  useEffect(() => {
    if (contactId) {
      markAsRead(`wa-room-${roomId || contactId}`);
    } else if (roomId) {
      markAsRead(`wa-room-${roomId}`);
    }
  }, [contactId, roomId, markAsRead]);

  // Dynamic contact based on params or sample
  const [dynamicContact, setDynamicContact] = useState<ContactInfo | null>(null);

  // Use dynamic contact if available, otherwise fall back to sample
  const contact = dynamicContact || sampleContacts[contactId || '1'] || sampleContacts['1'];
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

        const chatMessages: ChatMessage[] = msgs.map((msg: any) => {
          const direction = (msg.direction || '').toUpperCase();
          const isOutgoing = direction === 'OUTGOING';

          return {
            id: msg.id,
            type: isOutgoing ? 'outgoing' : 'incoming',
            text: msg.text || msg.body || '',
            timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            status: isOutgoing ? 'delivered' : undefined,
            message_type: msg.message_type,
            media_url: msg.media_url ? `${API_HOST_URL}${msg.media_url}` : undefined,
            media_mimetype: msg.media_mimetype,
            mxc_uri: msg.mxc_uri,
            sender_name: msg.sender_name,
          };
        });
        setMessages(chatMessages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [roomId, accessToken]);
  // No messages.length — uses ref instead

  const fetchTgMessages = useCallback(async (isLoadMore = false) => {
    if (!contactId || !contactId.startsWith('telegram-') || !accessToken) return;
    const tgChatId = contactId.replace('telegram-', '');

    setIsLoadingMessages(true);
    try {
      const limit = 20;
      // const currentOffset = isLoadMore ? msgOffset : 0; // msgOffset is not defined, removing for now

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://knudge-api-dev.finbyz.com'}/api/v1/telegram/messages/${tgChatId}?limit=${limit}`, // Removed offset
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (response.ok) {
        const data = await response.json();
        const chatMessages: ChatMessage[] = data.map((msg: any) => {
          const direction = (msg.direction || '').toUpperCase();
          return {
            id: msg.id,
            type: direction === 'OUTGOING' ? 'outgoing' : 'incoming',
            text: msg.text,
            timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            status: direction === 'OUTGOING' ? 'sent' : undefined
          };
        });

        // if (data.length < limit) { // Removed hasMoreMessages state
        //   setHasMoreMessages(false);
        // }

        if (isLoadMore) {
          setMessages(prev => [...chatMessages, ...prev]);
          // setMsgOffset(prev => prev + limit); // Removed msgOffset state
        } else {
          setMessages(chatMessages);
          // setMsgOffset(limit); // Removed msgOffset state
          // setHasMoreMessages(data.length === limit); // Removed hasMoreMessages state
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [contactId, accessToken]); // Removed msgOffset from dependencies

  // Polling for new messages every 10 seconds
  useEffect(() => {
    if (!roomId || !accessToken) return;

    const intervalId = setInterval(async () => {
      // 1. Skip if already loading or tab is hidden
      if (isLoadingMessages || document.visibilityState !== 'visible') return;

      // 2. Stop if too many errors
      if (pollingErrorCountRef.current >= MAX_POLLING_ERRORS) {
        console.warn("Stopping message polling due to repeated errors.");
        clearInterval(intervalId);
        return;
      }

      const decodedRoomId = decodeURIComponent(roomId);
      try {
        const response = await fetch(
          `${API_BASE_URL}/whatsapp/messages/${encodeURIComponent(decodedRoomId)}?limit=10&offset=0`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (response.ok) {
          pollingErrorCountRef.current = 0; // Reset on success
          const json = await response.json();
          const data = Array.isArray(json) ? json : (json.messages || []);

          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs: ChatMessage[] = [];

            data.forEach((msg: any) => {
              const id = msg.id;
              if (id && !existingIds.has(id)) {
                const direction = (msg.direction || '').toUpperCase();
                const isOutgoing = direction === 'OUTGOING' || direction === 'outgoing';
                newMsgs.push({
                  id,
                  type: isOutgoing ? 'outgoing' : 'incoming',
                  text: msg.text || msg.body || '',
                  timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                  status: isOutgoing ? 'delivered' : undefined,
                  message_type: msg.message_type,
                  media_url: msg.media_url ? `${API_HOST_URL}${msg.media_url}` : undefined,
                  media_mimetype: msg.media_mimetype,
                  mxc_uri: msg.mxc_uri,
                  sender_name: msg.sender_name,
                });
              }
            });

            if (newMsgs.length > 0) {
              return [...prev, ...newMsgs.reverse()];
            }
            return prev;
          });
        } else {
          pollingErrorCountRef.current++;
        }
      } catch (e) {
        pollingErrorCountRef.current++;
        console.error("Polling error:", e);
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [roomId, accessToken, isLoadingMessages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    // Removed hasMoreMessages check as it's no longer used for Telegram
    if (scrollTop === 0 && !isLoadingMessages) {
      const scrollHeightBefore = e.currentTarget.scrollHeight;
      const fetchFunc = contact.platform === 'telegram' ? fetchTgMessages : fetchWaMessages;
      fetchFunc(true).then(() => {
        if (e.currentTarget) {
          e.currentTarget.scrollTop = e.currentTarget.scrollHeight - scrollHeightBefore;
        }
      });
    }
  };

  // Fetch WhatsApp or Telegram messages
  useEffect(() => {
    // ─── WhatsApp Logic (FIXED) ───────────────────────────────────────────────
    if (roomId && accessToken) {
      // FIX 1: Don't gate on contactNameFromParams — always set a contact so
      //         the chat opens even when ?name= is missing from the URL.
      const safeName = contactNameFromParams?.trim() || 'Unknown';

      // FIX 2: Compute initials safely — never do string[0] on a possibly-empty value.
      const nameParts = safeName.split(/\s+/).filter(Boolean);
      const initials =
        nameParts.length >= 2
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : safeName.slice(0, 2).toUpperCase() || '?';

      setDynamicContact({
        id: contactId || 'wa',
        name: safeName,   // FIX 3: always a real string, never null/undefined
        initials,
        platform: 'whatsapp',
        lastSeen: 'WhatsApp',
        phone: phoneFromParams || undefined,
        avatar: avatarFromParams || undefined,
      });

      fetchWaMessages();
    }
    // Telegram Logic — completely unchanged
    else if (contactId && contactId.startsWith('telegram-') && accessToken) {
      const tgContactName = contactNameFromParams || 'Telegram User';

      setDynamicContact({
        id: contactId,
        name: tgContactName,
        initials: (tgContactName[0] || 'T').toUpperCase(),
        platform: "telegram",
        lastSeen: "Telegram"
      });

      fetchTgMessages(false);
    }
  }, [roomId, contactNameFromParams, phoneFromParams, avatarFromParams, contactId, accessToken, toast, fetchTgMessages, fetchWaMessages]);


  // Navigation logic removed as it was based on static mocks
  const goToPrevious = () => { };
  const goToNext = () => { };
  const hasPrevious = false;
  const hasNext = false;
  const currentIndex = 0;
  const totalMessages = messages.length;

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

  // Mark as read on mount
  useEffect(() => {
    toast({ description: 'Message marked as read' });
  }, [contactId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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
    const decodedRoomId = roomId ? decodeURIComponent(roomId) : (isTelegram ? contactId.replace('telegram-', '') : null);

    if (!decodedRoomId) {
      toast({
        description: "Missing ID",
        variant: "destructive"
      });
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(messageText);
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://knudge-api-dev.finbyz.com';
      let response: Response;
      if (isTelegram) {
        response = await fetch(`${import.meta.env.VITE_API_URL || 'https://knudge-api-dev.finbyz.com'}/api/v1/telegram/send`, {
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
      } else {
        // WhatsApp
        response = await fetch(`${API_BASE_URL}/bridges/whatsapp/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: messageText,
            room_id: decodedRoomId,
            bridge_id: bridgeId, // Pass bridge_id if available
          }),
        });
      }

      const result = await response.json();

      if (response.ok) {
        // Update local message with real ID from backend if available
        const realId = result.event_id || tempId;

        setMessages(prev => prev.map(m =>
          m.id === tempId ? { ...m, id: realId, status: 'sent' } : m
        ));

        setTimeout(() => {
          setMessages(prev => prev.map(m =>
            m.id === realId ? { ...m, status: 'delivered' } : m
          ));
        }, 1500);

        toast({ description: "Message sent!" });
        setInputText(''); // Clear input again to be sure

        // Refresh messages from backend after send
        setTimeout(async () => {
          try {
            if (isTelegram) {
              // Refresh Telegram messages
              await fetchTgMessages(false);
            } else {
              // Refresh WhatsApp messages
              const response = await fetch(
                `${API_BASE_URL}/whatsapp/messages/${encodeURIComponent(decodedRoomId)}?limit=1000`,
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
                    timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: isOutgoing ? 'delivered' : undefined,
                    attachment: msg.attachment ? {
                      name: msg.attachment.name,
                      size: msg.attachment.size,
                      type: msg.attachment.type,
                      url: msg.attachment.url
                    } : undefined,
                  };
                });

                setMessages(chatMessages);
              }
            }
          } catch (error) {
            // Silent fail
          }
        }, 500);
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setInputText(messageText);
        toast({
          description: result.detail || "Failed to send",
          variant: "destructive"
        });
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(messageText);
      toast({
        description: "Network error",
        variant: "destructive"
      });
    }
  }, [inputText, accessToken, roomId, toast, contact.platform, fetchTgMessages]);


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
        <div className="max-w-4xl mx-auto h-16 flex items-center justify-between px-4">
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
              <h1 className="font-semibold text-foreground">{contact.name}</h1>
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
      <main className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        <div className="max-w-4xl mx-auto p-4 pb-[180px] md:pb-4 space-y-1">
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
                  key={message.id}
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
                          {message.sender_name}
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

                      {message.text && (
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
        <div className="w-full max-w-3xl mx-auto px-4 py-3">
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