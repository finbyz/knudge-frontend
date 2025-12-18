import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp, MoreVertical, Reply, ReplyAll, Forward, Paperclip, Download, Mail, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import EmailComposer from '@/components/inbox/EmailComposer';
import { useAuthStore } from '@/stores/authStore';
import { ConversationalEmailView } from '@/components/inbox/ConversationalEmailView';
import { useSwipeable } from 'react-swipeable';
import { useToast } from '@/hooks/use-toast';

interface EmailAttachment {
  name: string;
  size: string;
}

interface EmailThread {
  id: number;
  sender: string;
  email: string;
  timestamp: string;
  body: string;
  attachments: EmailAttachment[];
}

interface EmailData {
  id: string;
  subject: string;
  to: string[];
  cc?: string[];
  from: string;
  fromEmail: string;
  threads: EmailThread[];
}

const sampleEmails: Record<string, EmailData> = {
  '3': {
    id: '3',
    subject: 'Q4 Product Roadmap',
    to: ['me@company.com'],
    cc: ['team@company.com'],
    from: 'Emily Rodriguez',
    fromEmail: 'emily.rodriguez@company.com',
    threads: [
      {
        id: 1,
        sender: 'Emily Rodriguez',
        email: 'emily.rodriguez@company.com',
        timestamp: 'Dec 8, 10:45 AM',
        body: `Hi Team,

Please find attached the updated roadmap for Q4. Key highlights include:

• Mobile app redesign scheduled for November
• API v2 launch planned for December
• Performance improvements across all services
• New analytics dashboard rollout

Key milestones:
1. Phase 1: Design completion - Nov 15
2. Phase 2: Development sprint - Nov 15 - Dec 1
3. Phase 3: QA and testing - Dec 1 - Dec 15
4. Phase 4: Gradual rollout - Dec 15 - Dec 31

Please review and let me know if you have any questions or concerns. We'll discuss this in our next team meeting.

Best regards,
Emily`,
        attachments: [
          { name: 'Q4_Roadmap.pdf', size: '2.3 MB' },
          { name: 'Timeline_Chart.xlsx', size: '845 KB' },
        ],
      },
      {
        id: 2,
        sender: 'You',
        email: 'me@company.com',
        timestamp: 'Dec 7, 5:20 PM',
        body: `Thanks Emily! This looks comprehensive. Quick question - will the mobile redesign affect our current API integrations?

Best,
Me`,
        attachments: [],
      },
      {
        id: 3,
        sender: 'Emily Rodriguez',
        email: 'emily.rodriguez@company.com',
        timestamp: 'Dec 5, 9:15 AM',
        body: `Hi Team,

Quick reminder about the Q4 deadline approaching. Please make sure to:
- Complete all pending tasks
- Update your progress in the tracker
- Flag any blockers ASAP

Thanks!
Emily`,
        attachments: [],
      },
    ],
  },
  '6': {
    id: '6',
    subject: 'Re: Technical Specifications',
    to: ['me@company.com'],
    from: 'David Kim',
    fromEmail: 'david.kim@company.com',
    threads: [
      {
        id: 1,
        sender: 'David Kim',
        email: 'david.kim@company.com',
        timestamp: 'Dec 8, 2:15 PM',
        body: `Hi,

I've made the updates you requested. The new API endpoints are now documented in the wiki.

Key changes:
• Authentication flow updated
• Rate limiting implemented
• New error codes added

Let me know if you need anything else.

Best,
David`,
        attachments: [
          { name: 'API_Docs_v2.pdf', size: '1.2 MB' },
        ],
      },
    ],
  },
};

// Mock inbox messages for navigation
const mockInboxEmails = ['3', '6'];

