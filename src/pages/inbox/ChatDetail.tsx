import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MoreVertical, Plus, Sparkles, Send, MessageCircle, Linkedin, Check, CheckCheck, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: number;
  type: 'incoming' | 'outgoing';
  text: string;
  timestamp: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read';
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

export default function ChatDetail() {
  const navigate = useNavigate();
  const { contactId } = useParams<{ contactId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>(sampleMessages);
  const [inputText, setInputText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const contact = sampleContacts[contactId || '1'] || sampleContacts['1'];
  const platform = platformConfig[contact.platform];
  const PlatformIcon = platform.icon;

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

    // Simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!inputText.trim()) {
      // STATE 1: Empty text - Generate draft
      const randomDraft = aiDraftResponses[Math.floor(Math.random() * aiDraftResponses.length)];
      setIsAiLoading(false);
      typeText(randomDraft, () => {
        toast({
          description: "Draft generated based on context",
        });
      });
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
  }, [inputText, toast, typeText]);

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

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;

    const tempId = Date.now();
    const newMessage: ChatMessage = {
      id: tempId,
      type: 'outgoing',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      status: 'pending',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setShowUndo(false);

    // Simulate status updates
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sent' } : m));
    }, 1000);

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'delivered' } : m));
    }, 2500);
  }, [inputText]);

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

  // Group consecutive messages from same sender
  const groupedMessages = messages.reduce<{ messages: ChatMessage[]; showTimestamp: boolean }[]>((acc, msg, idx) => {
    const prevMsg = messages[idx - 1];
    const nextMsg = messages[idx + 1];
    const isLastInGroup = !nextMsg || nextMsg.type !== msg.type;
    
    acc.push({ messages: [msg], showTimestamp: isLastInGroup });
    return acc;
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border h-16 flex items-center justify-between px-4">
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
        
        <button className="p-2 hover:bg-muted rounded-full transition-colors">
          <MoreVertical className="h-5 w-5 text-muted-foreground" />
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 pb-28 space-y-1">
        <AnimatePresence>
          {messages.map((message, idx) => {
            const prevMsg = messages[idx - 1];
            const nextMsg = messages[idx + 1];
            const isFirstInGroup = !prevMsg || prevMsg.type !== message.type;
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
                <div
                  className={cn(
                    'px-4 py-2.5 max-w-[70%]',
                    message.type === 'outgoing'
                      ? 'bg-gradient-to-r from-primary to-cyan-500 text-white rounded-2xl rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-2xl rounded-tl-sm'
                  )}
                >
                  <p className="text-base leading-relaxed">{message.text}</p>
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
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </main>

      {/* Input Bar - Fixed above bottom navigation */}
      <div className="fixed bottom-20 left-0 right-0 z-30 bg-card border-t border-border shadow-lg px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {/* Attachment Button */}
          <button 
            onClick={() => toast({ description: "Attachments coming soon" })}
            className="flex-shrink-0 h-10 w-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
          >
            <Plus className="h-5 w-5 text-muted-foreground" />
          </button>
          
          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                // Auto-resize
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto';
                  textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 96) + 'px';
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full bg-muted rounded-full px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 resize-none overflow-hidden"
              style={{ minHeight: '40px', maxHeight: '96px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            {showUndo && (
              <button
                onClick={handleUndo}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary font-medium hover:underline"
              >
                Undo
              </button>
            )}
          </div>
          
          {/* AI Sparkles Button */}
          <button
            onClick={handleAiSparkle}
            disabled={isAiLoading}
            className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-primary to-cyan-500 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className={cn("h-5 w-5", isAiLoading && "animate-spin")} />
          </button>
          
          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={cn(
              "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all",
              inputText.trim()
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
            )}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
