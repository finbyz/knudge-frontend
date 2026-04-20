import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Calendar, Sparkles, MessageSquare, Rss, Camera, User, Loader2, RotateCw, Mail, Building2, Send, Trash2, RefreshCw, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ContactItem } from '@/components/ContactItem';
import { Avatar } from '@/components/Avatar';
import { PlatformBadge } from '@/components/PlatformBadge';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/layout/PageShell';
// Resolved imports calling real API
import { contactsApi, Contact, Circle, ContactStats } from '@/api/contacts';
import { bridgesApi } from '@/api/bridges';
import { toast } from 'sonner';
import { cn, formatPhone, formatSenderName } from '@/lib/utils';
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
  const [syncingIntegrations, setSyncingIntegrations] = useState(false);
  const lastVisibilityRefetchRef = useRef(0);

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
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [listMeta, setListMeta] = useState<{
    total: number;
    truncated: boolean;
    hasMore: boolean;
  } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loadError, setLoadError] = useState(false);
  const contactsRef = useRef<Contact[]>([]);
  const nextCursorRef = useRef<string | null>(null);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const PAGE_SIZE = 100;

  const loadStats = useCallback(async () => {
    try {
      const statsData = await contactsApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadCircles();
    loadStats();
  }, [loadStats]);

  const fetchContactsPage = useCallback(
    async (append: boolean) => {
      if (!append) {
        setLoading(true);
        setLoadError(false);
        nextCursorRef.current = null;
      } else {
        setLoadingMore(true);
      }
      try {
        const platform = selectedPlatform === 'all' ? 'all' : selectedPlatform;
        const page = await contactsApi.getContactsPage({
          platform,
          limit: PAGE_SIZE,
          ...(append && nextCursorRef.current
            ? { cursor: nextCursorRef.current }
            : { offset: 0 }),
          circleId: selectedCircleId || undefined,
          search: debouncedSearch || undefined,
          validate: Boolean((import.meta as any).env?.VITE_CONTACTS_VALIDATE_SQL),
        });
        nextCursorRef.current = page.next_cursor ?? null;
        if (append) {
          setContacts((prev) => {
            const ids = new Set(prev.map((c) => c.id));
            const extra = page.items.filter((c) => !ids.has(c.id));
            return [...prev, ...extra];
          });
        } else {
          setContacts(page.items);
        }
        setListMeta({
          total: page.total,
          truncated: page.truncated,
          hasMore: page.has_more,
        });
        if (!append) {
          void loadStats();
        }
        if (import.meta.env.DEV && page.consistency) {
          const c = page.consistency as Record<string, unknown>;
          if (c.whatsapp_aligned === false || c.gmail_aligned === false) {
            console.warn('[contacts] SQL vs merge check (enable VITE_CONTACTS_VALIDATE_SQL)', page.consistency);
          }
        }
      } catch (error) {
        console.error('Failed to load contacts:', error);
        if (!append) {
          setLoadError(true);
          setContacts([]);
          setListMeta(null);
        }
        toast.error('Could not load contacts. Check your connection and try again.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedCircleId, selectedPlatform, debouncedSearch, loadStats]
  );

  useEffect(() => {
    void fetchContactsPage(false);
  }, [fetchContactsPage]);

  /** Pull fresh rows from connected bridges (WhatsApp, Gmail, …) then reload list. */
  const syncIntegrationsAndReload = useCallback(async () => {
    setSyncingIntegrations(true);
    try {
      const status = await bridgesApi.getStatus();
      const jobs: Promise<unknown>[] = [];

      if (status.whatsapp?.connected) jobs.push(bridgesApi.sync('whatsapp'));
      if (status.gmail?.connected) {
        jobs.push(
          bridgesApi.sync('gmail').then(() => bridgesApi.syncGmailInbox())
        );
      }
      if (status.outlook?.connected) jobs.push(bridgesApi.sync('outlook'));
      if (status.erpnext?.connected) jobs.push(bridgesApi.syncERPNext());
      if (status.telegram?.connected) jobs.push(bridgesApi.syncTelegram());
      if (status.instagram?.connected) jobs.push(bridgesApi.syncInstagram());

      if (jobs.length === 0) {
        toast.message('No connected sources', {
          description:
            'Open Sync settings to link WhatsApp, Gmail, or Telegram, or import LinkedIn connections (CSV), then tap Sync again.',
        });
        await fetchContactsPage(false);
        return;
      }

      const settled = await Promise.allSettled(jobs);
      const failed = settled.filter((s) => s.status === 'rejected').length;
      if (failed > 0) {
        toast.warning('Some syncs failed', {
          description: `${settled.length - failed} source(s) synced. Check Sync page for errors.`,
        });
      } else {
        toast.success('Synced from your sources');
      }
      await Promise.all([fetchContactsPage(false), loadStats(), loadCircles()]);
    } catch {
      toast.error('Could not reach the server to sync.');
      await fetchContactsPage(false);
    } finally {
      setSyncingIntegrations(false);
    }
  }, [fetchContactsPage]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastVisibilityRefetchRef.current < 12_000) return;
      lastVisibilityRefetchRef.current = now;
      void fetchContactsPage(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchContactsPage]);

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
    { id: null, label: 'All Circles', count: stats?.total_contacts },
    ...circles.map(c => ({ id: c.id, label: c.name, count: c.contacts_count }))
  ];

  // Helper for platform icons in filters
  const getPlatformIcon = (id: string) => {
    switch (id) {
      case 'whatsapp': return <MessageSquare className="h-3 w-3" />;
      case 'gmail':
      case 'google_contacts':
        return <Mail className="h-3 w-3" />;
      case 'outlook': return <Mail className="h-3 w-3" />;
      case 'telegram': return <Send className="h-3 w-3" />;
      case 'erpnext': return <Building2 className="h-3 w-3" />;
      case 'linkedin': return <Linkedin className="h-3 w-3" />;
      default: return null;
    }
  };

  const activeProviders = new Set(
    contacts.map((c) => (c.provider || '').toLowerCase()).filter(Boolean)
  );
  if (activeProviders.has('google_contacts')) {
    activeProviders.add('gmail');
  }
  if ((stats?.platform_counts?.gmail ?? 0) > 0) {
    activeProviders.add('gmail');
  }
  if ((stats?.platform_counts?.whatsapp ?? 0) > 0) {
    activeProviders.add('whatsapp');
  }
  // Providers may not appear on the first loaded page (sorted by name),
  // so use server stats to decide which chips to show.
  if ((stats?.platform_counts?.outlook ?? 0) > 0) activeProviders.add('outlook');
  if ((stats?.platform_counts?.telegram ?? 0) > 0) activeProviders.add('telegram');
  if ((stats?.platform_counts?.erpnext ?? 0) > 0) activeProviders.add('erpnext');
  if ((stats?.platform_counts?.linkedin ?? 0) > 0) activeProviders.add('linkedin');
  const platformFilters = [
    { id: 'all', label: 'All' },
    ...(activeProviders.has('whatsapp') ? [{ id: 'whatsapp', label: 'WhatsApp' }] : []),
    ...(activeProviders.has('gmail') ? [{ id: 'gmail', label: 'Gmail' }] : []),
    ...(activeProviders.has('outlook') ? [{ id: 'outlook', label: 'Outlook' }] : []),
    ...(activeProviders.has('telegram') ? [{ id: 'telegram', label: 'Telegram' }] : []),
    ...(activeProviders.has('erpnext') ? [{ id: 'erpnext', label: 'ERPNext' }] : []),
    ...(activeProviders.has('linkedin') || activeProviders.has('linkedin_native') 
          ? [{ id: 'linkedin', label: 'LinkedIn' }] : []),
  ];

  const showSyncingPlaceholder =
    !loading && !loadingMore && contacts.length === 0 && loadError;

  if (loading && contacts.length === 0 && circles.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageShell
      title="Contacts"
      toolbar={
        <div className="w-full min-w-0 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncingIntegrations || loading}
              onClick={syncIntegrationsAndReload}
              className="h-9 shrink-0 gap-2 border-primary/20 bg-primary/5 font-bold text-primary hover:bg-primary/10 hover:text-primary"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", syncingIntegrations && "animate-spin")} />
              Sync
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="shrink-0 text-[10px] font-bold tracking-widest text-muted-foreground/50 uppercase">Circles</span>
            <div className="scrollbar-hide flex gap-1.5 overflow-x-auto">
              {filterOptions.map((filter) => (
                <button
                  key={filter.id || 'all'}
                  type="button"
                  onClick={() => setSelectedCircleId(filter.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold whitespace-nowrap transition-all ${selectedCircleId === filter.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                >
                  {filter.label}
                  {filter.count !== undefined && (
                    <span className="ml-1 opacity-60 text-[9px]">({filter.count})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-[10px] font-bold tracking-widest text-muted-foreground/50 uppercase">Connect</span>
              <div className="scrollbar-hide flex gap-1.5 overflow-x-auto">
                {platformFilters.map((filter) => {
                  const count = filter.id === 'all'
                    ? stats?.total_contacts
                    : stats?.platform_counts?.[filter.id];

                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setSelectedPlatform(filter.id)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-[10px] font-bold tracking-wider whitespace-nowrap uppercase transition-all ${selectedPlatform === filter.id
                        ? 'border-foreground bg-foreground text-background shadow-sm'
                        : 'border-border bg-transparent text-muted-foreground hover:border-muted-foreground/50'
                        }`}
                    >
                      {getPlatformIcon(filter.id)}
                      {filter.label}
                      {count !== undefined && (
                        <span className="ml-1 opacity-60 text-[9px]">({count})</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      }
    >
      {/* Contact List */}
      <main className="w-full min-w-0 pb-20">
        <div className="divide-y divide-border/50">
          {showSyncingPlaceholder ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 px-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
              <p className="text-sm font-medium text-foreground">Contacts are syncing…</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Your sources are still merging, or the network hiccuped. Try Sync or pull to refresh in a moment.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void fetchContactsPage(false)}
              >
                Retry
              </Button>
            </div>
          ) : contacts.length > 0 ? (
            contacts.map((contact) => (
              <ContactItem
                key={contact.id}
                contact={contact as any} // Cast because UI might expect slightly diff shape, but ContactItem handles Contact type
                onClick={() => setSelectedContact(contact)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
              <p className="text-muted-foreground">No contacts match your filters.</p>
              {!searchQuery && selectedCircleId === null && (
                <div className="flex max-w-sm flex-col gap-2 text-sm text-muted-foreground">
                  <p>Pull in people from WhatsApp, Gmail, and other linked sources.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="gradient-primary border-0 text-primary-foreground"
                      disabled={syncingIntegrations}
                      onClick={() => void syncIntegrationsAndReload()}
                    >
                      <RefreshCw className={cn('mr-2 h-4 w-4', syncingIntegrations && 'animate-spin')} aria-hidden />
                      Sync now
                    </Button>
                    <Button type="button" size="sm" variant="outline" asChild>
                      <Link to="/connections">Sync</Link>
                    </Button>
                  </div>
                </div>
              )}
              {selectedCircleId !== null && (
                <Button variant="link" onClick={() => setSelectedCircleId(null)}>
                  Clear circle filter
                </Button>
              )}
            </div>
          )}
        </div>
        {listMeta?.truncated && (
          <p className="border-t border-border/50 px-4 py-2 text-center text-[11px] text-amber-800 dark:text-amber-200/90 bg-amber-500/10">
            Your address book is very large; this view shows the first portion. Counts in the header
            still reflect your full merged list.
          </p>
        )}
        {listMeta && listMeta.total > 0 && contacts.length > 0 && (
          <p className="border-t border-border/50 px-4 py-1.5 text-center text-[10px] text-muted-foreground">
            Showing {contacts.length} of {listMeta.total}
            {selectedPlatform !== 'all' ? ` · ${selectedPlatform}` : ''}
          </p>
        )}
        {listMeta?.hasMore && (
          <div className="flex justify-center border-t border-border/50 py-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={() => void fetchContactsPage(true)}
              className="min-w-[8rem]"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Loading…
                </>
              ) : (
                'Load more'
              )}
            </Button>
          </div>
        )}
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
                      void fetchContactsPage(false);
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
                  <h2 className="text-xl font-bold text-foreground mt-4">{formatSenderName(selectedContact.name)}</h2>
                  <p className="text-muted-foreground">
                    {selectedContact.linkedin_url && `via LinkedIn`}
                    {selectedContact.instagram_username && ` @${selectedContact.instagram_username}`}
                    {!selectedContact.linkedin_url && !selectedContact.instagram_username && (selectedContact.email || formatPhone(selectedContact.phone))}
                  </p>

                  <div className="flex items-center gap-2 mt-4">
                    {(() => {
                      const platforms: string[] = [];

                      // 1. Check explicit providers
                      if (selectedContact.provider) {
                        const providers = selectedContact.provider.split(',');
                        platforms.push(...providers);
                      }

                      // 2. Fallbacks
                      if (selectedContact.email && !platforms.some(p => ['gmail', 'outlook', 'email'].includes(p))) {
                        platforms.push('email');
                      }
                      if (selectedContact.phone && !platforms.includes('whatsapp')) {
                        platforms.push('whatsapp');
                      }
                      if (selectedContact.linkedin_url && !platforms.includes('linkedin')) {
                        platforms.push('linkedin');
                      }
                      if (selectedContact.instagram_username && !platforms.includes('instagram')) {
                        platforms.push('instagram');
                      }

                      return platforms.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {platforms.map(p => (
                            <PlatformBadge key={p} platform={p as any} size="md" showLabel />
                          ))}
                        </div>
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

    </PageShell>
  );
}