export default function EmailDetail() {
  const navigate = useNavigate();
  const { emailId } = useParams<{ emailId: string }>();
  const [showRecipients, setShowRecipients] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<'reply' | 'replyAll' | 'forward'>('reply');
  const [fetchedEmail, setFetchedEmail] = useState<EmailData | null>(null);
  const [viewMode, setViewMode] = useState<'threaded' | 'conversational'>('conversational');
  const { toast } = useToast();

  // Use sample if not fetched yet or if using demo IDs
  const email = fetchedEmail || sampleEmails[emailId || '3'] || sampleEmails['3'];

  // Fetch from API
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (emailId && emailId.length > 10) { // Assume UUID is long
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/emails/${emailId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data) {
            setFetchedEmail({
              id: data.id,
              subject: data.subject || 'No Subject',
              to: [data.to_email],
              from: data.from_email.split('<')[0].replace(/"/g, '').trim(),
              fromEmail: data.from_email,
              threads: [
                {
                  id: 1,
                  sender: data.from_email.split('<')[0].replace(/"/g, '').trim(),
                  email: data.from_email,
                  timestamp: new Date(data.sent_at).toLocaleString(),
                  body: data.body_text || 'No content',
                  attachments: []
                }
              ]
            });
          }
        })
        .catch(err => console.error(err));
    }
  }, [emailId, accessToken]);

  // Navigation between messages
  const currentIndex = mockInboxEmails.indexOf(emailId || '3');
  const totalMessages = mockInboxEmails.length;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < mockInboxEmails.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      navigate(`/inbox/email/${mockInboxEmails[currentIndex - 1]}`, { replace: true });
    }
  };

  const goToNext = () => {
    if (hasNext) {
      navigate(`/inbox/email/${mockInboxEmails[currentIndex + 1]}`, { replace: true });
    }
  };

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => hasNext && goToNext(),
    onSwipedRight: () => hasPrevious && goToPrevious(),
    trackMouse: false,
    trackTouch: true,
    delta: 50,
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
  }, [currentIndex]);

  // Mark as read effect
  useEffect(() => {
    // In a real app, this would call an API to mark as read
    toast({ description: 'Message marked as read' });
  }, [emailId]);

  const openComposer = (mode: 'reply' | 'replyAll' | 'forward') => {
    setComposerMode(mode);
    setComposerOpen(true);
  };

  return (
    <div className="h-full flex flex-col relative" {...swipeHandlers}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate('/inbox')}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>

          {/* Message counter */}
          <div className="bg-muted/80 px-3 py-1 rounded-full">
            <span className="text-xs font-medium text-muted-foreground">
              {currentIndex + 1} of {totalMessages}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Navigation arrows */}
            <button
              onClick={goToPrevious}
              disabled={!hasPrevious}
              className={cn(
                "p-2 rounded-full transition-colors",
                hasPrevious ? "hover:bg-muted" : "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <button
              onClick={goToNext}
              disabled={!hasNext}
              className={cn(
                "p-2 rounded-full transition-colors",
                hasNext ? "hover:bg-muted" : "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
            <button className="p-2 hover:bg-muted rounded-full transition-colors">
              <MoreVertical className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <h1 className="text-xl font-bold text-foreground">{email.subject}</h1>
      </header>

      {/* Sender/Recipient Section */}
      <div
        className="bg-muted/50 border-b border-border px-4 py-3 cursor-pointer"
        onClick={() => setShowRecipients(!showRecipients)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {email.threads.length} messages in thread
            </span>
          </div>
          {showRecipients ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <AnimatePresence>
          {showRecipients && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-1 text-sm">
                <p className="text-muted-foreground">From: {email.from}</p>
                <p className="text-muted-foreground">To: {email.to.join(', ')}</p>
                {email.cc && <p className="text-muted-foreground">CC: {email.cc.join(', ')}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Email Content - Conversational View - Scrollable */}
      <div className="flex-1 overflow-y-auto pb-[180px] md:pb-0">
        <ConversationalEmailView
          threads={email.threads}
          currentUserEmail="me@company.com"
        />
      </div>

      {/* Action Bar - Fixed above bottom nav on mobile, Sticky on Desktop */}
      <div
        className="fixed bottom-[calc(64px+env(safe-area-inset-bottom,0px))] left-0 right-0 md:relative md:bottom-auto z-20 bg-card border-t border-border shadow-sm px-4 py-3 mt-auto"
      >
        <div className="max-w-lg mx-auto flex gap-2">
          <button
            onClick={() => openComposer('reply')}
            className="flex-1 flex items-center justify-center gap-1 bg-gradient-to-r from-primary to-cyan-500 text-white rounded-lg py-2.5 text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Reply className="h-3.5 w-3.5" />
            <span>Reply</span>
          </button>

          <button
            onClick={() => openComposer('replyAll')}
            className="flex-1 flex items-center justify-center gap-1 bg-card border border-border text-foreground rounded-lg py-2.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <ReplyAll className="h-3.5 w-3.5" />
            <span>Reply All</span>
          </button>

          <button
            onClick={() => openComposer('forward')}
            className="flex-1 flex items-center justify-center gap-1 bg-card border border-border text-foreground rounded-lg py-2.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Forward className="h-3.5 w-3.5" />
            <span>Forward</span>
          </button>
        </div>
      </div>

      {/* Swipe indicators */}
      <div className="fixed inset-y-0 left-0 w-1 pointer-events-none">
        {hasPrevious && (
          <div className="absolute top-1/2 -translate-y-1/2 h-16 w-full bg-gradient-to-r from-primary/30 to-transparent rounded-r-full" />
        )}
      </div>
      <div className="fixed inset-y-0 right-0 w-1 pointer-events-none">
        {hasNext && (
          <div className="absolute top-1/2 -translate-y-1/2 h-16 w-full bg-gradient-to-l from-primary/30 to-transparent rounded-l-full" />
        )}
      </div>

      {/* Email Composer Modal */}
      <EmailComposer
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        mode={composerMode}
        originalEmail={{
          subject: email.subject,
          from: email.fromEmail,
          to: email.to,
          cc: email.cc,
          body: email.threads[0]?.body || '',
          sender: email.from,
          timestamp: email.threads[0]?.timestamp || '',
        }}
      />
    </div>
  );
}
