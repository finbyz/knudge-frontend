import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Calendar, Sparkles, MessageSquare, Rss, Camera, User, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ContactItem } from '@/components/ContactItem';
import { Avatar } from '@/components/Avatar';
import { PlatformBadge } from '@/components/PlatformBadge';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
// Resolved imports calling real API
import { contactsApi, Contact, Circle } from '@/api/contacts';
import { toast } from 'sonner';

// Platform options for new contacts
const platformOptions = [
  { id: 'whatsapp', label: 'WhatsApp', color: 'bg-[#25D366]' },
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-[#0A66C2]' },
  { id: 'email', label: 'Email', color: 'bg-gray-500' },
  { id: 'signal', label: 'Signal', color: 'bg-[#3A76F0]' },
  { id: 'telegram', label: 'Telegram', color: 'bg-[#26A5E4]' },
];

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    title: '',
    company: '',
    platforms: [] as string[],
  });

  // Real data state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCircles();
  }, []);

  useEffect(() => {
    loadContacts();
  }, [selectedCircleId]);

  const loadCircles = async () => {
    try {
      const circlesData = await contactsApi.getCircles();
      setCircles(circlesData);
    } catch (error) {
      console.error("Failed to load circles:", error);
      toast.error("Failed to load circles.");
    }
  };

  const loadContacts = async () => {
    setLoading(true);
    try {
      const contactsData = await contactsApi.getContacts(selectedCircleId || undefined);
      setContacts(contactsData);
    } catch (error) {
      console.error("Failed to load contacts:", error);
      toast.error("Failed to load contacts.");
    } finally {
      setLoading(false);
    }
  };

  const filterOptions = [
    { id: null, label: 'All' },
    ...circles.map(c => ({ id: c.id, label: c.name }))
  ];

  // Only client-side search filtering remains
  const filteredContacts = contacts.filter((contact) => {
    return contact.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading && contacts.length === 0 && circles.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <TopBar title="Contacts" />

      {/* Filter Bar - from api integrate but styled to fit under TopBar */}
      <div className="px-4 pb-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filterOptions.map((filter) => (
            <button
              key={filter.id || 'all'}
              onClick={() => setSelectedCircleId(filter.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCircleId === filter.id
                ? 'bg-foreground text-background'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted'
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contact List */}
      <main className="flex-1 overflow-y-auto px-4">
        <div className="divide-y divide-border/50">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <ContactItem
                key={contact.id}
                contact={contact as any} // Cast because UI might expect slightly diff shape, but ContactItem handles Contact type
                onClick={() => setSelectedContact(contact)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <p className="text-muted-foreground">No contacts found.</p>
                {selectedCircleId !== null && <Button variant="link" onClick={() => setSelectedCircleId(null)}>Clear filter</Button>}
            </div>
          )}
        </div>
      </main>

      {/* Add Contact FAB */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full gradient-primary shadow-glow flex items-center justify-center hover:scale-105 transition-transform"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </button>

      {/* Create Contact Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-card rounded-3xl shadow-elevated w-full max-w-lg mx-auto mt-[10vh] mb-24 overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center z-10"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              <div className="px-6 pt-6 pb-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">Create New Contact</h2>
              </div>

              <div className="px-6 py-6 space-y-5">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-cyan-400/20 flex items-center justify-center">
                      {newContact.name ? (
                        <span className="text-2xl font-bold text-foreground">
                          {newContact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      ) : (
                        <User className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                      <Camera className="h-4 w-4 text-primary-foreground" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Name *</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={newContact.name}
                    onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={newContact.phone}
                    onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={newContact.email}
                    onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Title</label>
                    <input
                      type="text"
                      placeholder="Job title"
                      value={newContact.title}
                      onChange={(e) => setNewContact(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Company</label>
                    <input
                      type="text"
                      placeholder="Company"
                      value={newContact.company}
                      onChange={(e) => setNewContact(prev => ({ ...prev, company: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {platformOptions.map((platform) => {
                      const isSelected = newContact.platforms.includes(platform.id);
                      return (
                        <button
                          key={platform.id}
                          onClick={() => {
                            setNewContact(prev => ({
                              ...prev,
                              platforms: isSelected
                                ? prev.platforms.filter(p => p !== platform.id)
                                : [...prev.platforms, platform.id]
                            }));
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isSelected
                              ? `${platform.color} text-white`
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                          {platform.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gradient-primary text-primary-foreground border-0"
                  onClick={() => {
                    if (!newContact.name.trim()) {
                      toast.error("Please enter a name");
                      return;
                    }
                    toast.success(`${newContact.name} added to contacts!`);
                    setNewContact({ name: '', phone: '', email: '', title: '', company: '', platforms: [] });
                    setShowCreateModal(false);
                  }}
                >
                  Create Contact
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <button
                onClick={() => setSelectedContact(null)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center z-10"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              <div className="px-6 py-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <Avatar initials={selectedContact.avatar || selectedContact.name.substring(0, 2)} size="xl" />
                  <h2 className="text-xl font-bold text-foreground mt-4">{selectedContact.name}</h2>
                  <p className="text-muted-foreground">
                    {selectedContact.linkedin_url && `via LinkedIn`}
                    {!selectedContact.linkedin_url && (selectedContact.email || selectedContact.phone)}
                  </p>

                  <div className="flex items-center gap-2 mt-4">
                    {(() => {
                      const platforms = [];
                      if (selectedContact.email) platforms.push('email');
                      if (selectedContact.phone) platforms.push('whatsapp');
                      if (selectedContact.linkedin_url) platforms.push('linkedin');

                      return platforms.length > 0 ? (
                        platforms.map(p => (
                          <PlatformBadge key={p} platform={p as any} size="md" showLabel />
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No connected platforms</span>
                      );
                    })()}
                  </div>
                </div>

                <div className="bg-primary/5 rounded-2xl p-4 mb-4 border border-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">AI Summary</span>
                  </div>
                  <p className="text-sm text-foreground">
                    Regular contact with moderate engagement. Last interaction was positive. Good candidate for collaborative opportunities.
                  </p>
                </div>

                <div className="bg-muted/50 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last contacted</span>
                    <span className="text-sm font-medium text-foreground">{selectedContact.last_contacted_at || 'Never'}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Recent Conversations</span>
                    <span className="text-xs text-muted-foreground">(Last 10)</span>
                  </div>
                  <div className="relative pl-4 border-l-2 border-primary/20 space-y-3 max-h-48 overflow-y-auto">
                    <div className="p-3 rounded-xl bg-muted/50 text-center">
                      <MessageSquare className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">No conversations yet</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Rss className="h-4 w-4 text-secondary" />
                    <span className="text-sm font-semibold text-foreground">Their Feeds</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-4 rounded-xl bg-muted/30 border border-border border-dashed text-center">
                      <Rss className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">No recent feeds from this contact</p>
                    </div>
                  </div>
                </div>

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