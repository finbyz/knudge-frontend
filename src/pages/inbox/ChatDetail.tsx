import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MoreVertical, Plus, Sparkles, Send, MessageCircle, Linkedin, Check, CheckCheck, Clock, Camera, FileText, MapPin, User, Mic, X, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

export default function ChatDetail() {
  const navigate = useNavigate();
  const { contactId } = useParams<{ contactId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>(sampleMessages);
  const [inputText, setInputText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ file: File; preview?: string; type: 'image' | 'document' } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileAccept, setFileAccept] = useState('');
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
      <main className="flex-1 overflow-y-auto p-4 pb-36 space-y-1">
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
                <div
                  className={cn(
                    'px-4 py-2.5 max-w-[70%]',
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
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </main>

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
            className="fixed bottom-36 left-4 z-40 bg-card rounded-xl border border-border shadow-xl py-2 w-56"
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

      {/* Input Bar - Fixed above bottom navigation */}
      <div className="fixed bottom-20 left-0 right-0 z-30 bg-card border-t border-border shadow-lg px-4 py-3">
        {/* File Preview */}
        <AnimatePresence>
          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3"
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

        <div className="max-w-lg mx-auto flex items-center gap-3">
          {/* Attachment Button */}
          <button 
            onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
            className={cn(
              "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all",
              isAttachmentMenuOpen 
                ? "bg-primary text-primary-foreground rotate-45" 
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            <Plus className="h-5 w-5 transition-transform" />
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
            disabled={!inputText.trim() && !selectedFile}
            className={cn(
              "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all",
              (inputText.trim() || selectedFile)
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