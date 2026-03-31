import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { User, Users, Sparkles, Bell, Crown, LogOut, ChevronRight, Plus, Edit2, X, Phone, Mail, Linkedin as LinkedinIcon, MessageCircle, Send, Search, Check, UserCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import { cn } from '@/lib/utils';
import { authApi, UserResponse } from '@/api/auth';
import { contactsApi, Circle, Contact } from '@/api/contacts';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { knowledgeApi, KnowledgeDocument } from '@/api/knowledge';
import { researchApi, UserResearchProfile } from '@/api/research';
import { Avatar } from '@/components/Avatar';
import { FileText, Trash2, Upload, Loader2, AlertCircle, RefreshCw, Globe, ExternalLink } from 'lucide-react';
import { useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ChannelType = 'whatsapp' | 'linkedin' | 'email' | 'outlook' | 'telegram';

// Helper to determine channels from circle frequency/name (since backend Circle doesn't have channels/outreachAgenda yet)
// We will use local state or defaults for now until backend supports it fully
interface CircleWithUI extends Circle {
  channels: ChannelType[];
  contacts: number; // For display count
  outreach_agenda: string;
  contact_ids?: string[]; // IDs of members
}

const channelOptions: { id: ChannelType; label: string; color: string; icon: React.ReactNode }[] = [
  { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', icon: <MessageCircle className="h-4 w-4" /> },
  { id: 'telegram', label: 'Telegram', color: '#229ED9', icon: <Send className="h-4 w-4" /> },
  { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', icon: <LinkedinIcon className="h-4 w-4" /> },
  { id: 'email', label: 'Email', color: '#6B7280', icon: <Mail className="h-4 w-4" /> },
  { id: 'outlook', label: 'Outlook', color: '#0078D4', icon: <Mail className="h-4 w-4" /> },
];

const frequencyOptions = ['Daily', 'Weekly', 'Every 2 weeks', 'Monthly', 'Quarterly'];

const renderHighlights = (text: string): React.ReactNode => {
  if (!text) return null;
  const parts = text.split(/(\[\[.*?\]\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const word = part.slice(2, -2);
      return (
        <span key={i} className="text-primary font-semibold">
          {word}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

const CollapsibleText = ({ text, maxLength = 250, className }: { text: string; maxLength?: number; className?: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  return (
    <div className="w-full">
      <p className={cn(
        "text-sm text-foreground mt-1 transition-all leading-relaxed",
        !isExpanded && text.length > maxLength && "line-clamp-3",
        className
      )}>
        {text}
      </p>
      {text.length > maxLength && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent parent clicks if inside a clickable card
            setIsExpanded(!isExpanded);
          }}
          className="text-xs text-primary font-medium mt-1.5 hover:underline focus:outline-none flex items-center gap-1"
        >
          {isExpanded ? "Show Less" : "Read More"}
        </button>
      )}
    </div>
  );
};

export default function Settings() {
  const { logout, setUser } = useAuthStore();
  const [tone, setTone] = useState('professional');
  const [messageLength, setMessageLength] = useState(1);
  const [birthdayReminders, setBirthdayReminders] = useState(true);
  const [socialMonitoring, setSocialMonitoring] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [circles, setCircles] = useState<CircleWithUI[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [showCircleForm, setShowCircleForm] = useState(false);
  const [editingCircle, setEditingCircle] = useState<CircleWithUI | null>(null);

  // Adjusted form state
  const [circleForm, setCircleForm] = useState<{ name: string; frequency: string; channels: ChannelType[]; outreach_agenda: string; contact_ids: string[] }>({
    name: '', frequency: 'Weekly', channels: [], outreach_agenda: '', contact_ids: []
  });

  const [contactSearchQuery, setContactSearchQuery] = useState('');

  // New Contact Inline Form
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [newContactForm, setNewContactForm] = useState({ name: '', email: '', phone: '' });

  const [showProfileForm, setShowProfileForm] = useState(false);
  const [userProfile, setUserProfile] = useState<UserResponse | null>(null);
  const [research, setResearch] = useState<UserResearchProfile | null>(null);
  const [profileForm, setProfileForm] = useState<UserResponse>({
    id: '', username: '', email: ''
  });
  // Knowledge Base State
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isResearcing, setIsResearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userData, circlesData, contactsData, documentsRes, researchData] = await Promise.all([
        authApi.getMe(),
        contactsApi.getCircles(),
        contactsApi.getContacts(),
        knowledgeApi.getDocuments(),
        researchApi.getUserResearchProfile()
      ]);
      setUserProfile(userData);
      setResearch(researchData);
      setDocuments(documentsRes.documents);
      setUser(userData); // Sync to global store
      // Load notification preferences - use ?? to handle undefined/null with default true
      setBirthdayReminders(userData.birthday_reminders ?? true);
      setSocialMonitoring(userData.social_monitoring ?? true);
      setPushNotifications(userData.push_notifications ?? true);
      // Load message preferences
      setTone(userData.message_tone ?? 'professional');
      const lengthToIndex: Record<string, number> = { short: 0, medium: 1, long: 2 };
      setMessageLength(lengthToIndex[(userData.message_length || 'medium').toLowerCase()] ?? 1);
      setAllContacts(contactsData);

      // Enhance circles
      const enhancedCircles: CircleWithUI[] = await Promise.all(circlesData.map(async (c) => {
        // Fetch contacts for this circle to get count and IDs
        // This is N+1 but okay for limited circles
        const members = await contactsApi.getContacts(c.id);
        return {
          ...c,
          channels: (c.channels || ['whatsapp']) as ChannelType[],
          contacts: members.length,
          contact_ids: members.map(m => m.id),
          outreach_agenda: c.outreach_agenda
        };
      }));
      setCircles(enhancedCircles);
    } catch (error) {
      console.error("Failed to load settings data", error);
      toast.error("Failed to load data");
    }
  };

  const tones = ['Casual', 'Professional', 'Friendly'];
  const lengths = ['Short', 'Medium', 'Long'];

  const handleAddCircle = () => {
    setEditingCircle(null);
    setCircleForm({ name: '', channels: [], frequency: 'Weekly', outreach_agenda: '', contact_ids: [] });
    setContactSearchQuery('');
    setShowCircleForm(true);
  };

  const toggleChannel = (channel: ChannelType) => {
    setCircleForm(prev => {
      const current = prev.channels;
      if (current.includes(channel)) {
        // Prevent deselecting the last one if you want to enforce at least one, 
        // or allow empty but validation alerts it.
        // Let's allow empty here, validation in render handles 'Save' button.
        return {
          ...prev,
          channels: current.filter(c => c !== channel)
        };
      } else {
        return {
          ...prev,
          channels: [...current, channel]
        };
      }
    });
  };

  const toggleContact = (contactId: string) => {
    setCircleForm(prev => ({
      ...prev,
      contact_ids: prev.contact_ids.includes(contactId)
        ? prev.contact_ids.filter(id => id !== contactId)
        : [...prev.contact_ids, contactId]
    }));
  };

  const handleCreateNewContact = async () => {
    if (!newContactForm.name) return;
    try {
      const newContact = await contactsApi.createContact({
        name: newContactForm.name,
        email: newContactForm.email || undefined,
        phone: newContactForm.phone || undefined
      });
      setAllContacts(prev => [...prev, newContact]);
      // Auto-select
      toggleContact(newContact.id);

      setNewContactForm({ name: '', email: '', phone: '' });
      setShowNewContactForm(false);
      toast.success("Contact created");
    } catch (e) {
      toast.error("Failed to create contact");
    }
  };

  const handleEditCircle = (circle: CircleWithUI) => {
    setEditingCircle(circle);
    setCircleForm({
      name: circle.name,
      frequency: circle.frequency,
      channels: circle.channels,
      outreach_agenda: circle.outreach_agenda,
      contact_ids: circle.contact_ids || []
    });
    setContactSearchQuery('');
    setShowCircleForm(true);
  };

  const selectAllContacts = () => {
    const filteredIds = filteredContacts.map(c => c.id);
    setCircleForm(prev => ({
      ...prev,
      contact_ids: [...new Set([...prev.contact_ids, ...filteredIds])]
    }));
  };

  const clearAllContacts = () => {
    setCircleForm(prev => ({ ...prev, contact_ids: [] }));
  };

  const filteredContacts = allContacts.filter(contact => {
    // 1. Text Search Filter
    const query = contactSearchQuery.toLowerCase();
    const matchesSearch = (contact.name && contact.name.toLowerCase().includes(query)) ||
      (contact.email && contact.email.toLowerCase().includes(query)) ||
      (contact.phone && contact.phone.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    // 2. Channel Availability Filter
    // If channels are selected, show contacts that match AT LEAST ONE of the selected channels.
    const selectedChannels = circleForm.channels;

    if (selectedChannels.length === 0) return true; // Show all if nothing selected (though valid requires 1)

    let matchesChannel = false;

    if (selectedChannels.includes('whatsapp')) {
      if (contact.phone || contact.is_group || contact.provider === 'whatsapp') matchesChannel = true;
    }
    if (!matchesChannel && (selectedChannels.includes('email') || selectedChannels.includes('outlook'))) {
      if (contact.email) matchesChannel = true;
    }
    if (!matchesChannel && selectedChannels.includes('linkedin')) {
      if (contact.linkedin_url) matchesChannel = true;
    }
    if (!matchesChannel && selectedChannels.includes('telegram')) {
      // Check provider or existence of phone (since Telegram uses phone)
      if ((contact as any).provider === 'telegram' || contact.phone) matchesChannel = true;
    }

    return matchesChannel;
  });

  const handleSaveCircle = async () => {
    if (!circleForm.name || !circleForm.outreach_agenda || circleForm.channels.length === 0) return;

    try {
      if (editingCircle) {
        const updated = await contactsApi.updateCircle(editingCircle.id, {
          name: circleForm.name,
          frequency: circleForm.frequency,
          contact_ids: circleForm.contact_ids,
          outreach_agenda: circleForm.outreach_agenda,
          channels: circleForm.channels
        });
        // Merge with local UI state (channels, etc.)
        const merged: CircleWithUI = {
          ...editingCircle,
          ...updated,
          channels: circleForm.channels,
          outreach_agenda: circleForm.outreach_agenda,
          contact_ids: circleForm.contact_ids,
          contacts: circleForm.contact_ids.length
        };

        setCircles((prev) =>
          prev.map((c) => c.id === editingCircle.id ? merged : c)
        );
        toast.success("Circle updated");
      } else {
        const created = await contactsApi.createCircle({
          name: circleForm.name,
          frequency: circleForm.frequency,
          contact_ids: circleForm.contact_ids,
          outreach_agenda: circleForm.outreach_agenda,
          channels: circleForm.channels
        });
        // Enhance with local UI state
        const enhanced: CircleWithUI = {
          ...created,
          contacts: circleForm.contact_ids.length,
          contact_ids: circleForm.contact_ids,
          channels: circleForm.channels,
          outreach_agenda: circleForm.outreach_agenda
        };
        setCircles((prev) => [...prev, enhanced]);
        toast.success("Circle created");
      }
      setShowCircleForm(false);
      setEditingCircle(null);
    } catch (error) {
      console.error("Failed to save circle", error);
      toast.error("Failed to save circle");
    }
  };

  const handleDeleteCircle = async () => {
    if (editingCircle) {
      try {
        await contactsApi.deleteCircle(editingCircle.id);
        setCircles((prev) => prev.filter((c) => c.id !== editingCircle.id));
        toast.success("Circle deleted");
      } catch (error) {
        console.error("Failed to delete circle", error);
        toast.error("Failed to delete circle");
      }
    }
    setShowCircleForm(false);
    setEditingCircle(null);
  };

  const handleEditProfile = () => {
    setProfileForm(userProfile ?? {
      id: '', username: '', email: '',
      first_name: '',
      last_name: '',
      phone: '',
      linkedin_url: '',
      personal_profile: ''
    });
    setShowProfileForm(true);
  };

  const handleSaveProfile = async () => {
    try {
      const updated = await authApi.updateMe({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        phone: profileForm.phone,
        linkedin_url: profileForm.linkedin_url,
        personal_profile: profileForm.personal_profile
      });
      setUserProfile(updated);
      setUser(updated); // Sync to global store
      setShowProfileForm(false);
      toast.success("Profile updated");
    } catch (error) {
      console.error("Failed to update profile", error);
      toast.error("Failed to update profile");
    }
  };

  const handleReResearch = async () => {
    if (!userProfile?.linkedin_url) {
      toast.error("Please add a LinkedIn URL in Profile settings first");
      return;
    }

    setIsResearching(true);
    try {
      const result = await researchApi.researchUserProfile(userProfile.linkedin_url);
      setResearch(result);

      // Refresh user data (for photo_url)
      const freshUser = await authApi.getMe();
      setUserProfile(freshUser);
      setUser(freshUser);

      // Refresh KB documents (for new research chunks)
      const docs = await knowledgeApi.getDocuments();
      setDocuments(docs.documents);

      toast.success("Profile research complete! Your digital twin is updated.");
    } catch (err: any) {
      toast.error(err.message || "Research failed");
    } finally {
      setIsResearching(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }

    setUploadingFile(true);
    try {
      await knowledgeApi.uploadDocument(file);
      toast.success('Document uploaded');
      // Refresh list
      const res = await knowledgeApi.getDocuments();
      setDocuments(res.documents);
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploadingFile(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await knowledgeApi.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      toast.success('Document deleted');
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-0">
      <TopBar title="Settings" />

      <main className="px-4 pt-0 pb-6 space-y-6">
        {/* Profile Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Digital Twin</h2>
            <button
              onClick={handleReResearch}
              disabled={isResearcing}
              className="flex items-center gap-1.5 text-primary text-sm font-medium disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", isResearcing && "animate-spin")} />
              {isResearcing ? "Analysing..." : "Re-research"}
            </button>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            {/* Header info */}
            <div className="p-5 flex items-center gap-5">
              <Avatar
                src={userProfile?.photo_url}
                initials={`${userProfile?.first_name?.[0] || 'U'}${userProfile?.last_name?.[0] || ''}`}
                size="xl"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground truncate">
                    {userProfile ?
                      (userProfile.first_name || userProfile.last_name
                        ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
                        : userProfile.username)
                      : 'User'}
                  </h3>
                  <button
                    onClick={handleEditProfile}
                    className="p-1 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                </div>
                {research?.headline && (
                  <p className="text-sm font-medium text-foreground/80 line-clamp-1 mb-1">
                    {research.headline}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {research?.location && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {research.location}
                    </span>
                  )}
                  {userProfile?.linkedin_url && (
                    <a
                      href={userProfile.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <LinkedinIcon className="h-3 w-3" /> LinkedIn <ExternalLink className="h-2 w-2" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* AI Summary / Highlights */}
            {research?.short_summary ? (
              <div className="px-5 pb-5 pt-2 border-t border-border/50">
                <p className="text-[15px] leading-relaxed text-foreground">
                  {renderHighlights(research.short_summary)}
                </p>

                {research.full_bio && (
                  <div className="mt-4">
                    <CollapsibleText
                      text={research.full_bio}
                      maxLength={300}
                      className="text-muted-foreground italic leading-relaxed"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="px-5 pb-5 pt-3 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Set your LinkedIn URL and click "Re-research" to build your detailed profile.
                </p>
              </div>
            )}

            {/* Talking Points & Topics Footer */}
            {(research?.talking_points?.length || research?.topics?.length) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-border">
                {research.talking_points?.length > 0 && (
                  <div className="p-5 border-b md:border-b-0 md:border-r border-border">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Talking Points</h4>
                    <ul className="space-y-2">
                      {research.talking_points.slice(0, 3).map((point, i) => (
                        <li key={i} className="text-sm text-foreground flex gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {research.topics?.length > 0 && (
                  <div className="p-5 bg-muted/20">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Core Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {research.topics.map((topic, i) => (
                        <span key={i} className="px-2 py-1 rounded-md bg-background border border-border text-[11px] font-medium text-muted-foreground">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.section>

        {/* Circles Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Circles</h2>
            <button
              onClick={handleAddCircle}
              className="flex items-center gap-1 text-primary text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
          <div className="bg-card rounded-2xl border border-border divide-y divide-border">
            {circles.map((circle) => (
              <button
                key={circle.id}
                onClick={() => handleEditCircle(circle)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{circle.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {circle.frequency} • {circle.contacts} contacts
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </motion.section>

        {/* AI Preferences */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">AI Preferences</h2>
          <div className="bg-card rounded-2xl border border-border p-4 space-y-6">
            {/* Tone */}
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Message Tone</label>
              <div className="flex gap-2">
                {tones.map((t) => (
                  <button
                    key={t}
                    onClick={async () => {
                      const value = t.toLowerCase();
                      setTone(value);
                      try {
                        await authApi.updateMe({ message_tone: value });
                        toast.success('Message tone set to ' + t);
                      } catch (error) {
                        toast.error('Failed to update tone');
                      }
                    }}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all',
                      tone === t.toLowerCase()
                        ? 'gradient-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Length */}
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Message Length</label>
              <div className="flex gap-2">
                {lengths.map((l, i) => (
                  <button
                    key={l}
                    onClick={async () => {
                      setMessageLength(i);
                      const value = l.toLowerCase();
                      try {
                        await authApi.updateMe({ message_length: value });
                        toast.success('Message length set to ' + l);
                      } catch (error) {
                        toast.error('Failed to update length');
                      }
                    }}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all',
                      messageLength === i
                        ? 'gradient-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">Birthday Reminders</span>
                </div>
                <Switch checked={birthdayReminders} onCheckedChange={async (checked) => {
                  setBirthdayReminders(checked);
                  try {
                    await authApi.updateMe({ birthday_reminders: checked });
                    toast.success('Birthday reminders ' + (checked ? 'enabled' : 'disabled'));
                  } catch (error) {
                    setBirthdayReminders(!checked);
                    toast.error('Failed to update setting');
                  }
                }} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">Social Monitoring</span>
                </div>
                <Switch checked={socialMonitoring} onCheckedChange={async (checked) => {
                  setSocialMonitoring(checked);
                  try {
                    await authApi.updateMe({ social_monitoring: checked });
                    toast.success('Social monitoring ' + (checked ? 'enabled' : 'disabled'));
                  } catch (error) {
                    setSocialMonitoring(!checked);
                    toast.error('Failed to update setting');
                  }
                }} />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Notifications */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Notifications</h2>
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">Push Notifications</span>
              </div>
              <Switch checked={pushNotifications} onCheckedChange={async (checked) => {
                setPushNotifications(checked);
                try {
                  await authApi.updateMe({ push_notifications: checked });
                  toast.success('Push notifications ' + (checked ? 'enabled' : 'disabled'));
                } catch (error) {
                  setPushNotifications(!checked);
                  toast.error('Failed to update setting');
                }
              }} />
            </div>
          </div>
        </motion.section>

        {/* Account */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Account</h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Pro Plan</h3>
                  <p className="text-sm text-muted-foreground">Unlimited connections</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">Active</span>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full p-4 flex items-center gap-3 text-destructive border-t border-border hover:bg-destructive/5 transition-colors">
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Log Out</span>
            </button>
          </div>
        </motion.section>
        {/* Knowledge Base Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Knowledge Base</h2>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="flex items-center gap-1 text-primary text-sm font-medium disabled:opacity-50"
              >
                {uploadingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload
              </button>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
            {documents.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium text-foreground">No documents yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload PDFs or Docs to help AI understand your business
                </p>
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground truncate">{doc.original_filename}</h3>
                      {doc.status === 'PENDING' && (
                        <span className="text-[10px] bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-1.5 py-0.5 rounded-full font-medium">Queued</span>
                      )}
                      {doc.status === 'PROCESSING' && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">Processing</span>
                      )}
                      {doc.status === 'FAILED' && (
                        <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Failed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(doc.file_size / 1024).toFixed(0)} KB • {new Date(doc.created_at.endsWith('Z') ? doc.created_at : doc.created_at + 'Z').toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.section>
      </main>

      {/* Circle Form Modal */}
      <AnimatePresence>
        {showCircleForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-start justify-center p-4 pt-12 overflow-y-auto"
            onClick={() => setShowCircleForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl shadow-elevated w-full max-w-md overflow-hidden flex flex-col"
              style={{ maxHeight: 'calc(100vh - 100px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                <h2 className="font-semibold text-foreground">
                  {editingCircle ? 'Edit Circle' : 'Add Circle'}
                </h2>
                <button
                  onClick={() => setShowCircleForm(false)}
                  className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-4 space-y-5 overflow-y-auto flex-1">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Circle Name</label>
                  <input
                    type="text"
                    value={circleForm.name}
                    onChange={(e) => setCircleForm({ ...circleForm, name: e.target.value })}
                    placeholder="e.g., VIP Clients"
                    className="w-full h-12 px-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Channels Multi-select */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Channels <span className="text-destructive">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {channelOptions.map((channel) => {
                      const isSelected = circleForm.channels.includes(channel.id);
                      return (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => toggleChannel(channel.id)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all border',
                            isSelected
                              ? 'border-transparent text-white'
                              : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                          )}
                          style={isSelected ? { backgroundColor: channel.color } : {}}
                        >
                          {channel.icon}
                          {channel.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">AI will draft messages for selected channels</p>
                </div>

                {/* Contact Frequency - 2x2 Grid */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Contact Frequency</label>
                  <div className="grid grid-cols-2 gap-2">
                    {frequencyOptions.slice(0, 4).map((freq) => (
                      <button
                        key={freq}
                        onClick={() => setCircleForm({ ...circleForm, frequency: freq })}
                        className={cn(
                          'h-12 rounded-xl text-sm transition-all',
                          circleForm.frequency === freq
                            ? 'gradient-primary text-primary-foreground font-semibold'
                            : 'bg-muted/50 text-foreground hover:bg-muted font-medium'
                        )}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                  {/* Quarterly centered */}
                  <div className="flex justify-center mt-2">
                    <button
                      onClick={() => setCircleForm({ ...circleForm, frequency: 'Quarterly' })}
                      className={cn(
                        'h-12 px-8 rounded-xl text-sm transition-all',
                        circleForm.frequency === 'Quarterly'
                          ? 'gradient-primary text-primary-foreground font-semibold'
                          : 'bg-muted/50 text-foreground hover:bg-muted font-medium'
                      )}
                    >
                      Quarterly
                    </button>
                  </div>
                </div>

                {/* Member Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">
                      Members <span className="text-muted-foreground">({circleForm.contact_ids.length})</span>
                    </label>
                    <button
                      onClick={() => setShowNewContactForm(!showNewContactForm)}
                      className="text-xs text-primary font-medium flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> New Contact
                    </button>
                  </div>

                  {/* Inline New Contact Form */}
                  <AnimatePresence>
                    {showNewContactForm && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-muted/30 rounded-xl mb-3 border border-primary/20"
                      >
                        <div className="p-3 space-y-2">
                          <input
                            placeholder="Name"
                            value={newContactForm.name}
                            onChange={e => setNewContactForm(p => ({ ...p, name: e.target.value }))}
                            className="w-full h-9 px-3 rounded-lg text-sm bg-background border border-border"
                          />
                          <div className="flex gap-2">
                            <input
                              placeholder="Email (Optional)"
                              value={newContactForm.email}
                              onChange={e => setNewContactForm(p => ({ ...p, email: e.target.value }))}
                              className="flex-1 h-9 px-3 rounded-lg text-sm bg-background border border-border"
                            />
                            <input
                              placeholder="Phone (Optional)"
                              value={newContactForm.phone}
                              onChange={e => setNewContactForm(p => ({ ...p, phone: e.target.value }))}
                              className="flex-1 h-9 px-3 rounded-lg text-sm bg-background border border-border"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setShowNewContactForm(false)} className="text-xs px-2 py-1">Cancel</button>
                            <button onClick={handleCreateNewContact} className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded-lg">Add Contact</button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={contactSearchQuery}
                      onChange={(e) => setContactSearchQuery(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-border rounded-xl bg-card divide-y divide-border">
                    {filteredContacts.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">No contacts matching search.</div>
                    ) : (
                      filteredContacts.map(contact => (
                        <button
                          key={contact.id}
                          onClick={() => toggleContact(contact.id)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className={cn(
                            "h-5 w-5 rounded-md border flex items-center justify-center transition-colors",
                            circleForm.contact_ids.includes(contact.id) ? "bg-primary border-primary" : "border-muted-foreground/30"
                          )}>
                            {circleForm.contact_ids.includes(contact.id) && <Plus className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div className="text-sm font-medium text-foreground truncate">{contact.name}</div>
                              {contact.is_group && (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                                  <Users className="h-2.5 w-2.5" />
                                  Group
                                </span>
                              )}
                            </div>
                            {(contact.email || (contact.phone && !contact.is_group)) && (
                              <div className="text-xs text-muted-foreground truncate">
                                {contact.email || contact.phone}
                              </div>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Outreach Agenda <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={circleForm.outreach_agenda}
                    onChange={(e) => {
                      setCircleForm({ ...circleForm, outreach_agenda: e.target.value });
                      // Auto-resize
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 400) + 'px';
                    }}
                    placeholder="e.g., Discuss investment opportunities, share portfolio updates, schedule quarterly reviews"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none overflow-hidden"
                    style={{ minHeight: '80px', maxHeight: '400px' }}
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-muted-foreground">This will guide AI when generating drafts for contacts in this circle</p>
                    <span className="text-xs text-muted-foreground">{circleForm.outreach_agenda.length} characters</span>
                  </div>
                </div>

                {/* Assign Contacts Section - Removed as it's redundant with Members selection above */}

              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-border flex gap-3">
                {editingCircle && (
                  <button
                    onClick={handleDeleteCircle}
                    className="px-4 py-3 rounded-xl border border-destructive/30 text-destructive font-medium hover:bg-destructive/5 transition-colors"
                  >
                    Delete
                  </button>
                )}
                <div className="flex-1 flex gap-3">
                  <button
                    onClick={() => setShowCircleForm(false)}
                    className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCircle}
                    disabled={!circleForm.name || !circleForm.outreach_agenda || circleForm.channels.length === 0}
                    className="flex-1 py-3 rounded-xl gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-50 disabled:shadow-none hover:opacity-90 transition-all"
                  >
                    {editingCircle ? 'Save Changes' : 'Create Circle'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfileForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowProfileForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl shadow-elevated w-full max-w-md overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Edit Profile</h2>
                <button
                  onClick={() => setShowProfileForm(false)}
                  className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">First Name</label>
                    <input
                      type="text"
                      value={profileForm.first_name || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Last Name</label>
                    <input
                      type="text"
                      value={profileForm.last_name || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                  <input
                    type="email"
                    value={profileForm.email || ''}
                    disabled={true} // Usually email is read-only in profile unless there's a specific flow
                    className="w-full h-11 px-4 rounded-xl bg-muted/30 border border-border text-muted-foreground cursor-not-allowed"
                    title="Email cannot be changed"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Phone</label>
                  <input
                    type="tel"
                    value={profileForm.phone || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">LinkedIn URL</label>
                  <input
                    type="url"
                    value={profileForm.linkedin_url || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, linkedin_url: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Persona/Bio</label>
                  <textarea
                    value={profileForm.personal_profile || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, personal_profile: e.target.value })}
                    rows={4}
                    className="w-full p-4 rounded-xl bg-muted/50 border border-border text-foreground resize-none"
                    placeholder="Describe yourself to help AI match your tone..."
                  />
                </div>

                <div className="pt-2">
                  <Button onClick={handleSaveProfile} className="w-full gradient-primary text-primary-foreground h-12 rounded-xl">
                    Save Profile
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to log back in to access your data and conversations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={logout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
