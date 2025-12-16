import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Paperclip, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  isFromMe?: boolean;
}

interface ConversationalEmailViewProps {
  threads: EmailThread[];
  currentUserEmail?: string;
}

export function ConversationalEmailView({ 
  threads, 
  currentUserEmail = 'me@company.com' 
}: ConversationalEmailViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on mount (latest message)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threads]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Sort threads chronologically (oldest first so newest is at bottom)
  const sortedThreads = [...threads].reverse();

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {sortedThreads.map((thread, index) => {
        const isFromMe = thread.email === currentUserEmail || thread.sender === 'You';
        
        return (
          <motion.div
            key={thread.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className={cn(
              'flex gap-3',
              isFromMe ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            {/* Avatar */}
            <div className={cn(
              'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
              isFromMe 
                ? 'bg-gradient-to-br from-primary to-cyan-500' 
                : 'bg-gradient-to-br from-primary/20 to-cyan-400/20'
            )}>
              <span className={cn(
                'text-xs font-semibold',
                isFromMe ? 'text-white' : 'text-foreground'
              )}>
                {isFromMe ? 'You' : getInitials(thread.sender)}
              </span>
            </div>

            {/* Message bubble */}
            <div className={cn(
              'max-w-[75%] flex flex-col',
              isFromMe ? 'items-end' : 'items-start'
            )}>
              {/* Sender name and time */}
              <div className={cn(
                'flex items-center gap-2 mb-1 px-1',
                isFromMe ? 'flex-row-reverse' : 'flex-row'
              )}>
                <span className="text-xs font-medium text-foreground">
                  {isFromMe ? 'You' : thread.sender}
                </span>
                <span className="text-xs text-muted-foreground">
                  {thread.timestamp}
                </span>
              </div>

              {/* Message content */}
              <div className={cn(
                'rounded-2xl px-4 py-3',
                isFromMe 
                  ? 'bg-gradient-to-r from-primary to-cyan-500 text-white rounded-tr-sm' 
                  : 'bg-muted text-foreground rounded-tl-sm'
              )}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {thread.body}
                </p>

                {/* Attachments */}
                {thread.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {thread.attachments.map((attachment, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                          isFromMe 
                            ? 'bg-white/20 hover:bg-white/30' 
                            : 'bg-background hover:bg-background/80'
                        )}
                      >
                        <Paperclip className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{attachment.name}</p>
                          <p className="text-xs opacity-70">{attachment.size}</p>
                        </div>
                        <Download className="h-4 w-4 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
