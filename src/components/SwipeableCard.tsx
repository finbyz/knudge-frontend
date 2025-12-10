import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useState } from 'react';
import { Check, X, Calendar, RefreshCw } from 'lucide-react';
import { ActionCard } from '@/data/mockData';
import { Avatar } from './Avatar';
import { PlatformBadge, getPlatformCardStyles } from './PlatformBadge';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface SwipeableCardProps {
  card: ActionCard;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  isTop: boolean;
  stackIndex: number;
}

export function SwipeableCard({ card, onSwipeRight, onSwipeLeft, isTop, stackIndex }: SwipeableCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(card.draft);
  const [regenerateInstructions, setRegenerateInstructions] = useState('');
  const [showRegenerateInput, setShowRegenerateInput] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const leftIndicatorOpacity = useTransform(x, [-100, -40, 0], [1, 0.5, 0]);
  const rightIndicatorOpacity = useTransform(x, [0, 40, 100], [0, 0.5, 1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 80;
    if (info.offset.x > threshold) {
      onSwipeRight();
    } else if (info.offset.x < -threshold) {
      onSwipeLeft();
    }
  };

  const handleRegenerate = () => {
    const variations = [
      `Hi ${card.contact.name.split(' ')[0]}, just wanted to touch base! ${regenerateInstructions ? `(Based on: ${regenerateInstructions})` : ''} Looking forward to connecting soon.`,
      `Hey ${card.contact.name.split(' ')[0]}! Hope all is well with you. ${regenerateInstructions ? `Specifically regarding: ${regenerateInstructions}` : ''} Let's catch up when you have a moment.`,
      `${card.contact.name.split(' ')[0]}, thinking of you! ${regenerateInstructions ? `I wanted to ask about ${regenerateInstructions}.` : ''} Would be great to reconnect.`,
    ];
    setDraft(variations[Math.floor(Math.random() * variations.length)]);
    setShowRegenerateInput(false);
    setRegenerateInstructions('');
  };

  const platformStyles = getPlatformCardStyles(card.platform);

  // Stack effect calculations - cards behind are smaller and lower
  const stackScale = 1 - (stackIndex * 0.04);
  const stackTranslateY = stackIndex * 16;
  const stackOpacity = stackIndex === 0 ? 1 : Math.max(0.4, 1 - (stackIndex * 0.25));
  const stackZIndex = 40 - (stackIndex * 10);

  return (
    <motion.div
      className={cn(
        'absolute left-4 right-4 touch-none',
        !isTop && 'pointer-events-none'
      )}
      style={{ 
        x: isTop ? x : 0, 
        rotate: isTop ? rotate : 0, 
        opacity: isTop ? opacity : stackOpacity,
        zIndex: stackZIndex,
        top: 8,
        height: 'calc(100% - 16px)',
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ 
        scale: stackScale, 
        y: stackTranslateY + 30, 
        opacity: 0 
      }}
      animate={{ 
        scale: stackScale, 
        y: stackTranslateY,
        opacity: stackOpacity,
      }}
      exit={{ 
        x: x.get() > 0 ? 400 : -400,
        opacity: 0,
        transition: { duration: 0.3, type: 'spring', stiffness: 100 }
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, duration: 0.3 }}
    >
      {/* Swipe indicators - only on top card */}
      {isTop && (
        <>
          <motion.div
            className="absolute inset-0 rounded-3xl gradient-danger flex items-center justify-center z-10 pointer-events-none"
            style={{ opacity: leftIndicatorOpacity }}
          >
            <div className="bg-card/90 rounded-full p-4">
              <X className="h-8 w-8 text-destructive" />
            </div>
          </motion.div>

          <motion.div
            className="absolute inset-0 rounded-3xl gradient-success flex items-center justify-center z-10 pointer-events-none"
            style={{ opacity: rightIndicatorOpacity }}
          >
            <div className="bg-card/90 rounded-full p-4">
              <Check className="h-8 w-8 text-success" />
            </div>
          </motion.div>
        </>
      )}

      {/* Card content with platform-specific background */}
      <div className={cn(
        'h-full rounded-3xl shadow-xl border overflow-hidden flex flex-col',
        stackIndex === 0 && 'shadow-2xl',
        stackIndex === 1 && 'shadow-lg',
        stackIndex === 2 && 'shadow-md',
        platformStyles.cardBg,
        platformStyles.borderClass,
        platformStyles.leftBorder
      )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/50 bg-card/60 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                initials={card.contact.avatar}
                size="lg"
                isVIP={card.contact.isVIP}
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground text-lg truncate">{card.contact.name}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {card.contact.title} {card.contact.company && `at ${card.contact.company}`}
                </p>
              </div>
            </div>
            <PlatformBadge platform={card.platform} size="lg" />
          </div>
        </div>

        {/* Context */}
        <div className="px-4 py-2 bg-card/40 border-b border-border/50 flex-shrink-0">
          <p className="text-sm text-muted-foreground">{card.context}</p>
        </div>

        {/* Message - Clickable to edit with scroll */}
        <div className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              AI Draft
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{card.createdAt}</span>
            </div>
          </div>

          {/* Scrollable draft container */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isEditing ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => setIsEditing(false)}
                className="w-full h-full p-3 rounded-xl bg-card/80 border border-border text-foreground text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
            ) : (
              <div 
                onClick={() => setIsEditing(true)}
                className="p-3 rounded-xl bg-card/50 border border-transparent hover:border-border/50 cursor-text transition-colors"
              >
                <p className="text-foreground text-base leading-relaxed">{draft}</p>
              </div>
            )}
          </div>

          {/* Regenerate section */}
          <div className="mt-3 space-y-2 flex-shrink-0">
            {showRegenerateInput && (
              <input
                type="text"
                placeholder="Add instructions for regeneration..."
                value={regenerateInstructions}
                onChange={(e) => setRegenerateInstructions(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-card/80 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            )}
            <div className="flex gap-2">
              {showRegenerateInput ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRegenerateInput(false)}
                    className="flex-1 h-11"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleRegenerate}
                    className="flex-1 h-11 gradient-primary text-primary-foreground border-0"
                  >
                    <RefreshCw className="h-4 w-4 mr-1.5" />
                    Regenerate
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRegenerateInput(true)}
                  className="w-full h-11"
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Regenerate with Instructions
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Priority indicator */}
        <div className="px-4 pb-2 flex-shrink-0">
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
              card.priority === 'high' && 'bg-destructive/10 text-destructive',
              card.priority === 'medium' && 'bg-warning/10 text-warning',
              card.priority === 'low' && 'bg-success/10 text-success'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                card.priority === 'high' && 'bg-destructive',
                card.priority === 'medium' && 'bg-warning',
                card.priority === 'low' && 'bg-success'
              )}
            />
            {card.priority.charAt(0).toUpperCase() + card.priority.slice(1)} Priority
          </div>
        </div>

        {/* Swipe hint */}
        <div className="px-4 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="h-4 w-4 text-destructive" />
              </div>
              <span>Skip</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Send</span>
              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                <Check className="h-4 w-4 text-success" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
