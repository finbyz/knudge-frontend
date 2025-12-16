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
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-card shadow-xl rounded-t-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg sm:w-full sm:rounded-2xl"
            style={{ 
              maxHeight: '85vh',
              height: 'auto',
              minHeight: '50vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed */}
            <div className="flex-shrink-0 flex items-center justify-between border-b border-border bg-card px-5 py-4 rounded-t-2xl">
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

            {/* Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 bg-muted/30">
              <p className="text-muted-foreground mb-5">
                How should our AI interact with this source?
              </p>

              {/* Intent Cards - All 4 displayed */}
              <div className="space-y-3 mb-6">
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
                  
                  <div className="flex items-center justify-between py-3 bg-card rounded-lg px-4">
                    <div>
                      <span className="text-foreground font-medium">⚡ Notify on Shorts</span>
                      <p className="text-sm text-muted-foreground">Get alerts for short-form content</p>
                    </div>
                    <Switch
                      checked={notifyOnShorts}
                      onCheckedChange={setNotifyOnShorts}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-3 bg-card rounded-lg px-4">
                    <div>
                      <span className="text-foreground font-medium">📝 Summarize Long Videos</span>
                      <p className="text-sm text-muted-foreground">AI creates text summary of 10+ min videos</p>
                    </div>
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
                  <h4 className="font-semibold text-foreground">Join Group</h4>
                  
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
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      ℹ️ We'll join this group to monitor messages
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
                      <p className="font-medium text-warning">⚠️ Public Posts Only</p>
                      <p className="text-sm text-warning/80 mt-1">
                        You're not connected with this profile. Only public posts will be monitored.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Bottom padding to ensure content isn't hidden behind footer */}
              <div className="h-4" />
            </div>

            {/* Footer - Fixed at bottom with safe area padding */}
            <div className="flex-shrink-0 bg-card border-t border-border p-4 pb-6 flex gap-3 rounded-b-2xl sm:rounded-b-2xl safe-area-bottom">
              <Button
                variant="ghost"
                onClick={onClose}
                className="flex-1 sm:flex-none h-12 text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!selectedIntent || isSaving}
                className={cn(
                  "flex-1 h-12 text-base font-semibold border-0 transition-all",
                  selectedIntent 
                    ? "gradient-primary text-primary-foreground shadow-lg" 
                    : "bg-muted text-muted-foreground"
                )}
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
