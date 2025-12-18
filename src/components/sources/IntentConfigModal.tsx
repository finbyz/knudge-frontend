import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare } from 'lucide-react';
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
      options: editingSource?.options || {}, // Simplified revert for now
    });
  };

  const intents: IntentType[] = ['competitor', 'lead', 'influencer', 'news'];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Content - RESPONSIVE HEIGHT & WIDTH */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
            className={cn(
              "relative z-10 w-full flex flex-col",
              "bg-card rounded-2xl shadow-2xl",
              // Widths
              "max-w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl",
              // Heights - CRITICAL FIX
              "max-h-[90vh] min-h-[400px]",
              "overflow-hidden"
            )}
          >
            {/* Header - Fixed at top */}
            <div className="flex-shrink-0 flex items-start justify-between p-4 sm:p-6 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm text-muted-foreground">
                    {editingSource ? 'Edit AI Strategy for' : 'Configure AI Strategy for'}
                  </h3>
                  <div className="flex items-center gap-2">
                    {platform && <PlatformIcon platform={platform} size="sm" />}
                    <h2 className="text-base sm:text-xl font-semibold text-foreground truncate max-w-[150px] sm:max-w-xs">{name}</h2>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 bg-muted/5 pb-4">
              <p className="text-muted-foreground text-sm">
                How should our AI interact with this source?
              </p>

              {/* Intent Cards */}
              <div className="space-y-3">
                {intents.map((intent) => (
                  <IntentCard
                    key={intent}
                    intent={intent}
                    isSelected={selectedIntent === intent}
                    onSelect={() => setSelectedIntent(intent)}
                  />
                ))}
              </div>
            </div>

            {/* Footer - Fixed at bottom (Sticky) */}
            <div
              className={cn(
                "flex-shrink-0 sticky bottom-0 z-10",
                "flex items-center justify-end gap-3",
                "p-4 sm:p-6",
                "border-t border-border bg-card"
              )}
              style={{
                paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
              }}
            >
              <Button
                variant="ghost"
                onClick={onClose}
                className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base h-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!selectedIntent}
                className={cn(
                  "px-4 sm:px-6 py-2 sm:py-2.5 h-auto text-sm sm:text-base transition-all",
                  selectedIntent ? "gradient-primary text-primary-foreground" : "opacity-50 cursor-not-allowed"
                )}
              >
                {editingSource ? 'Update Strategy' : 'Save Strategy'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
