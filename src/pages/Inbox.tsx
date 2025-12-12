import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageCircle, Linkedin, Mail, X, Check, Archive, MailOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TopBar } from '@/components/TopBar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUnreadStore } from '@/stores/unreadStore';

interface InboxMessage {
  id: string;
  sender: {
    name: string;
    avatar?: string;
    initials: string;
  };
  platform: 'whatsapp' | 'linkedin' | 'email' | 'signal';
  subject?: string;
  preview: string;
  timestamp: string;
  unread: boolean;
  unreadCount?: number;
}

const initialMessages: InboxMessage[] = [
  {
    id: '1',
    sender: { name: 'Sarah Chen', initials: 'SC' },
    platform: 'whatsapp',
    preview: "Hey! Just wanted to follow up on our discussion about the AI integration. When would be a good time to chat?",
    timestamp: '10:45 AM',
    unread: true,
    unreadCount: 3,
  },
  {
    id: '2',
    sender: { name: 'John Investor', initials: 'JI' },
    platform: 'linkedin',
    preview: "Great meeting yesterday! I've reviewed the pitch deck and have some thoughts to share.",
    timestamp: '9:30 AM',
    unread: true,
  },
  {
    id: '3',
    sender: { name: 'Emily Rodriguez', initials: 'ER' },
    platform: 'email',
    subject: 'Q4 Product Roadmap',
    preview: "Hi team, Please find attached the updated roadmap for Q4. Key highlights include...",
    timestamp: 'Yesterday',
    unread: false,
  },
  {
    id: '4',
    sender: { name: 'Michael Chang', initials: 'MC' },
    platform: 'signal',
    preview: "The documents are ready for review. Let me know if you need any changes before the meeting.",
    timestamp: 'Yesterday',
    unread: true,
    unreadCount: 2,
  },
  {
    id: '5',
    sender: { name: 'Lisa Park', initials: 'LP' },
    platform: 'whatsapp',
    preview: "Thanks for the intro! Really looking forward to connecting with the team next week.",
    timestamp: 'Dec 8',
    unread: false,
  },
  {
    id: '6',
    sender: { name: 'David Kim', initials: 'DK' },
    platform: 'email',
    subject: 'Re: Technical Specifications',
    preview: "I've made the updates you requested. The new API endpoints are now documented in the wiki.",
    timestamp: 'Dec 8',
    unread: false,
  },
  {
    id: '7',
    sender: { name: 'Anna Martinez', initials: 'AM' },
    platform: 'linkedin',
    preview: "Loved your recent post about startup culture! Would love to connect and share insights.",
    timestamp: 'Dec 7',
    unread: false,
  },
];

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
  email: {
    icon: Mail,
    bgColor: 'bg-destructive',
    label: 'Email',
  },
  signal: {
    icon: MessageCircle,
    bgColor: 'bg-[#3A76F0]',
    label: 'Signal',
  },
};

interface SwipeState {
  messageId: string | null;
  offsetX: number;
  startX: number;
  isSwiping: boolean;
}

