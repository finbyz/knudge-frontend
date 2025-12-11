import { useState } from 'react';
import { Search, MessageCircle, Linkedin, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppHeader } from '@/components/AppHeader';
import { cn } from '@/lib/utils';

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

const mockInboxMessages: InboxMessage[] = [
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

export default function Inbox() {
  const [searchQuery, setSearchQuery] = useState('');
  const [messages] = useState(mockInboxMessages);

  const filteredMessages = messages.filter(
    (msg) =>
      msg.sender.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (msg.subject && msg.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader showNotifications={false} />

      <main className="px-4 py-4 space-y-4">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-foreground">Unified Inbox</h1>
          <p className="text-sm text-muted-foreground">One stream, any protocol</p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
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

        {/* Message List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-card rounded-2xl border border-border overflow-hidden"
        >
          {filteredMessages.map((message, index) => {
            const platform = platformConfig[message.platform];
            const PlatformIcon = platform.icon;

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={cn(
                  'flex items-start gap-3 p-4 cursor-pointer transition-all hover:bg-muted/50',
                  index !== filteredMessages.length - 1 && 'border-b border-border'
                )}
              >
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
              </motion.div>
            );
          })}

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
