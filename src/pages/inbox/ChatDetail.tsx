import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MoreVertical, Plus, Sparkles, Send, MessageCircle, Linkedin, Check, CheckCheck, Clock, Camera, FileText, MapPin, User, Mic, X, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useSwipeable } from 'react-swipeable';
import { useAuthStore } from '@/stores/authStore';

interface ChatMessage {
  id: number;
  type: 'incoming' | 'outgoing';
  text: string;
  timestamp: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read';
  attachment?: {
    name: string;
    size: string;
    type: 'image' | 'document';
    url?: string;
  };
}

interface ContactInfo {
  id: string;
  name: string;
  initials: string;
  platform: 'whatsapp' | 'linkedin' | 'signal';
  lastSeen: string;
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

const aiDraftResponses = [
  "That sounds perfect! How about noon? I'm flexible with the location.",
  "Great! I've heard good things about that place. Let's meet around 12:30?",
  "Looking forward to it! Thursday at noon works for me. Just send me the address!",
];

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
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('room');
  const contactNameFromParams = searchParams.get('name');

  const [messages, setMessages] = useState<ChatMessage[]>(sampleMessages);
  const [inputText, setInputText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ file: File; preview?: string; type: 'image' | 'document' } | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replyInstructions, setReplyInstructions] = useState('');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileAccept, setFileAccept] = useState('');
  const { toast } = useToast();
  const { accessToken } = useAuthStore();

  // Dynamic contact based on params or sample
  const [dynamicContact, setDynamicContact] = useState<ContactInfo | null>(null);

  // Use dynamic contact if available, otherwise fall back to sample
  const contact = dynamicContact || sampleContacts[contactId || '1'] || sampleContacts['1'];
  const platform = platformConfig[contact.platform];
  const PlatformIcon = platform.icon;

  // Fetch WhatsApp messages if roomId is provided
  useEffect(() => {
    if (roomId && contactNameFromParams && accessToken) {
      // Set contact info from params
      setDynamicContact({
        id: contactId || 'wa',
        name: contactNameFromParams,
        initials: contactNameFromParams[0]?.toUpperCase() || 'W',
        platform: 'whatsapp',
        lastSeen: 'WhatsApp'
      });

      // Fetch messages from API
      const fetchMessages = async () => {
        setIsLoadingMessages(true);
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/bridges/whatsapp/messages/${encodeURIComponent(roomId)}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (response.ok) {
            const data = await response.json();
            const chatMessages: ChatMessage[] = data.map((msg: any, idx: number) => ({
              id: idx + 1,
              type: msg.direction === 'OUTGOING' ? 'outgoing' : 'incoming',
              text: msg.body || '',
              timestamp: new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              status: msg.direction === 'OUTGOING' ? 'read' : undefined,
            }));
            setMessages(chatMessages);
          }
        } catch (error) {
          console.error('Failed to fetch WhatsApp messages:', error);
        } finally {
          setIsLoadingMessages(false);
        }
      };

      fetchMessages();
    }
  }, [roomId, contactNameFromParams, contactId, accessToken]);


  // Navigation between messages
  const currentIndex = mockInboxChats.indexOf(contactId || '1');
  const totalMessages = mockInboxChats.length;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < mockInboxChats.length - 1;

  const goToPrevious = useCallback(() => {
    if (hasPrevious) {
      navigate(`/inbox/chat/${mockInboxChats[currentIndex - 1]}`, { replace: true });
    }
  }, [hasPrevious, currentIndex, navigate]);

  const goToNext = useCallback(() => {
    if (hasNext) {
      navigate(`/inbox/chat/${mockInboxChats[currentIndex + 1]}`, { replace: true });
    }
  }, [hasNext, currentIndex, navigate]);

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
    let index = 0;
    setInputText('');
    const interval = setInterval(() => {
      if (index < text.length) {
        setInputText(prev => prev + text[index]);
        index++;
      } else {
        clearInterval(interval);
        callback?.();
      }
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const handleAiSparkle = useCallback(async () => {
    setIsAiLoading(true);

    if (!inputText.trim()) {
      // STATE 1: Empty text - Generate draft using AI with chat history
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

        // Convert messages to the format expected by the API
        const historyForApi = messages.map(msg => ({
          type: msg.type,
          text: msg.text
        }));

        const response = await fetch(`${apiUrl}/api/v1/bridges/whatsapp/generate-reply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            contact_name: contact.name,
            history: historyForApi,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setIsAiLoading(false);
          typeText(data.body || '', () => {
            toast({
              description: "Draft generated matching your style",
            });
          });
        } else {
          // Fallback to random draft if API fails
          const randomDraft = aiDraftResponses[Math.floor(Math.random() * aiDraftResponses.length)];
          setIsAiLoading(false);
          typeText(randomDraft, () => {
            toast({
              description: "Draft generated based on context",
            });
          });
        }
      } catch (error) {
        console.error('Failed to generate AI draft:', error);
        // Fallback to random draft
        const randomDraft = aiDraftResponses[Math.floor(Math.random() * aiDraftResponses.length)];
        setIsAiLoading(false);
        typeText(randomDraft, () => {
          toast({
            description: "Draft generated based on context",
          });
        });
      }
    } else {
      // STATE 2: Has text - Polish/refine
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

  const handleAttachmentClick = (item: typeof attachmentMenuItems[0]) => {
    if (item.comingSoon) {
      toast({ description: `${item.label} coming soon!` });
      setIsAttachmentMenuOpen(false);
      return;
    }

    setFileAccept(item.accept || '');
    setIsAttachmentMenuOpen(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ description: "File too large. Max 10MB", variant: "destructive" });
      return;
    }

    const isImage = file.type.startsWith('image/');

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedFile({
          file,
          preview: e.target?.result as string,
          type: 'image'
        });
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile({
        file,
        type: 'document'
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const handleSend = useCallback(() => {
    if (!inputText.trim() && !selectedFile) return;

    const tempId = Date.now();
    const newMessage: ChatMessage = {
      id: tempId,
      type: 'outgoing',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      status: 'pending',
      ...(selectedFile && {
        attachment: {
          name: selectedFile.file.name,
          size: formatFileSize(selectedFile.file.size),
          type: selectedFile.type,
          url: selectedFile.preview,
        }
      })
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setSelectedFile(null);
    setShowUndo(false);

    // Simulate status updates
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sent' } : m));
    }, 1000);

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'delivered' } : m));
    }, 2500);
  }, [inputText, selectedFile]);

  // Reply functionality
  const handleReplyClick = useCallback((message: ChatMessage) => {
    if (message.type === 'incoming') {
      setReplyingTo(message);
      setReplyDraft('');
      setReplyInstructions('');
      // Auto-generate a draft reply
      generateReplyDraft(message.text);
    }
  }, []);

  const generateReplyDraft = async (originalMessage: string, instructions?: string) => {
    setIsGeneratingReply(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      // Convert messages to the format expected by the API
      const historyForApi = messages.map(msg => ({
        type: msg.type,
        text: msg.text
      }));

      const response = await fetch(`${apiUrl}/api/v1/bridges/whatsapp/generate-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          contact_name: contact.name,
          history: historyForApi,
          instructions: instructions,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReplyDraft(data.body || '');
      } else {
      // Fallback to basic draft if API fails
        let draft = '';
        const lowerMsg = originalMessage.toLowerCase();

        if (lowerMsg.includes('meet') || lowerMsg.includes('lunch') || lowerMsg.includes('celebrate')) {
          draft = "That sounds perfect! I'd love to. Just let me know the time and place, and I'll be there.";
        } else if (lowerMsg.includes('?')) {
          draft = "Great question! I'll look into that and get back to you with more details soon.";
        } else {
          draft = "Thanks for reaching out! I'm happy to continue this conversation. Let me know how I can help.";
        }
        setReplyDraft(draft);
      }
    } catch (error) {
      console.error('Failed to generate reply draft:', error);
      // Fallback to basic draft
      setReplyDraft("Thanks for reaching out! I'm happy to continue this conversation.");
    }

    setIsGeneratingReply(false);
  };

  const handleRegenerateReply = () => {
    if (replyingTo) {
      generateReplyDraft(replyingTo.text, replyInstructions);
    }
  };

  const handleSendReply = () => {
    if (!replyDraft.trim()) return;

    const tempId = Date.now();
    const newMessage: ChatMessage = {
      id: tempId,
      type: 'outgoing',
      text: replyDraft.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      status: 'pending',
    };

    setMessages(prev => [...prev, newMessage]);
    setReplyingTo(null);
    setReplyDraft('');
    setReplyInstructions('');

    // Simulate status updates
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sent' } : m));
    }, 1000);

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'delivered' } : m));
    }, 2500);

    toast({ description: "Reply sent!" });
  };

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
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-cyan-400/20 flex items-center justify-center">
                <span className="text-sm font-semibold text-foreground">{contact.initials}</span>
              </div>
              <div className={cn(
                'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center border-2 border-card',
                platform.bgColor
              )}>
                <PlatformIcon className="h-2 w-2 text-white" />
              </div>
            </div>

            <div>
              <h1 className="font-semibold text-foreground">{contact.name}</h1>
              <p className="text-xs text-muted-foreground">Last seen {contact.lastSeen}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Message counter */}
            <div className="bg-muted/80 px-2 py-0.5 rounded-full mr-1">
              <span className="text-xs font-medium text-muted-foreground">
                {currentIndex + 1} of {totalMessages}
              </span>
            </div>

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
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 pb-[180px] md:pb-4 space-y-1">
          <AnimatePresence>
            {messages.map((message, idx) => {
              const nextMsg = messages[idx + 1];
              const isLastInGroup = !nextMsg || nextMsg.type !== message.type;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'flex',
                    message.type === 'outgoing' ? 'justify-end' : 'justify-start',
                    !isLastInGroup ? 'mb-1' : 'mb-3'
                  )}
                >
                  <div className="flex flex-col max-w-[70%]">
                    <div
                      className={cn(
                        'px-4 py-2.5 transition-all',
                        message.type === 'outgoing'
                          ? 'bg-gradient-to-r from-primary to-cyan-500 text-white rounded-2xl rounded-tr-sm'
                          : 'bg-muted text-foreground rounded-2xl rounded-tl-sm'
                      )}
                    >
                      {/* Attachment Preview */}
                      {message.attachment && (
                        <div className="mb-2">
                          {message.attachment.type === 'image' && message.attachment.url ? (
                            <img
                              src={message.attachment.url}
                              alt={message.attachment.name}
                              className="rounded-lg max-w-full h-auto"
                            />
                          ) : (
                            <div className={cn(
                              "flex items-center gap-2 p-2 rounded-lg",
                              message.type === 'outgoing' ? 'bg-white/20' : 'bg-background'
                            )}>
                              <FileText className="h-5 w-5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{message.attachment.name}</p>
                                <p className="text-xs opacity-70">{message.attachment.size}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {message.text && (
                        <p className="text-base leading-relaxed">{message.text}</p>
                      )}

                      {isLastInGroup && (
                        <div className={cn(
                          'flex items-center gap-1 mt-1',
                          message.type === 'outgoing' ? 'justify-end' : 'justify-start'
                        )}>
                          <span className={cn(
                            'text-xs',
                            message.type === 'outgoing' ? 'text-white/70' : 'text-muted-foreground'
                          )}>
                            {message.timestamp}
                          </span>
                          {message.type === 'outgoing' && renderStatus(message.status)}
                        </div>
                      )}
                    </div>

                    {/* Reply hint for incoming messages - OUTSIDE bubble, clickable */}
                    {message.type === 'incoming' && isLastInGroup && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReplyClick(message);
                        }}
                        className="text-xs text-primary/70 hover:text-primary mt-1.5 ml-1 text-left font-medium active:scale-95 transition-all"
                      >
                        Tap to reply
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Reply Interface Modal */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setReplyingTo(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-card rounded-t-3xl shadow-elevated w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Replying to {contact.name}</h2>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Original Message Preview */}
                <div className="bg-muted/50 rounded-xl p-3 border-l-4 border-primary">
                  <p className="text-xs text-muted-foreground mb-1">Original message:</p>
                  <p className="text-sm text-foreground">{replyingTo.text}</p>
                </div>

                {/* AI Draft Reply */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Draft Reply
                  </label>
                  <div className="relative">
                    {isGeneratingReply ? (
                      <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        <span className="text-sm text-muted-foreground">Generating reply...</span>
                      </div>
                    ) : (
                      <textarea
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        className="w-full bg-primary/5 rounded-xl p-4 border border-primary/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-none"
                        placeholder="Your reply will appear here..."
                      />
                    )}
                  </div>
                </div>

                {/* Instructions for AI */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Instructions for AI (optional)
                  </label>
                  <input
                    type="text"
                    value={replyInstructions}
                    onChange={(e) => setReplyInstructions(e.target.value)}
                    placeholder="e.g., Make it more casual, keep it short..."
                    className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleRegenerateReply}
                  disabled={isGeneratingReply}
                  className="flex-1"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", isGeneratingReply && "animate-spin")} />
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setReplyingTo(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendReply}
                  disabled={!replyDraft.trim() || isGeneratingReply}
                  className="flex-1 gradient-primary text-primary-foreground border-0"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment Menu Backdrop */}
      <AnimatePresence>
        {isAttachmentMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-35 bg-black/20"
            onClick={() => setIsAttachmentMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Attachment Menu */}
      <AnimatePresence>
        {isAttachmentMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-[calc(64px+env(safe-area-inset-bottom,0px)+80px)] left-4 z-40 bg-card rounded-xl border border-border shadow-xl py-2 w-56"
          >
            {attachmentMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleAttachmentClick(item)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors duration-150"
                >
                  <Icon className={cn('h-5 w-5', item.color)} />
                  <span className="text-foreground font-medium">{item.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={fileAccept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Input Bar - Fixed above bottom nav on mobile (64px), Sticky bottom on desktop */}
      <div
        className="fixed bottom-[calc(64px+env(safe-area-inset-bottom,0px))] left-0 right-0 md:relative md:bottom-auto z-20 bg-card border-t border-border shadow-lg mt-auto"
      >
        <div className="w-full max-w-3xl mx-auto px-4 py-3">
          {/* File Preview */}
          <AnimatePresence>
            {selectedFile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2"
              >
                <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                  {selectedFile.type === 'image' && selectedFile.preview ? (
                    <img src={selectedFile.preview} alt="Preview" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{selectedFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.file.size)}</p>
                  </div>
                  <button
                    onClick={removeSelectedFile}
                    className="h-8 w-8 rounded-full bg-muted-foreground/10 hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-3">
            {/* Attachment Button - Fixed 44px */}
            <button
              onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
              className={cn(
                "flex-shrink-0 h-11 w-11 rounded-full flex items-center justify-center transition-all",
                isAttachmentMenuOpen
                  ? "bg-primary text-primary-foreground rotate-45"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              <Plus className="h-5 w-5 transition-transform" />
            </button>

            {/* Text Input - 44px height, proper padding for text visibility */}
            <div className="flex-1 relative min-w-0">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="w-full h-11 bg-muted rounded-full px-4 pr-12 text-base leading-[44px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ fontSize: '16px' }}
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

            {/* Send Button - Fixed 44px */}
            <button
              onClick={handleSend}
              disabled={!inputText.trim() && !selectedFile}
              className={cn(
                "flex-shrink-0 h-11 w-11 rounded-full flex items-center justify-center transition-all",
                (inputText.trim() || selectedFile)
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