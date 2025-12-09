import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Calendar, Sparkles, MessageSquare } from 'lucide-react';
import { ContactItem } from '@/components/ContactItem';
import { Avatar } from '@/components/Avatar';
import { PlatformBadge } from '@/components/PlatformBadge';
import { Button } from '@/components/ui/button';
import { mockContacts, circles, Contact } from '@/data/mockData';

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

      {/* Contact Detail Modal */}
      <AnimatePresence>
        {selectedContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setSelectedContact(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-card rounded-t-3xl shadow-elevated w-full max-w-lg max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-10 rounded-full bg-muted" />
              </div>

              {/* Close button */}
              <button
                onClick={() => setSelectedContact(null)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Content */}
              <div className="px-6 pb-8">
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
                <div className="bg-muted/50 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last contacted</span>
                    <span className="text-sm font-medium text-foreground">{selectedContact.lastContacted}</span>
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
