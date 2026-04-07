import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Calendar, Sparkles, MessageSquare, Rss, Camera, User, Loader2, RotateCw, Mail, Building2, Send, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ContactItem } from '@/components/ContactItem';
import { Avatar } from '@/components/Avatar';
import { PlatformBadge } from '@/components/PlatformBadge';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
// Resolved imports calling real API
import { contactsApi, Contact, Circle } from '@/api/contacts';
import { toast } from 'sonner';
import { formatPhone } from '@/lib/utils';
import { remindersApi } from '@/api/reminders';

// Platform options for new contacts
const platformOptions = [
  { id: 'whatsapp', label: 'WhatsApp', color: 'bg-[#25D366]' },
  { id: 'gmail', label: 'Gmail', color: 'bg-[#EA4335]' },
  { id: 'outlook', label: 'Outlook', color: 'bg-[#0078D4]' },
  { id: 'telegram', label: 'Telegram', color: 'bg-[#26A5E4]' },
  { id: 'erpnext', label: 'ERPNext', color: 'bg-[#0078D4]' },
];

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
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

  // Conversation state
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [refreshingConversations, setRefreshingConversations] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleNote, setScheduleNote] = useState('');
  const [contactReminders, setContactReminders] = useState<any[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);

  useEffect(() => {
    loadCircles();
  }, []);

  useEffect(() => {
    loadContacts();
  }, [selectedCircleId]);

  useEffect(() => {
    if (selectedContact) {
      loadConversations(selectedContact.id);
      loadContactReminders(selectedContact.id);
    } else {
      setConversations([]);
      setContactReminders([]);
    }
  }, [selectedContact]);

  const loadConversations = async (contactId: string, forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshingConversations(true);
    } else {
      setLoadingConversations(true);
    }
    try {
      const response = await contactsApi.getContactConversations(contactId, {
        refresh: forceRefresh,
        limit: 10,
      });
      if (response.success) {
        const normalized = (response.conversations || []).map((msg: any, idx: number) => {
          const tsRaw = msg.timestamp;
          const parsed =
            typeof tsRaw === 'number'
              ? new Date(tsRaw > 1e11 ? tsRaw : tsRaw * 1000)
              : new Date(tsRaw);
          const validDate = !Number.isNaN(parsed.getTime());
          const text = msg.text || msg.body || '';

          return {
            ...msg,
            id: msg.id || `${contactId}-${idx}`,
            text,
            sender_name: msg.sender_name || (msg.from_me ? 'You' : 'Contact'),
            __timeLabel: validDate
              ? parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '',
          };
        });
        setConversations(normalized);
        if (forceRefresh) {
          const textCount = normalized.filter((m: any) => (m.text || '').trim()).length;
          toast.success(`Conversations reloaded (${textCount} messages)`);
        }
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
      if (forceRefresh) {
        toast.error('Failed to reload conversations');
      }
    } finally {
      setLoadingConversations(false);
      setRefreshingConversations(false);
    }
  };

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

  const loadContactReminders = async (contactId: string) => {
    setLoadingReminders(true);
    try {
      const response = await remindersApi.list("PENDING", contactId);
      if (response.success) {
        setContactReminders(response.reminders);
      }
    } catch (error) {
      console.error("Failed to load reminders:", error);
    } finally {
      setLoadingReminders(false);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      const response = await remindersApi.delete(id);
      if (response.success) {
        toast.success("Reminder deleted");
        if (selectedContact) {
          loadContactReminders(selectedContact.id);
        }
      }
    } catch (error) {
      toast.error("Failed to delete reminder");
    }
  };

  const filterOptions = [
    { id: null, label: 'All Circles' },
    ...circles.map(c => ({ id: c.id, label: c.name }))
  ];

  // Helper for platform icons in filters
  const getPlatformIcon = (id: string) => {
    switch (id) {
      case 'whatsapp': return <MessageSquare className="h-3 w-3" />;
      case 'gmail': return <Mail className="h-3 w-3" />;
      case 'outlook': return <Mail className="h-3 w-3" />;
      case 'telegram': return <Send className="h-3 w-3" />;
      case 'erpnext': return <Building2 className="h-3 w-3" />;
      default: return null;
    }
  };

  const platformFilters = [
    { id: 'all', label: 'All' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'gmail', label: 'Gmail' },
    { id: 'outlook', label: 'Outlook' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'erpnext', label: 'ERPNext' },
  ];

  // Client-side filtering for search and platform
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedPlatform !== 'all') {
      if (selectedPlatform === 'whatsapp') {
        if (!contact.phone && contact.provider !== 'whatsapp') return false;
      } else if (selectedPlatform === 'gmail') {
        if (contact.provider !== 'gmail') return false;
      } else if (selectedPlatform === 'outlook') {
        if (contact.provider !== 'outlook') return false;
      } else if (selectedPlatform === 'telegram') {
        if (contact.provider !== 'telegram') return false;
      } else if (selectedPlatform === 'erpnext') {
        if (contact.provider !== 'erpnext') return false;
      }
    }
    return true;
  });

  if (loading && contacts.length === 0 && circles.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-0">
      <TopBar title="Contacts" />

      {/* Filter Bar - from api integrate but styled to fit under TopBar */}
      <div className="max-w-5xl mx-auto px-6 pt-0 pb-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest shrink-0">Circles</span>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {filterOptions.map((filter) => (
              <button
                key={filter.id || 'all'}
                onClick={() => setSelectedCircleId(filter.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${selectedCircleId === filter.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest shrink-0">Connect</span>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {platformFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedPlatform(filter.id)}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${selectedPlatform === filter.id
                  ? 'bg-foreground text-background border-foreground shadow-sm'
                  : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground/50'
                  }`}
              >
                {getPlatformIcon(filter.id)}
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contact List */}
      <main className="max-w-5xl mx-auto px-6 pb-20">
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
                  onClick={() => setShowScheduleModal(true)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
                <Button
                  className="flex-1 gradient-primary text-primary-foreground border-0"
                  onClick={async () => {
                    if (!newContact.name.trim()) {
                      toast.error("Please enter a name");
                      return;
                    }
                    try {
                      await contactsApi.createContact({
                        name: newContact.name,
                        phone: newContact.phone || undefined,
                        email: newContact.email || undefined,
                      });
                      toast.success(`${newContact.name} added to contacts!`);
                      setNewContact({ name: '', phone: '', email: '', title: '', company: '', platforms: [] });
                      setShowCreateModal(false);
                      loadContacts();
                    } catch (error) {
                      toast.error("Failed to create contact");
                    }
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
                  <Avatar
                    initials={selectedContact.name.substring(0, 2).toUpperCase()}
                    src={selectedContact.avatar}
                    size="xl"
                  />
                  <h2 className="text-xl font-bold text-foreground mt-4">{selectedContact.name}</h2>
                  <p className="text-muted-foreground">
                    {selectedContact.linkedin_url && `via LinkedIn`}
                    {selectedContact.instagram_username && ` @${selectedContact.instagram_username}`}
                    {!selectedContact.linkedin_url && !selectedContact.instagram_username && (selectedContact.email || formatPhone(selectedContact.phone))}
                  </p>

                  <div className="flex items-center gap-2 mt-4">
                    {(() => {
                      const platforms = [];
                      if (selectedContact.email) platforms.push('email');
                      if (selectedContact.phone) platforms.push('whatsapp');
                      if (selectedContact.linkedin_url) platforms.push('linkedin');
                      if (selectedContact.instagram_username) platforms.push('instagram');

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
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Recent Conversations</span>
                      <span className="text-xs text-muted-foreground">(Last 10)</span>
                    </div>
                    <button
                      type="button"
                      disabled={loadingConversations || refreshingConversations}
                      onClick={() => selectedContact && loadConversations(selectedContact.id, true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      aria-label="Reload conversations"
                    >
                      <RotateCw className={`h-3.5 w-3.5 ${(loadingConversations || refreshingConversations) ? 'animate-spin' : ''}`} />
                      Reload
                    </button>
                  </div>
                  <div className="relative pl-4 border-l-2 border-primary/20 space-y-3 max-h-60 overflow-y-auto">
                    {loadingConversations ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : conversations.length > 0 ? (
                      conversations.map((msg, idx) => (
                        <div key={idx} className={`p-3 rounded-2xl ${msg.from_me ? 'bg-primary/10 ml-4' : 'bg-muted/50 mr-4'}`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-bold text-primary uppercase">
                              {msg.from_me ? 'You' : msg.sender_name || 'Contact'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {msg.__timeLabel || '--:--'}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">{msg.text}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 rounded-xl bg-muted/50 text-center">
                        <MessageSquare className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">No conversations yet</p>
                      </div>
                    )}
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

                {/* Active Reminders Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-semibold text-foreground">Active Reminders</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {loadingReminders ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : contactReminders.length > 0 ? (
                      contactReminders.map((reminder) => (
                        <div key={reminder.id} className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                                {new Date(reminder.remind_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(reminder.remind_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {reminder.note && (
                              <p className="text-sm text-foreground">{reminder.note}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteReminder(reminder.id)}
                            className="p-1.5 rounded-lg hover:bg-orange-500/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-xl bg-muted/30 border border-border border-dashed text-center">
                        <Calendar className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">No pending reminders</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowScheduleModal(true)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                  <Button
                    className="flex-1 gradient-primary text-primary-foreground border-0"
                    onClick={() => {
                      if (selectedContact?.phone) {
                        const phone = selectedContact.phone.replace(/\D/g, '');
                        const avatarParam = selectedContact.avatar
                          ? `&avatar=${encodeURIComponent(selectedContact.avatar)}`
                          : '';
                        window.location.href = `/inbox/chat/wa?room=${phone}@s.whatsapp.net&name=${encodeURIComponent(selectedContact.name)}&phone=${encodeURIComponent(selectedContact.phone)}${avatarParam}`;
                      } else {
                        toast.error('No phone number available');
                      }
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[60] bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-elevated">
            <h3 className="font-semibold text-foreground">Schedule Follow-up</h3>
            <p className="text-xs text-muted-foreground">
              {selectedContact ? `For: ${selectedContact.name}` : 'Set a reminder'}
            </p>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Date & Time</label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Note (optional)</label>
              <input
                type="text"
                placeholder="Reminder note..."
                value={scheduleNote}
                onChange={(e) => setScheduleNote(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowScheduleModal(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 gradient-primary text-primary-foreground border-0"
                disabled={savingReminder}
                onClick={async () => {
                  if (!scheduleDate) {
                    toast.error("Please select a date & time");
                    return;
                  }
                  setSavingReminder(true);
                  try {
                    await remindersApi.create({
                      contact_id: selectedContact?.id,
                      contact_name: selectedContact?.name,
                      remind_at: new Date(scheduleDate).toISOString(),
                      note: scheduleNote || undefined,
                    });
                    toast.success(`Reminder set for ${new Date(scheduleDate).toLocaleString()}`);
                    setShowScheduleModal(false);
                    setScheduleDate('');
                    setScheduleNote('');
                    if (selectedContact) {
                      loadContactReminders(selectedContact.id);
                    }
                  } catch (error) {
                    toast.error("Failed to create reminder");
                  } finally {
                    setSavingReminder(false);
                  }
                }}
              >
                {savingReminder ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                {savingReminder ? 'Saving...' : 'Schedule'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}