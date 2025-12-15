import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { IntentType, Platform, Source } from '@/stores/sourcesStore';
import { IntentCard } from './IntentCard';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlatformIcon, getPlatformName } from './PlatformIcon';
import { cn } from '@/lib/utils';

interface IntentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: {
    intent: IntentType;
    options: {
      notifyOnShorts?: boolean;
      summarizeLongVideos?: boolean;
      inviteLink?: string;
    };
  }) => void;
  source: {
    name: string;
    platform: Platform;
    avatarUrl?: string;
    bio?: string;
    url: string;
  } | null;
  editingSource?: Source | null;
}

export function IntentConfigModal({ isOpen, onClose, onSave, source, editingSource }: IntentConfigModalProps) {
  const [selectedIntent, setSelectedIntent] = useState<IntentType | null>(null);
  const [notifyOnShorts, setNotifyOnShorts] = useState(false);
  const [summarizeLongVideos, setSummarizeLongVideos] = useState(true);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLinkError, setInviteLinkError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when modal opens with editing source
  useEffect(() => {
    if (editingSource) {
      setSelectedIntent(editingSource.intent);
      setNotifyOnShorts(editingSource.options.notifyOnShorts || false);
      setSummarizeLongVideos(editingSource.options.summarizeLongVideos !== false);
      setInviteLink(editingSource.options.inviteLink || '');
    } else {
      setSelectedIntent(null);
      setNotifyOnShorts(false);
      setSummarizeLongVideos(true);
      setInviteLink('');
    }
    setInviteLinkError('');
  }, [editingSource, isOpen]);

  const platform = editingSource?.platform || source?.platform;
  const name = editingSource?.name || source?.name;
  const isYouTube = platform === 'youtube';
  const isMessaging = platform === 'whatsapp' || platform === 'telegram';
  const isLinkedIn = platform === 'linkedin';

  const validateInviteLink = (link: string) => {
    if (!link) return true;
    if (platform === 'whatsapp' && !link.includes('chat.whatsapp.com')) {
      setInviteLinkError('Invalid WhatsApp invite link');
      return false;
    }
    if (platform === 'telegram' && !link.includes('t.me')) {
      setInviteLinkError('Invalid Telegram invite link');
      return false;
    }
    setInviteLinkError('');
    return true;
  };

  const handleSave = async () => {
    if (!selectedIntent) return;
    
    if (isMessaging && inviteLink && !validateInviteLink(inviteLink)) {
      return;
    }

    setIsSaving(true);
    
    // Simulate save delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    onSave({
      intent: selectedIntent,
      options: {
        notifyOnShorts: isYouTube ? notifyOnShorts : undefined,
        summarizeLongVideos: isYouTube ? summarizeLongVideos : undefined,
        inviteLink: isMessaging ? inviteLink : undefined,
      },
    });
    
    setIsSaving(false);
  };

  const intents: IntentType[] = ['competitor', 'lead', 'influencer', 'news'];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-hidden rounded-t-2xl bg-card shadow-xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg sm:rounded-2xl sm:max-h-[80vh]"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
              <div className="flex items-center gap-3">
                {platform && <PlatformIcon platform={platform} size="md" />}
                <div>
                  <p className="text-sm text-muted-foreground">
                    {editingSource ? 'Edit AI Strategy for' : 'Configure AI Strategy for'}
                  </p>
                  <h3 className="font-semibold text-lg text-foreground">{name}</h3>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-5 pb-24 bg-muted/30">
              <p className="text-muted-foreground mb-5">
                How should our AI interact with this source?
              </p>

              {/* Intent Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {intents.map((intent) => (
                  <IntentCard
                    key={intent}
                    intent={intent}
                    isSelected={selectedIntent === intent}
                    onSelect={() => setSelectedIntent(intent)}
                  />
                ))}
              </div>

              {/* YouTube Options */}
              {isYouTube && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="font-semibold text-foreground">YouTube Options</h4>
                  
                  <div className="flex items-center justify-between py-3">
                    <span className="text-foreground">Notify on Shorts?</span>
                    <Switch
                      checked={notifyOnShorts}
                      onCheckedChange={setNotifyOnShorts}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <span className="text-foreground">Summarize Long Videos?</span>
                    <Switch
                      checked={summarizeLongVideos}
                      onCheckedChange={setSummarizeLongVideos}
                    />
                  </div>
                </div>
              )}

              {/* WhatsApp/Telegram Options */}
              {isMessaging && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="font-semibold text-foreground">Group Access</h4>
                  
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Paste Group Invite Link
                    </label>
                    <Input
                      value={inviteLink}
                      onChange={(e) => {
                        setInviteLink(e.target.value);
                        setInviteLinkError('');
                      }}
                      placeholder={platform === 'whatsapp' 
                        ? 'https://chat.whatsapp.com/...' 
                        : 'https://t.me/...'}
                      className={cn(inviteLinkError && 'border-destructive')}
                    />
                    {inviteLinkError && (
                      <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                        <X className="h-4 w-4" />
                        {inviteLinkError}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      We'll join this group to monitor conversations
                    </p>
                  </div>
                </div>
              )}

              {/* LinkedIn Warning */}
              {isLinkedIn && (
                <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/30">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
                    <div>
                      <p className="font-medium text-warning">Public Posts Only</p>
                      <p className="text-sm text-warning/80 mt-1">
                        You're not connected. Only public posts will be monitored.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 flex gap-3 sm:static">
              <Button
                variant="ghost"
                onClick={onClose}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!selectedIntent || isSaving}
                className="flex-1 gradient-primary text-primary-foreground border-0"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingSource ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingSource ? 'Update' : 'Save & Follow'
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
