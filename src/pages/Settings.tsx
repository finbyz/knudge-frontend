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

type ChannelType = 'whatsapp' | 'linkedin' | 'email' | 'outlook';

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
  { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', icon: <LinkedinIcon className="h-4 w-4" /> },
  { id: 'email', label: 'Email', color: '#6B7280', icon: <Mail className="h-4 w-4" /> },
  { id: 'outlook', label: 'Outlook', color: '#0078D4', icon: <Mail className="h-4 w-4" /> },
];

const frequencyOptions = ['Daily', 'Weekly', 'Every 2 weeks', 'Monthly', 'Quarterly'];

export default function Settings() {
  const { logout, setUser } = useAuthStore();
  const [tone, setTone] = useState('professional');
  const [messageLength, setMessageLength] = useState(1);
  const [birthdayReminders, setBirthdayReminders] = useState(true);
  const [socialMonitoring, setSocialMonitoring] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

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
  const [profileForm, setProfileForm] = useState<UserResponse>({
    id: '', username: '', email: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userData, circlesData, contactsData] = await Promise.all([
        authApi.getMe(),
        contactsApi.getCircles(),
        contactsApi.getContacts()
      ]);
      setUserProfile(userData);
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
      if (contact.phone) matchesChannel = true;
    }
    if (!matchesChannel && (selectedChannels.includes('email') || selectedChannels.includes('outlook'))) {
      if (contact.email) matchesChannel = true;
    }
    if (!matchesChannel && selectedChannels.includes('linkedin')) {
      if (contact.linkedin_url) matchesChannel = true;
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
    if (userProfile) {
      setProfileForm(userProfile);
      setShowProfileForm(true);
    }
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

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <TopBar title="Settings" />

      <main className="px-4 py-6 space-y-6">
        {/* Profile Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Profile</h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 flex items-center gap-4">
              <div className="h-14 w-14 rounded-full gradient-primary flex items-center justify-center">
                <User className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}` : 'User'}
                </h3>
                <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
              </div>
              <button
                onClick={handleEditProfile}
                className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Edit2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="border-t border-border p-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Persona Profile</label>
              <p className="text-sm text-foreground mt-1">{userProfile?.personal_profile || 'No profile description yet.'}</p>
            </div>
          </div>
        </motion.section>

        {/* Profile Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <User className="h-6 w-6" />
              Profile
            </h2>
            <button
              onClick={handleEditProfile}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 hover:opacity-90 transition"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
          </div>

          {/* Profile Display */}
          {userProfile && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-muted-foreground font-medium">First Name</label>
                <p className="font-semibold text-foreground mt-1">{userProfile.first_name || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground font-medium">Last Name</label>
                <p className="font-semibold text-foreground mt-1">{userProfile.last_name || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground font-medium">Phone</label>
                <p className="font-semibold text-foreground mt-1">{userProfile.phone || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground font-medium">LinkedIn</label>
                <p className="font-semibold text-blue-500 cursor-pointer mt-1">
                  {userProfile.linkedin_url ? (
                    <a href={userProfile.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      View Profile →
                    </a>
                  ) : (
                    '-'
                  )}
                </p>
              </div>
              {userProfile.personal_profile && (
                <div className="col-span-1 md:col-span-2">
                  <label className="text-sm text-muted-foreground font-medium">Personal Profile</label>
                  <p className="font-semibold text-foreground mt-1 text-sm">{userProfile.personal_profile}</p>
                </div>
              )}
            </div>
          )}
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
              onClick={logout}
              className="w-full p-4 flex items-center gap-3 text-destructive border-t border-border hover:bg-destructive/5 transition-colors">
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Log Out</span>
            </button>
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
                          <div className="text-left">
                            <div className="text-sm font-medium text-foreground">{contact.name}</div>
                            {(contact.email || contact.phone) && <div className="text-xs text-muted-foreground">{contact.email || contact.phone}</div>}
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
        {showProfileForm && userProfile && (
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
    </div>
  );
}
