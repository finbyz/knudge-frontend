import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { IntentType, Platform, Source } from '@/stores/sourcesStore';
import { IntentCard } from './IntentCard';
import { Button } from '@/components/ui/button';
import { PlatformIcon } from './PlatformIcon';
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

  // Reset state when modal opens with editing source
  useEffect(() => {
    if (editingSource) {
      setSelectedIntent(editingSource.intent);
    } else {
      setSelectedIntent(null);
    }
  }, [editingSource, isOpen]);

  const platform = editingSource?.platform || source?.platform;
  const name = editingSource?.name || source?.name;

  const handleSave = () => {
    if (!selectedIntent) return;

    onSave({
      intent: selectedIntent,
      options: editingSource?.options || {}, // Simplified revert for now, assuming options were not heavily used in basic version
    });
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
            style={{ maxHeight: '85vh' }}
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

              {/* Intent Cards */}
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

              <div className="h-4" />
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="flex-shrink-0 bg-card border-t border-border p-4 flex gap-3 rounded-b-2xl sm:rounded-b-2xl">
              <Button
                variant="ghost"
                onClick={onClose}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!selectedIntent}
                className="flex-1 gradient-primary text-primary-foreground border-0"
              >
                {editingSource ? 'Update' : 'Save & Follow'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
