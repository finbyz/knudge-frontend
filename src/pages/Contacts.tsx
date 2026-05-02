import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Calendar, Sparkles, MessageSquare, Rss, Camera, User, Loader2, RotateCw, Mail, Building2, Send, Trash2, RefreshCw, Linkedin, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MoreHorizontal, MoreVertical, Edit2, Filter } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
import { useInboxStore } from '@/stores/inboxStore';

// Platform options for new contacts
const platformOptions = [
  { id: 'whatsapp', label: 'WhatsApp', color: 'bg-[#25D366]' },
  { id: 'gmail', label: 'Gmail', color: 'bg-[#EA4335]' },
  { id: 'outlook', label: 'Outlook', color: 'bg-[#0078D4]' },
  { id: 'telegram', label: 'Telegram', color: 'bg-[#26A5E4]' },
  { id: 'erpnext', label: 'ERPNext', color: 'bg-[#0078D4]' },
];

/**
 * Determine the correct messaging route for a contact based on their primary platform.
 * Returns { url } for navigation or { error } if no route is available.
 * For email contacts, also sets the inbox platform filter via the store.
 */
function getContactMessageRoute(contact: Contact): { url: string } | { error: string } {
  // Determine primary platform using same logic as the platform badge
  let primaryPlatform = 'unknown';
  if (contact.provider) {
    const providers = contact.provider.split(',');
    primaryPlatform = providers[0].trim().toLowerCase() === 'google_contacts'
      ? 'gmail'
      : providers[0].trim().toLowerCase();
  } else if (contact.has_whatsapp) primaryPlatform = 'whatsapp';
  else if (contact.has_telegram) primaryPlatform = 'telegram';
  else if (contact.email) primaryPlatform = 'email';

  // Helpers to attempt routing for each channel
  const tryWhatsApp = () => {
    if (contact.phone) {
      const phone = contact.phone.replace(/\D/g, '');
      const avatarParam = contact.avatar
        ? `&avatar=${encodeURIComponent(contact.avatar)}`
        : '';
      return {
        url: `/inbox/chat/wa?room=${phone}@s.whatsapp.net&name=${encodeURIComponent(contact.name)}&phone=${encodeURIComponent(contact.phone)}${avatarParam}`,
      };
    }
    return null;
  };

  const tryTelegram = () => {
    if (contact.telegram_chat_id) {
      const chatIdParam = `telegram-${contact.telegram_chat_id}`;
      const avatarParam = contact.avatar
        ? `&avatar=${encodeURIComponent(contact.avatar)}`
        : '';
      return {
        url: `/inbox/chat/${chatIdParam}?name=${encodeURIComponent(contact.name)}${avatarParam}`,
      };
    }
    return null;
  };

  const tryEmail = (platform: 'gmail' | 'outlook' = 'gmail') => {
    if (contact.email) {
      useInboxStore.getState().setSelectedPlatform(platform);
      return { url: `/inbox` };
    }
    return null;
  };

  // 1. Attempt to route using the primary platform first
  if (primaryPlatform === 'whatsapp') {
    const route = tryWhatsApp();
    if (route) return route;
  } else if (primaryPlatform === 'telegram') {
    const route = tryTelegram();
    if (route) return route;
  } else if (['gmail', 'outlook', 'email'].includes(primaryPlatform)) {
    const route = tryEmail(primaryPlatform === 'outlook' ? 'outlook' : 'gmail');
    if (route) return route;
  }

  // 2. Graceful Fallback: If primary platform data is missing, try other available channels
  if (contact.has_whatsapp || contact.phone) {
    const route = tryWhatsApp();
    if (route) return route;
  }

  if (contact.has_telegram) {
    const route = tryTelegram();
    if (route) return route;
  }

  if (contact.email) {
    const route = tryEmail();
    if (route) return route;
  }

  return { error: 'No messaging channel available for this contact' };
}

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
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [contextCounts, setContextCounts] = useState<Record<string, number> | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const contactsRef = useRef<Contact[]>([]);
  const nextCursorRef = useRef<string | null>(null);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const PAGE_SIZE = 20;

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
    async (pageNumber: number = 1) => {
      setLoading(true);
      setLoadError(false);
      try {
        const platform = selectedPlatform === 'all' ? 'all' : selectedPlatform;
        const page = await contactsApi.getContactsPage({
          platform,
          limit: PAGE_SIZE,
          offset: (pageNumber - 1) * PAGE_SIZE,
          circleId: selectedCircleId || undefined,
          search: debouncedSearch || undefined,
          validate: Boolean((import.meta as any).env?.VITE_CONTACTS_VALIDATE_SQL),
        });
        setContacts(page.items);
        setListMeta({
          total: page.total,
          truncated: page.truncated,
          hasMore: page.has_more,
        });
        setCurrentPage(pageNumber);
        void loadStats();
        if (import.meta.env.DEV && page.consistency) {
          const c = page.consistency as Record<string, unknown>;
          if (c.whatsapp_aligned === false || c.gmail_aligned === false) {
            console.warn('[contacts] SQL vs merge check (enable VITE_CONTACTS_VALIDATE_SQL)', page.consistency);
          }
        }
      } catch (error) {
        console.error('Failed to load contacts:', error);
        setLoadError(true);
        setContacts([]);
        setListMeta(null);
        toast.error('Could not load contacts. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    },
    [selectedCircleId, selectedPlatform, debouncedSearch, loadStats],
  );

  // ✅ Direct effect: re-fetch whenever circle, platform, or search changes
  useEffect(() => {
    void fetchContactsPage(1);
  }, [fetchContactsPage]);

  // Load per-platform counts for the filter dropdown
  const loadContextCounts = useCallback(async () => {
    setLoadingCounts(true);
    try {
      const platforms = ['all', 'whatsapp', 'gmail', 'outlook', 'telegram', 'erpnext', 'linkedin'] as const;
      const results = await Promise.allSettled(
        platforms.map(async (platform) => {
          const page = await contactsApi.getContactsPage({
            platform,
            limit: 1,
            offset: 0,
            circleId: selectedCircleId || undefined,
            search: debouncedSearch || undefined,
          });
          return [platform, page.total] as const;
        })
      );
      const counts: Record<string, number> = {};
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          counts[r.value[0]] = r.value[1];
        }
      });
      setContextCounts(counts);
    } catch (error) {
      console.error('Failed to load contextual filter counts:', error);
      setContextCounts(null);
    } finally {
      setLoadingCounts(false);
    }
  }, [selectedCircleId, debouncedSearch]);

  useEffect(() => {
    void loadContextCounts();
  }, [loadContextCounts]);

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
        await fetchContactsPage(1);
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
      await Promise.all([fetchContactsPage(1), loadStats(), loadCircles()]);
    } catch {
      toast.error('Could not reach the server to sync.');
      await fetchContactsPage(1);
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
      void fetchContactsPage(1);
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
    { id: null, label: 'All Circles', count: contextCounts?.all ?? stats?.total_contacts },
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
  if ((contextCounts?.whatsapp ?? 0) > 0) activeProviders.add('whatsapp');
  if ((contextCounts?.gmail ?? 0) > 0) activeProviders.add('gmail');
  if ((contextCounts?.outlook ?? 0) > 0) activeProviders.add('outlook');
  if ((contextCounts?.telegram ?? 0) > 0) activeProviders.add('telegram');
  if ((contextCounts?.erpnext ?? 0) > 0) activeProviders.add('erpnext');
  if ((contextCounts?.linkedin ?? 0) > 0) activeProviders.add('linkedin');

  // Keep current selection visible even when its count becomes 0.
  if (selectedPlatform !== 'all') activeProviders.add(selectedPlatform);

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

  const hasActiveFilters = Boolean(selectedCircleId) || selectedPlatform !== 'all' || Boolean(searchQuery.trim());

  if (loading && contacts.length === 0 && circles.length === 0) {
    return (
      <PageShell title="Contacts" className="pb-20">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Contacts" className="pb-20">
      <div className="flex flex-col relative w-full max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">Manage your connections and grow your network.</p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={syncingIntegrations || loading}
              onClick={syncIntegrationsAndReload}
              className="h-10 shrink-0 gap-2 font-medium"
            >
              <RefreshCw className={cn("h-4 w-4", syncingIntegrations && "animate-spin")} />
              Sync
            </Button>
            <Button
              className="h-10 shrink-0 gap-2 gradient-primary text-primary-foreground border-0 shadow-sm"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4" />
              Add contact
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-elevated border border-border/40 overflow-hidden flex flex-col mb-8 flex-1">
          <div className="p-4 border-b border-border/40 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="space-y-1">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</div>
                    {platformFilters.map((filter) => {
                      const count = filter.id === 'all'
                        ? (contextCounts?.all ?? stats?.total_contacts)
                        : (contextCounts?.[filter.id] ?? stats?.platform_counts?.[filter.id]);
                      const isSelected = selectedPlatform === filter.id;
                      return (
                        <button
                          key={filter.id}
                          onClick={() => setSelectedPlatform(filter.id)}
                          className={cn(
                            "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                            isSelected ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {getPlatformIcon(filter.id)}
                            <span>{filter.label}</span>
                          </div>
                          {count !== undefined && (
                            <span className={cn("text-xs", isSelected ? "opacity-80" : "text-muted-foreground")}>{count}</span>
                          )}
                        </button>
                      );
                    })}
                    {hasActiveFilters && (
                      <>
                        <div className="h-px bg-border my-1" />
                        <button
                          onClick={() => {
                            setSelectedCircleId(null);
                            setSelectedPlatform('all');
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          Clear filters
                        </button>
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border/40 mt-2">
              <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
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
              {loadingCounts && (
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0 animate-pulse">Refreshing…</span>
              )}
            </div>
          </div>

          {/* Contact List Data Table */}
          <div className="w-full min-w-0 flex-1 overflow-x-auto overflow-y-auto" style={{ minHeight: '60vh' }}>
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-border/40 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
                  <th className="px-6 py-3 font-semibold">Contact</th>
                  <th className="px-6 py-3 font-semibold">Source</th>
                  <th className="px-6 py-3 font-semibold">Added</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {showSyncingPlaceholder ? (
                  <tr>
                    <td colSpan={4}>
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
                          onClick={() => void fetchContactsPage(1)}
                        >
                          Retry
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : contacts.length > 0 ? (
                  contacts.map((contact) => {
                    const tgHandle = contact.telegram_username ? `@${String(contact.telegram_username).replace(/^@/, '')}` : null;
                    const subtitleParts = [
                      contact.email?.trim() || '',
                      contact.phone ? formatPhone(contact.phone) : '',
                      tgHandle || '',
                    ].filter(Boolean);

                    const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' · ') : 'No contact info';

                    let primaryPlatform = 'unknown';
                    if (contact.provider) {
                      const providers = contact.provider.split(',');
                      primaryPlatform = providers[0].trim().toLowerCase() === 'google_contacts' ? 'gmail' : providers[0].trim().toLowerCase();
                    } else if (contact.has_whatsapp) primaryPlatform = 'whatsapp';
                    else if (contact.has_telegram) primaryPlatform = 'telegram';
                    else if (contact.email) primaryPlatform = 'email';

                    const addedDate = contact.created_at ? new Date(contact.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown';

                    return (
                      <tr key={contact.id} className="group hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar initials={contact.name.substring(0, 2).toUpperCase()} src={contact.avatar} size="md" isGroup={contact.notes === 'WhatsApp Group'} />
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">{formatSenderName(contact.name)}</p>
                              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <PlatformBadge platform={primaryPlatform as any} size="sm" showLabel />
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-xs text-muted-foreground">{addedDate}</span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 rounded-md hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl">
                              <DropdownMenuItem onClick={() => { setSelectedContact(contact); setShowScheduleModal(true); }} className="gap-2 cursor-pointer">
                                <Calendar className="h-4 w-4" /> Schedule
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                const route = getContactMessageRoute(contact);
                                if ('url' in route) {
                                  window.location.href = route.url;
                                } else {
                                  toast.error(route.error);
                                }
                              }} className="gap-2 cursor-pointer">
                                <MessageSquare className="h-4 w-4" /> Message
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedContact(contact)} className="gap-2 cursor-pointer">
                                <Edit2 className="h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4}>
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
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {listMeta && listMeta.total > 0 && contacts.length > 0 && (
            <div className="flex items-center justify-between border-t border-border/40 px-6 py-4 bg-muted/10">
              <div className="text-xs text-muted-foreground font-medium">
                Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, listMeta.total)} of {listMeta.total}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchContactsPage(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, Math.ceil(listMeta.total / PAGE_SIZE)))].map((_, i) => {
                    const totalPages = Math.ceil(listMeta.total / PAGE_SIZE);
                    let pageNum = currentPage;
                    // Simple centering logic
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => fetchContactsPage(pageNum)}
                        className={cn("h-8 w-8 p-0 text-xs", currentPage === pageNum ? "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30" : "")}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {Math.ceil(listMeta.total / PAGE_SIZE) > 5 && currentPage < Math.ceil(listMeta.total / PAGE_SIZE) - 2 && (
                    <span className="text-muted-foreground px-1">...</span>
                  )}
                  {Math.ceil(listMeta.total / PAGE_SIZE) > 5 && currentPage < Math.ceil(listMeta.total / PAGE_SIZE) - 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchContactsPage(Math.ceil(listMeta.total / PAGE_SIZE))}
                      className="h-8 w-8 p-0 text-xs"
                    >
                      {Math.ceil(listMeta.total / PAGE_SIZE)}
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchContactsPage(currentPage + 1)}
                  disabled={!listMeta.hasMore || loading}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <div className="ml-4 flex items-center gap-2 border-l border-border/40 pl-4">
                  <span className="text-xs text-muted-foreground">20 / page</span>
                </div>
              </div>
            </div>
          )}
        </div>



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
                        void fetchContactsPage(1);
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
              className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm overflow-y-auto pt-28"
              onClick={() => setSelectedContact(null)}
            >
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-card rounded-3xl shadow-elevated w-full max-w-lg mx-auto mb-24 overflow-hidden relative"
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
                      {!selectedContact.linkedin_url &&
                        !selectedContact.instagram_username &&
                        (() => {
                          const line = [
                            selectedContact.email?.trim(),
                            selectedContact.phone ? formatPhone(selectedContact.phone) : '',
                          ]
                            .filter(Boolean)
                            .join(' · ');
                          return line || null;
                        })()}
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
                        conversations.map((msg, idx) => {
                          const platform = msg.platform || 'whatsapp';
                          const isEmail = ['gmail', 'outlook', 'email'].includes(platform);
                          const platformLabel = platform === 'gmail' ? 'Gmail'
                            : platform === 'outlook' ? 'Outlook'
                              : platform === 'email' ? 'Email'
                                : platform === 'whatsapp' ? 'WhatsApp'
                                  : platform === 'telegram' ? 'Telegram'
                                    : platform;
                          const platformColor = platform === 'gmail' ? 'text-red-500'
                            : platform === 'outlook' ? 'text-blue-500'
                              : platform === 'whatsapp' ? 'text-green-500'
                                : platform === 'telegram' ? 'text-sky-500'
                                  : 'text-muted-foreground';

                          return (
                            <div key={msg.id || idx} className={`p-3 rounded-2xl ${msg.from_me ? 'bg-primary/10 ml-4' : 'bg-muted/50 mr-4'}`}>
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[9px] font-bold uppercase ${platformColor}`}>
                                    {isEmail ? <Mail className="inline h-3 w-3 mr-0.5 -mt-px" /> : <MessageSquare className="inline h-3 w-3 mr-0.5 -mt-px" />}
                                    {platformLabel}
                                  </span>
                                  <span className="text-[10px] font-bold text-primary uppercase">
                                    {msg.from_me ? 'You' : msg.sender_name || 'Contact'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {msg.__timeLabel || '--:--'}
                                </span>
                              </div>
                              {isEmail && msg.subject && (
                                <p className="text-xs font-medium text-foreground/80 mb-0.5">📧 {msg.subject}</p>
                              )}
                              <p className="text-sm text-foreground">{msg.text}</p>
                            </div>
                          );
                        })
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
                        if (!selectedContact) return;
                        const route = getContactMessageRoute(selectedContact);
                        if ('url' in route) {
                          window.location.href = route.url;
                        } else {
                          toast.error(route.error);
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
                    // Capture BEFORE any state changes to avoid re-render race
                    const contactIdForReminder = selectedContact?.id;
                    const contactNameForReminder = selectedContact?.name;

                    setSavingReminder(true);
                    try {
                      const response = await remindersApi.create({
                        contact_id: contactIdForReminder,
                        contact_name: contactNameForReminder,
                        remind_at: new Date(scheduleDate).toISOString(),
                        note: scheduleNote || undefined,
                      });
                      
                      toast.success(`Reminder set for ${new Date(scheduleDate).toLocaleString()}`);
                      setShowScheduleModal(false);
                      setScheduleDate('');
                      setScheduleNote('');
                      
                      // Immediately add the new reminder to the UI state
                      if (response.success && response.reminder) {
                        setContactReminders(prev => [response.reminder, ...prev]);
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
    </PageShell>
  );
}