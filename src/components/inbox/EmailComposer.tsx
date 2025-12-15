import { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react';
import { X, Bold, Italic, Underline, Link2, Sparkles, Paperclip, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'reply' | 'replyAll' | 'forward' | 'new';
  originalEmail?: {
    subject: string;
    from: string;
    to: string[];
    cc?: string[];
    body: string;
    sender: string;
    timestamp: string;
  };
}

interface RecipientChip {
  email: string;
  isValid: boolean;
}

const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const aiDraftEmails = {
  reply: `Hi {name},

Thank you for your detailed update on the Q4 project. The progress looks excellent, and I'm pleased to see we're on track to meet all deliverables.

I've reviewed the attached report and have a few questions about the timeline for Phase 2. Could we schedule a brief call to discuss?

Looking forward to your response.

Best regards`,
  forward: `Hi,

I wanted to share this email thread with you. Please see the original message below.

Let me know if you have any questions.

Best regards`,
  meeting: `Hi {name},

Thanks for reaching out! I'd be happy to meet and discuss this further.

Thursday at 3 PM works perfectly for me. Should we meet at your office or would you prefer a video call?

Looking forward to it!

Best regards`,
};

// Recipient Chip Component
function RecipientChipInput({
  recipients,
  setRecipients,
  placeholder,
}: {
  recipients: RecipientChip[];
  setRecipients: (recipients: RecipientChip[]) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addRecipient = (email: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    
    // Check if already exists
    if (recipients.some(r => r.email.toLowerCase() === trimmedEmail.toLowerCase())) {
      setInputValue('');
      return;
    }

    const isValid = validateEmail(trimmedEmail);
    setRecipients([...recipients, { email: trimmedEmail, isValid }]);
    setInputValue('');
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addRecipient(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
      removeRecipient(recipients.length - 1);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addRecipient(inputValue);
    }
  };

  return (
    <div 
      className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[36px] cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {recipients.map((recipient, index) => (
        <span
          key={index}
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm",
            recipient.isValid
              ? "bg-muted text-foreground"
              : "bg-destructive/10 text-destructive border border-destructive/30"
          )}
        >
          <span className="max-w-[150px] truncate">{recipient.email}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeRecipient(index);
            }}
            className={cn(
              "flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center transition-colors",
              recipient.isValid
                ? "hover:bg-muted-foreground/20 hover:text-destructive"
                : "hover:bg-destructive/20"
            )}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="email"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={recipients.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent text-foreground focus:outline-none text-sm py-1"
      />
    </div>
  );
}

export default function EmailComposer({ isOpen, onClose, mode, originalEmail }: EmailComposerProps) {
  const [toRecipients, setToRecipients] = useState<RecipientChip[]>([]);
  const [ccRecipients, setCcRecipients] = useState<RecipientChip[]>([]);
  const [bccRecipients, setBccRecipients] = useState<RecipientChip[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [originalBody, setOriginalBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Initialize fields based on mode
  useEffect(() => {
    if (isOpen && originalEmail) {
      if (mode === 'reply') {
        setToRecipients([{ email: originalEmail.from, isValid: true }]);
        setSubject(`Re: ${originalEmail.subject.replace(/^Re: /, '')}`);
        setBody(`\n\n\n---\nOn ${originalEmail.timestamp}, ${originalEmail.sender} <${originalEmail.from}> wrote:\n\n${originalEmail.body.split('\n').map(line => `> ${line}`).join('\n')}`);
      } else if (mode === 'replyAll') {
        const allTo = [originalEmail.from, ...originalEmail.to.filter(e => e !== 'me@company.com')];
        setToRecipients(allTo.map(email => ({ email, isValid: true })));
        if (originalEmail.cc) {
          setCcRecipients(originalEmail.cc.map(email => ({ email, isValid: true })));
          setShowCc(true);
        }
        setSubject(`Re: ${originalEmail.subject.replace(/^Re: /, '')}`);
        setBody(`\n\n\n---\nOn ${originalEmail.timestamp}, ${originalEmail.sender} <${originalEmail.from}> wrote:\n\n${originalEmail.body.split('\n').map(line => `> ${line}`).join('\n')}`);
      } else if (mode === 'forward') {
        setToRecipients([]);
        setSubject(`Fwd: ${originalEmail.subject.replace(/^Fwd: /, '')}`);
        setBody(`\n\n\n---\nForwarded message from ${originalEmail.sender} <${originalEmail.from}>:\n\n${originalEmail.body}`);
      }
    }
  }, [isOpen, mode, originalEmail]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setToRecipients([]);
      setCcRecipients([]);
      setBccRecipients([]);
      setSubject('');
      setBody('');
      setShowCc(false);
      setShowBcc(false);
      setShowUndo(false);
    }
  }, [isOpen]);

  const typeText = useCallback((text: string, prepend: boolean = true) => {
    let index = 0;
    const currentBody = prepend ? '' : body.split('\n\n\n---')[1] || '';
    const suffix = currentBody ? `\n\n\n---${currentBody}` : '';
    
    setBody('');
    const interval = setInterval(() => {
      if (index < text.length) {
        setBody(prev => {
          const newText = text.slice(0, index + 1);
          return newText + suffix;
        });
        index++;
      } else {
        clearInterval(interval);
        toast({
          description: "Email drafted based on context",
        });
      }
    }, 20);
    return () => clearInterval(interval);
  }, [body, toast]);

  const handleAiSparkle = useCallback(async () => {
    setIsAiLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const composedPart = body.split('\n\n\n---')[0].trim();
    
    if (!composedPart) {
      const draftKey = mode === 'forward' ? 'forward' : 'reply';
      const draft = aiDraftEmails[draftKey].replace('{name}', originalEmail?.sender.split(' ')[0] || 'there');
      setIsAiLoading(false);
      typeText(draft, true);
    } else {
      setOriginalBody(body);
      const polished = polishEmail(composedPart);
      const quotedPart = body.split('\n\n\n---')[1] || '';
      setBody(polished + (quotedPart ? `\n\n\n---${quotedPart}` : ''));
      setIsAiLoading(false);
      setShowUndo(true);
      toast({
        description: "Email polished",
      });
      setTimeout(() => setShowUndo(false), 3000);
    }
  }, [body, mode, originalEmail, toast, typeText]);

  const polishEmail = (text: string): string => {
    let polished = text.charAt(0).toUpperCase() + text.slice(1);
    
    if (!polished.toLowerCase().startsWith('hi') && !polished.toLowerCase().startsWith('hello') && !polished.toLowerCase().startsWith('dear')) {
      polished = `Hi ${originalEmail?.sender.split(' ')[0] || 'there'},\n\n${polished}`;
    }
    
    if (!polished.toLowerCase().includes('best') && !polished.toLowerCase().includes('regards') && !polished.toLowerCase().includes('thanks')) {
      polished = `${polished}\n\nBest regards`;
    }
    
    return polished;
  };

  const handleUndo = () => {
    setBody(originalBody);
    setShowUndo(false);
  };

  const handleSend = async () => {
    if (!toRecipients.length || !subject.trim()) {
      toast({
        variant: "destructive",
        description: "Please fill in To and Subject fields",
      });
      return;
    }

    // Check for invalid emails
    const hasInvalidEmails = [...toRecipients, ...ccRecipients, ...bccRecipients].some(r => !r.isValid);
    if (hasInvalidEmails) {
      toast({
        variant: "destructive",
        description: "Please fix invalid email addresses",
      });
      return;
    }

    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      description: "Email sent ✓",
    });
    
    setIsSending(false);
    onClose();
  };

  const handleClose = () => {
    const composedPart = body.split('\n\n\n---')[0].trim();
    if (composedPart) {
      onClose();
    } else {
      onClose();
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'reply': return `Reply to: ${originalEmail?.subject || ''}`;
      case 'replyAll': return `Reply All: ${originalEmail?.subject || ''}`;
      case 'forward': return `Forward: ${originalEmail?.subject || ''}`;
      default: return 'New Email';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-50 bg-background flex flex-col"
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-primary to-cyan-500 text-white px-3 py-3 md:px-4 md:py-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              <button
                onClick={handleClose}
                className="flex-shrink-0 p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="font-semibold text-base md:text-lg truncate">{getTitle()}</h2>
            </div>
            <button
              onClick={handleSend}
              disabled={isSending || !toRecipients.length || !subject.trim()}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 rounded-lg font-semibold transition-all shadow-lg",
                toRecipients.length && subject.trim()
                  ? "bg-white text-primary hover:bg-primary-foreground hover:shadow-xl"
                  : "bg-white/50 text-white/70 cursor-not-allowed"
              )}
            >
              {isSending ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full" />
                  <span className="hidden sm:inline">Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </div>

          {/* Fields with Gmail-style chips */}
          <div className="bg-muted/50 p-4 space-y-2">
            {/* To Field with Cc/Bcc buttons */}
            <div className="flex items-start gap-2 bg-card rounded-lg border border-border px-3 py-2">
              <span className="text-sm text-muted-foreground w-8 py-1">To</span>
              <RecipientChipInput
                recipients={toRecipients}
                setRecipients={setToRecipients}
                placeholder="recipient@email.com"
              />
              <div className="flex items-center gap-2 flex-shrink-0 py-1">
                {!showCc && (
                  <button
                    onClick={() => setShowCc(true)}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    onClick={() => setShowBcc(true)}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    Bcc
                  </button>
                )}
              </div>
            </div>

            {/* CC Field */}
            {showCc && (
              <div className="flex items-start gap-2 bg-card rounded-lg border border-border px-3 py-2">
                <span className="text-sm text-muted-foreground w-8 py-1">Cc</span>
                <RecipientChipInput
                  recipients={ccRecipients}
                  setRecipients={setCcRecipients}
                  placeholder="cc@email.com"
                />
                <button
                  onClick={() => {
                    setShowCc(false);
                    setCcRecipients([]);
                  }}
                  className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* BCC Field */}
            {showBcc && (
              <div className="flex items-start gap-2 bg-card rounded-lg border border-border px-3 py-2">
                <span className="text-sm text-muted-foreground w-8 py-1">Bcc</span>
                <RecipientChipInput
                  recipients={bccRecipients}
                  setRecipients={setBccRecipients}
                  placeholder="bcc@email.com"
                />
                <button
                  onClick={() => {
                    setShowBcc(false);
                    setBccRecipients([]);
                  }}
                  className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Subject */}
            <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2">
              <span className="text-sm text-muted-foreground">Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 bg-transparent text-foreground focus:outline-none text-sm"
                placeholder="Email subject"
              />
            </div>
          </div>

          {/* Text Editor */}
          <div className="flex-1 overflow-y-auto relative">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Compose your email..."
              className="w-full min-h-[200px] md:min-h-[300px] h-full p-4 md:p-6 pr-16 md:pr-20 text-base text-foreground bg-card resize-none focus:outline-none"
              autoFocus
            />
            
            {/* Floating AI Sparkle Button */}
            <button
              onClick={handleAiSparkle}
              disabled={isAiLoading}
              className={cn(
                "absolute bottom-4 right-4 md:bottom-6 md:right-6 w-12 h-12 md:w-14 md:h-14 rounded-full",
                "bg-gradient-to-r from-purple-500 via-pink-500 to-primary",
                "text-white shadow-lg hover:shadow-xl",
                "hover:scale-110 active:scale-95",
                "transition-all duration-200",
                "flex items-center justify-center",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                "z-10"
              )}
              title={body.split('\n\n\n---')[0].trim() === '' ? 'AI Draft Email' : 'AI Polish Text'}
            >
              {isAiLoading ? (
                <span className="w-5 h-5 md:w-6 md:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-6 h-6 md:w-7 md:h-7" />
              )}
            </button>
            
            {/* Undo Button */}
            {showUndo && (
              <button
                onClick={handleUndo}
                className="absolute bottom-4 right-20 md:bottom-6 md:right-24 px-3 md:px-4 py-1.5 md:py-2 bg-foreground text-background text-xs md:text-sm font-medium rounded-full shadow-lg hover:opacity-90 transition-all z-10"
              >
                ↶ Undo
              </button>
            )}
          </div>

          {/* Toolbar */}
          <div className="sticky bottom-0 bg-card border-t border-border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <Bold className="h-4 w-4 text-muted-foreground" />
                </button>
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <Italic className="h-4 w-4 text-muted-foreground" />
                </button>
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <Underline className="h-4 w-4 text-muted-foreground" />
                </button>
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="w-px h-6 bg-border mx-1" />
                <button
                  onClick={handleAiSparkle}
                  disabled={isAiLoading}
                  className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Sparkles className={cn(
                    "h-4 w-4 text-primary",
                    isAiLoading && "animate-spin"
                  )} />
                </button>
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              
              <button
                onClick={handleSend}
                disabled={isSending || !toRecipients.length || !subject.trim()}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all",
                  toRecipients.length && subject.trim()
                    ? "bg-gradient-to-r from-primary to-cyan-500 text-white hover:opacity-90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {isSending ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
