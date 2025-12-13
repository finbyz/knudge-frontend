import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp, MoreVertical, Reply, ReplyAll, Forward, Paperclip, Download, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import EmailComposer from '@/components/inbox/EmailComposer';

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
        sender: 'Sarah Williams',
        email: 'sarah@company.com',
        timestamp: 'Dec 7, 3:20 PM',
        body: `Thanks for keeping us updated, Emily. Looking forward to reviewing the roadmap.

Quick question - will the mobile redesign affect our current API integrations?

Best,
Sarah`,
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

export default function EmailDetail() {
  const navigate = useNavigate();
  const { emailId } = useParams<{ emailId: string }>();
  const [expandedThreads, setExpandedThreads] = useState<Set<number>>(new Set([1]));
  const [showRecipients, setShowRecipients] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<'reply' | 'replyAll' | 'forward'>('reply');

  const email = sampleEmails[emailId || '3'] || sampleEmails['3'];

  const toggleThread = (threadId: number) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(threadId)) {
        newSet.delete(threadId);
      } else {
        newSet.add(threadId);
      }
      return newSet;
    });
  };

  const openComposer = (mode: 'reply' | 'replyAll' | 'forward') => {
    setComposerMode(mode);
    setComposerOpen(true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-40">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={() => navigate('/inbox')}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          
          <button className="p-2 hover:bg-muted rounded-full transition-colors">
            <MoreVertical className="h-5 w-5 text-muted-foreground" />
          </button>
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
            <span className="text-sm font-medium text-foreground">From: {email.from}</span>
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
                <p className="text-muted-foreground">To: {email.to.join(', ')}</p>
                {email.cc && <p className="text-muted-foreground">CC: {email.cc.join(', ')}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Email Threads */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {email.threads.map((thread, index) => {
          const isExpanded = expandedThreads.has(thread.id);
          const isLatest = index === 0;
          
          return (
            <motion.div
              key={thread.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className={cn(
                'bg-card rounded-xl border border-border overflow-hidden transition-shadow',
                isExpanded ? 'shadow-md' : 'hover:shadow-md cursor-pointer'
              )}
              onClick={() => !isExpanded && toggleThread(thread.id)}
            >
              {/* Thread Header */}
              <div 
                className={cn(
                  'flex items-center justify-between p-4',
                  isExpanded && 'border-b border-border cursor-pointer'
                )}
                onClick={() => isExpanded && toggleThread(thread.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-cyan-400/20 flex items-center justify-center">
                    <span className="text-sm font-semibold text-foreground">
                      {getInitials(thread.sender)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{thread.sender}</p>
                    {!isExpanded && (
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {thread.body.split('\n')[0]}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{thread.timestamp}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Thread Body (Expanded) */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-4">
                      <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                        {thread.body}
                      </p>
                      
                      {/* Attachments */}
                      {thread.attachments.length > 0 && (
                        <div className="mt-6 space-y-2">
                          {thread.attachments.map((attachment, idx) => (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-2 bg-muted hover:bg-muted/80 rounded-lg px-4 py-2.5 mr-2 mb-2 cursor-pointer transition-colors"
                            >
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-foreground">{attachment.name}</span>
                              <span className="text-xs text-muted-foreground">({attachment.size})</span>
                              <Download className="h-4 w-4 text-muted-foreground ml-2" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </main>

      {/* Action Bar - positioned above BottomNav */}
      <div className="fixed bottom-16 left-0 right-0 z-40 bg-card border-t border-border shadow-sm px-4 py-2">
        <div className="max-w-lg mx-auto flex gap-2">
          <button
            onClick={() => openComposer('reply')}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary to-cyan-500 text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Reply className="h-4 w-4" />
            <span>Reply</span>
          </button>
          
          <button
            onClick={() => openComposer('replyAll')}
            className="flex-1 flex items-center justify-center gap-1.5 bg-card border border-border text-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <ReplyAll className="h-4 w-4" />
            <span>Reply All</span>
          </button>
          
          <button
            onClick={() => openComposer('forward')}
            className="flex-1 flex items-center justify-center gap-1.5 bg-card border border-border text-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Forward className="h-4 w-4" />
            <span>Forward</span>
          </button>
        </div>
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
