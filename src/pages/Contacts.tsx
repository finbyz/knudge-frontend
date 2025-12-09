import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Calendar, Sparkles, MessageSquare, Clock, Rss } from 'lucide-react';
import { ContactItem } from '@/components/ContactItem';
import { Avatar } from '@/components/Avatar';
import { PlatformBadge } from '@/components/PlatformBadge';
import { Button } from '@/components/ui/button';
import { mockContacts, circles, Contact } from '@/data/mockData';

// Mock recent conversations
const mockConversations = [
  { id: 'conv1', message: 'Hey, great meeting you at the conference!', timestamp: '2 days ago', isSent: true },
  { id: 'conv2', message: 'Thanks! Would love to discuss the partnership further.', timestamp: '2 days ago', isSent: false },
  { id: 'conv3', message: 'Absolutely, let me send over some details.', timestamp: '1 day ago', isSent: true },
];

// Mock contact feeds - use supported platform types
const mockContactFeeds = [
  { id: 'feed1', title: 'Shared an article about AI trends', platform: 'linkedin' as const, timestamp: '5 hours ago' },
  { id: 'feed2', title: 'Posted a video: "Future of Tech"', platform: 'youtube' as const, timestamp: '1 day ago' },
  { id: 'feed3', title: 'Commented on your post', platform: 'linkedin' as const, timestamp: '2 days ago' },
];

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const filteredContacts = mockContacts.filter((contact) => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'All' || 
      (activeFilter === 'VIP' && contact.isVIP) ||
      contact.circle === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-center px-4 h-16">
          <span className="font-semibold text-foreground">Contacts</span>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </motion.div>

        {/* Filter Chips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2"
        >
          {circles.map((circle) => (
            <button
              key={circle}
              onClick={() => setActiveFilter(circle)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeFilter === circle
                  ? 'gradient-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {circle}
            </button>
          ))}
        </motion.div>

        {/* Contacts List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-2"
        >
          {filteredContacts.map((contact) => (
            <ContactItem
              key={contact.id}
              contact={contact}
              onClick={() => setSelectedContact(contact)}
            />
          ))}

          {filteredContacts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No contacts found</p>
            </div>
          )}
        </motion.div>
      </main>

      {/* Add Contact FAB */}
      <button className="fixed bottom-24 right-4 h-14 w-14 rounded-full gradient-primary shadow-glow flex items-center justify-center hover:scale-105 transition-transform">
        <Plus className="h-6 w-6 text-primary-foreground" />
      </button>

      {/* Contact Detail Modal - Positioned at top */}
      <AnimatePresence>
        {selectedContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm overflow-y-auto"
            onClick={() => setSelectedContact(null)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-card rounded-3xl shadow-elevated w-full max-w-lg mx-auto mt-[5vh] mb-24 overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedContact(null)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center z-10"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Content */}
              <div className="px-6 py-6">
                {/* Header */}
                <div className="flex flex-col items-center text-center mb-6">
                  <Avatar initials={selectedContact.avatar} size="xl" isVIP={selectedContact.isVIP} />
                  <h2 className="text-xl font-bold text-foreground mt-4">{selectedContact.name}</h2>
                  <p className="text-muted-foreground">
                    {selectedContact.title} {selectedContact.company && `at ${selectedContact.company}`}
                  </p>
                  
                  {/* Platforms */}
                  <div className="flex items-center gap-2 mt-4">
                    {selectedContact.platforms.map((platform) => (
                      <PlatformBadge key={platform} platform={platform} size="md" showLabel />
                    ))}
                  </div>
                </div>

                {/* AI Summary */}
                <div className="bg-primary/5 rounded-2xl p-4 mb-4 border border-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">AI Summary</span>
                  </div>
                  <p className="text-sm text-foreground">
                    {selectedContact.isVIP 
                      ? 'VIP contact with high engagement history. Known for quick responses and strategic partnerships. Consider scheduling quarterly check-ins.'
                      : 'Regular contact with moderate engagement. Last interaction was positive. Good candidate for collaborative opportunities.'}
                  </p>
                </div>

                {/* Last Contact */}
                <div className="bg-muted/50 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last contacted</span>
                    <span className="text-sm font-medium text-foreground">{selectedContact.lastContacted}</span>
                  </div>
                </div>

                {/* Recent Conversations - Timeline style */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Recent Conversations</span>
                    <span className="text-xs text-muted-foreground">(Last 10)</span>
                  </div>
                  <div className="relative pl-4 border-l-2 border-primary/20 space-y-3 max-h-48 overflow-y-auto">
                    {mockConversations.map((conv, index) => (
                      <div key={conv.id} className="relative">
                        <div className={`absolute -left-[21px] top-2 h-3 w-3 rounded-full border-2 ${
                          conv.isSent ? 'bg-primary border-primary' : 'bg-secondary border-secondary'
                        }`} />
                        <div className={`p-3 rounded-xl text-sm ${
                          conv.isSent 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'bg-muted/50 border border-border'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${conv.isSent ? 'text-primary' : 'text-muted-foreground'}`}>
                              {conv.isSent ? 'You' : selectedContact.name.split(' ')[0]}
                            </span>
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{conv.timestamp}</span>
                          </div>
                          <p className="text-foreground">{conv.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact's Feeds - Card grid */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Rss className="h-4 w-4 text-secondary" />
                    <span className="text-sm font-semibold text-foreground">Their Feeds</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {mockContactFeeds.map((feed) => (
                      <div
                        key={feed.id}
                        className="p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border border-border hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <PlatformBadge platform={feed.platform as any} size="md" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground line-clamp-2">{feed.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{feed.timestamp}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                  <Button className="flex-1 gradient-primary text-primary-foreground border-0">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}