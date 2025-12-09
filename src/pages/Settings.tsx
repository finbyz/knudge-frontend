import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Users, Sparkles, Bell, Crown, LogOut, ChevronRight, Plus, Edit2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const circles = [
  { name: 'VIP Investors', frequency: 'Every 2 weeks', contacts: 12 },
  { name: 'Team', frequency: 'Weekly', contacts: 8 },
  { name: 'Friends', frequency: 'Monthly', contacts: 24 },
];

export default function Settings() {
  const [tone, setTone] = useState('professional');
  const [messageLength, setMessageLength] = useState(1);
  const [birthdayReminders, setBirthdayReminders] = useState(true);
  const [socialMonitoring, setSocialMonitoring] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  const tones = ['Casual', 'Professional', 'Friendly'];
  const lengths = ['Short', 'Medium', 'Long'];

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
                <h3 className="font-semibold text-foreground">Alex Johnson</h3>
                <p className="text-sm text-muted-foreground">alex@knudge.io</p>
              </div>
              <button className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center">
                <Edit2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="border-t border-border p-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Persona Profile</label>
              <p className="text-sm text-foreground mt-1">Entrepreneur, AI enthusiast, investor in SaaS startups</p>
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
            <button className="flex items-center gap-1 text-primary text-sm font-medium">
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
          <div className="bg-card rounded-2xl border border-border divide-y divide-border">
            {circles.map((circle) => (
              <button key={circle.name} className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors">
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
    </div>
  );
}
