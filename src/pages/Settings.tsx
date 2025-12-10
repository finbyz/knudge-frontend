import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, Sparkles, Bell, Crown, LogOut, ChevronRight, Plus, Edit2, X, Phone, Mail, Linkedin as LinkedinIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Circle {
  name: string;
  frequency: string;
  contacts: number;
  outreachAgenda: string;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  personalProfile: string;
}

const initialCircles: Circle[] = [
  { name: 'VIP Investors', frequency: 'Every 2 weeks', contacts: 12, outreachAgenda: 'Discuss investment opportunities and share portfolio updates' },
  { name: 'Team', frequency: 'Weekly', contacts: 8, outreachAgenda: 'Weekly sync, project updates, and team coordination' },
  { name: 'Friends', frequency: 'Monthly', contacts: 24, outreachAgenda: 'Catch up, share life updates, plan meetups' },
];

const frequencyOptions = ['Daily', 'Weekly', 'Every 2 weeks', 'Monthly', 'Quarterly'];

export default function Settings() {
  const [tone, setTone] = useState('professional');
  const [messageLength, setMessageLength] = useState(1);
  const [birthdayReminders, setBirthdayReminders] = useState(true);
  const [socialMonitoring, setSocialMonitoring] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  
  const [circles, setCircles] = useState<Circle[]>(initialCircles);
  const [showCircleForm, setShowCircleForm] = useState(false);
  const [editingCircle, setEditingCircle] = useState<Circle | null>(null);
  const [circleForm, setCircleForm] = useState({ name: '', frequency: 'Weekly', contacts: 0, outreachAgenda: '' });
  
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex@knudge.io',
    phone: '+1 (555) 123-4567',
    linkedinUrl: 'linkedin.com/in/alexjohnson',
    personalProfile: 'Entrepreneur, AI enthusiast, investor in SaaS startups',
  });
  const [profileForm, setProfileForm] = useState<UserProfile>(userProfile);

  const tones = ['Casual', 'Professional', 'Friendly'];
  const lengths = ['Short', 'Medium', 'Long'];

  const handleAddCircle = () => {
    setEditingCircle(null);
    setCircleForm({ name: '', frequency: 'Weekly', contacts: 0, outreachAgenda: '' });
    setShowCircleForm(true);
  };

  const handleEditCircle = (circle: Circle) => {
    setEditingCircle(circle);
    setCircleForm(circle);
    setShowCircleForm(true);
  };

  const handleSaveCircle = () => {
    if (!circleForm.name || !circleForm.outreachAgenda) return;
    
    if (editingCircle) {
      setCircles((prev) => 
        prev.map((c) => c.name === editingCircle.name ? circleForm : c)
      );
    } else {
      setCircles((prev) => [...prev, circleForm]);
    }
    setShowCircleForm(false);
    setEditingCircle(null);
  };

  const handleDeleteCircle = () => {
    if (editingCircle) {
      setCircles((prev) => prev.filter((c) => c.name !== editingCircle.name));
    }
    setShowCircleForm(false);
    setEditingCircle(null);
  };

  const handleEditProfile = () => {
    setProfileForm(userProfile);
    setShowProfileForm(true);
  };

  const handleSaveProfile = () => {
    setUserProfile(profileForm);
    setShowProfileForm(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-center px-4 h-16">
          <span className="font-semibold text-foreground">Settings</span>
        </div>
      </header>

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
                <h3 className="font-semibold text-foreground">{userProfile.firstName} {userProfile.lastName}</h3>
                <p className="text-sm text-muted-foreground">{userProfile.email}</p>
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
              <p className="text-sm text-foreground mt-1">{userProfile.personalProfile}</p>
            </div>
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
                key={circle.name} 
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
                    onClick={() => setTone(t.toLowerCase())}
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
                    onClick={() => setMessageLength(i)}
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
                <Switch checked={birthdayReminders} onCheckedChange={setBirthdayReminders} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">Social Monitoring</span>
                </div>
                <Switch checked={socialMonitoring} onCheckedChange={setSocialMonitoring} />
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
              <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
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
            <button className="w-full p-4 flex items-center gap-3 text-destructive border-t border-border hover:bg-destructive/5 transition-colors">
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

              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Circle Name</label>
                  <input
                    type="text"
                    value={circleForm.name}
                    onChange={(e) => setCircleForm({ ...circleForm, name: e.target.value })}
                    placeholder="e.g., VIP Clients"
                    className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Contact Frequency</label>
                  <div className="grid grid-cols-2 gap-2">
                    {frequencyOptions.map((freq) => (
                      <button
                        key={freq}
                        onClick={() => setCircleForm({ ...circleForm, frequency: freq })}
                        className={cn(
                          'py-2.5 rounded-xl text-sm font-medium transition-all',
                          circleForm.frequency === freq
                            ? 'gradient-primary text-primary-foreground'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Outreach Agenda <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={circleForm.outreachAgenda}
                    onChange={(e) => setCircleForm({ ...circleForm, outreachAgenda: e.target.value })}
                    placeholder="e.g., Discuss investment opportunities, share product updates"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">This will guide AI when generating drafts for contacts in this circle</p>
                </div>
              </div>

              {/* Sticky buttons at bottom */}
              <div className="p-4 border-t border-border bg-card flex-shrink-0">
                <div className="flex gap-3">
                  {editingCircle && (
                    <Button
                      variant="outline"
                      onClick={handleDeleteCircle}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      Delete
                    </Button>
                  )}
                  <Button
                    onClick={handleSaveCircle}
                    className="flex-1 gradient-primary text-primary-foreground border-0"
                  >
                    {editingCircle ? 'Save Changes' : 'Add Circle'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Edit Modal */}
      <AnimatePresence>
        {showProfileForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-start justify-center p-4 pt-8 overflow-y-auto"
            onClick={() => setShowProfileForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl shadow-elevated w-full max-w-md overflow-hidden mb-8"
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">First Name</label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Last Name</label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    <Phone className="h-4 w-4 inline mr-2" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    <LinkedinIcon className="h-4 w-4 inline mr-2" />
                    LinkedIn Profile URL
                  </label>
                  <input
                    type="url"
                    value={profileForm.linkedinUrl}
                    onChange={(e) => setProfileForm({ ...profileForm, linkedinUrl: e.target.value })}
                    placeholder="linkedin.com/in/yourprofile"
                    className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Personal Profile</label>
                  <textarea
                    value={profileForm.personalProfile}
                    onChange={(e) => setProfileForm({ ...profileForm, personalProfile: e.target.value })}
                    placeholder="Describe yourself, your interests, and what you do..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowProfileForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    className="flex-1 gradient-primary text-primary-foreground border-0"
                  >
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