export default function Inbox() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<InboxMessage[]>(initialMessages);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [swipeState, setSwipeState] = useState<SwipeState>({
    messageId: null,
    offsetX: 0,
    startX: 0,
    isSwiping: false,
  });
  const [removingId, setRemovingId] = useState<string | null>(null);
  
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { clearUnreadInbox } = useUnreadStore();
  
  // Clear unread count when page mounts
  useEffect(() => {
    clearUnreadInbox();
  }, [clearUnreadInbox]);

  const filteredMessages = messages.filter(
    (msg) =>
      msg.sender.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (msg.subject && msg.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

  // Touch/Swipe handlers
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
    
    // Cancel long press if user starts swiping
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

    // Swipe left - Archive
    if (swipeState.offsetX < -SWIPE_THRESHOLD) {
      const msgId = swipeState.messageId;
      setRemovingId(msgId);
      
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== msgId));
        setRemovingId(null);
        toast({
          description: "Message archived",
        });
      }, 200);
    }
    // Swipe right - Toggle unread
    else if (swipeState.offsetX > SWIPE_THRESHOLD) {
      const msgId = swipeState.messageId;
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          const newUnread = !m.unread;
          return { ...m, unread: newUnread, unreadCount: newUnread ? 1 : undefined };
        }
        return m;
      }));
      
      const msg = messages.find(m => m.id === msgId);
      toast({
        description: msg?.unread ? "Message marked as read" : "Message marked as unread",
      });
    }

    setSwipeState({ messageId: null, offsetX: 0, startX: 0, isSwiping: false });
  }, [selectionMode, swipeState, messages, toast, handleLongPressEnd]);

  // Mouse handlers for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent, messageId: string) => {
    if (selectionMode) return;
    handleLongPressStart(messageId);
  }, [selectionMode, handleLongPressStart]);

  const handleMouseUp = useCallback(() => {
    handleLongPressEnd();
  }, [handleLongPressEnd]);

  // Selection mode handlers
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
      // Navigate to appropriate detail view based on platform
      if (message.platform === 'email') {
        navigate(`/inbox/email/${message.id}`);
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
    setMessages(prev => prev.map(m => 
      selectedIds.has(m.id) ? { ...m, unread: false, unreadCount: undefined } : m
    ));
    toast({
      description: `${selectedIds.size} message(s) marked as read`,
    });
    exitSelectionMode();
  }, [selectedIds, toast, exitSelectionMode]);

  const archiveSelected = useCallback(() => {
    setMessages(prev => prev.filter(m => !selectedIds.has(m.id)));
    toast({
      description: `${selectedIds.size} message(s) archived`,
    });
    exitSelectionMode();
  }, [selectedIds, toast, exitSelectionMode]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <TopBar title="Inbox" />

      <main className="px-4 py-4 space-y-4">
        {/* Search Bar */}
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

        {/* Selection Mode Header */}
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
                  onClick={markSelectedAsRead}
                  className="px-3 py-1.5 text-sm bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-lg transition-colors"
                >
                  Mark Read
                </button>
                <button
                  onClick={archiveSelected}
                  className="px-3 py-1.5 text-sm bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-lg transition-colors"
                >
                  Archive
                </button>
                <button
                  onClick={exitSelectionMode}
                  className="p-1.5 hover:bg-primary-foreground/20 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-card rounded-2xl border border-border overflow-hidden"
        >
          <AnimatePresence>
            {filteredMessages.map((message, index) => {
              const platform = platformConfig[message.platform];
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
                  transition={{ duration: 0.2, delay: isRemoving ? 0 : index * 0.05 }}
                  className={cn(
                    'relative overflow-hidden',
                    index !== filteredMessages.length - 1 && 'border-b border-border'
                  )}
                >
                  {/* Swipe Background - Left (Archive) */}
                  <div 
                    className="absolute inset-y-0 right-0 bg-destructive flex items-center justify-end px-6 transition-opacity"
                    style={{ opacity: swipeOffset < -20 ? Math.min(1, Math.abs(swipeOffset) / 100) : 0 }}
                  >
                    <div className="flex items-center gap-2 text-destructive-foreground">
                      <Archive className="h-5 w-5" />
                      <span className="font-medium">Archive</span>
                    </div>
                  </div>

                  {/* Swipe Background - Right (Toggle Unread) */}
                  <div 
                    className="absolute inset-y-0 left-0 bg-primary flex items-center justify-start px-6 transition-opacity"
                    style={{ opacity: swipeOffset > 20 ? Math.min(1, swipeOffset / 100) : 0 }}
                  >
                    <div className="flex items-center gap-2 text-primary-foreground">
                      <MailOpen className="h-5 w-5" />
                      <span className="font-medium">{message.unread ? 'Read' : 'Unread'}</span>
                    </div>
                  </div>

                  {/* Message Row */}
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
                    {/* Checkbox (Selection Mode) */}
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
                              isSelected
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground/40'
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Avatar with Platform Badge */}
                    <div className="relative flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-cyan-400/20 flex items-center justify-center">
                        <span className="text-sm font-semibold text-foreground">
                          {message.sender.initials}
                        </span>
                      </div>
                      {/* Platform Badge */}
                      <div
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full flex items-center justify-center border-2 border-card',
                          platform.bgColor
                        )}
                      >
                        <PlatformIcon className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            'font-semibold truncate',
                            message.unread ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {message.sender.name}
                        </span>
                        <span
                          className={cn(
                            'text-xs flex-shrink-0',
                            message.unread ? 'text-primary font-medium' : 'text-muted-foreground'
                          )}
                        >
                          {message.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {message.subject && (
                          <span className="font-medium text-foreground">{message.subject}: </span>
                        )}
                        {message.preview}
                      </p>
                    </div>

                    {/* Unread Indicator */}
                    {message.unread && (
                      <div className="flex-shrink-0 self-center">
                        {message.unreadCount && message.unreadCount > 1 ? (
                          <div className="h-5 min-w-5 px-1.5 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-[10px] font-bold text-primary-foreground">
                              {message.unreadCount}
                            </span>
                          </div>
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredMessages.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No messages found</p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
