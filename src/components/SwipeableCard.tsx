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

  // Stack effect calculations - cards behind are progressively smaller and offset down
  // This creates visible "edges" peeking from behind the top card
  const stackScale = 1 - (stackIndex * 0.04); // 1, 0.96, 0.92, 0.88
  const stackTranslateY = stackIndex * 16; // 0, 16, 32, 48px offset
  const stackZIndex = 40 - (stackIndex * 10); // 40, 30, 20, 10
  const stackOpacity = 1 - (stackIndex * 0.15); // 1, 0.85, 0.70, 0.55

  return (
    <motion.div
      className={cn(
        'absolute touch-none',
        !isTop && 'pointer-events-none'
      )}
      style={{ 
        x: isTop ? x : 0, 
        rotate: isTop ? rotate : 0, 
        opacity: isTop ? opacity : stackOpacity,
        zIndex: stackZIndex,
        top: 16,
        left: `${2 + stackIndex * 0.5}%`, // Progressive inset: 2%, 2.5%, 3%, 3.5%
        right: `${2 + stackIndex * 0.5}%`,
        height: 'calc(100% - 32px)',
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ 
        scale: stackScale, 
        y: stackTranslateY + 40, 
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
      transition={{ type: 'spring', stiffness: 350, damping: 30, duration: 0.4 }}
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

      {/* Card content with platform-specific background - stacked shadow effect */}
      <div className={cn(
        'h-full rounded-3xl border overflow-y-auto flex flex-col bg-card',
        stackIndex === 0 && 'shadow-2xl ring-1 ring-border/20',
        stackIndex === 1 && 'shadow-xl',
        stackIndex === 2 && 'shadow-lg',
        stackIndex >= 3 && 'shadow-md',
        platformStyles.borderClass,
        platformStyles.leftBorder
      )}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-border/50 bg-card/60 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Avatar
                initials={card.contact.avatar}
                size="lg"
                isVIP={card.contact.isVIP}
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground text-base sm:text-lg truncate">{card.contact.name}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {card.contact.title} {card.contact.company && `at ${card.contact.company}`}
                </p>
              </div>
            </div>
            <PlatformBadge platform={card.platform} size="lg" />
          </div>
        </div>

        {/* Context */}
        <div className="px-3 sm:px-4 py-2 bg-card/40 border-b border-border/50 flex-shrink-0">
          <p className="text-xs sm:text-sm text-muted-foreground">{card.context}</p>
        </div>

        {/* Message section */}
        <div className="p-3 sm:p-4 flex-shrink-0">
          {/* AI Draft header */}
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-gradient-to-r from-purple-500 to-primary flex items-center justify-center">
                <span className="text-white text-xs">✨</span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
                AI Draft
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>{card.createdAt}</span>
            </div>
          </div>

          {/* Draft text area - MUST be visible */}
          {isEditing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => setIsEditing(false)}
              className="w-full min-h-[100px] sm:min-h-[120px] p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/20 text-foreground text-sm sm:text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
          ) : (
            <div 
              onClick={() => setIsEditing(true)}
              className="min-h-[100px] sm:min-h-[120px] p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/20 hover:border-primary/40 cursor-text transition-colors"
            >
              <p className="text-foreground text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">{draft}</p>
            </div>
          )}
        </div>

        {/* Regenerate section - MUST BE VISIBLE */}
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex-shrink-0">
          {showRegenerateInput ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Add instructions for regeneration..."
                value={regenerateInstructions}
                onChange={(e) => setRegenerateInstructions(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-card/80 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRegenerateInput(false)}
                  className="flex-1 h-10"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleRegenerate}
                  className="flex-1 h-10 gradient-primary text-primary-foreground border-0"
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Regenerate
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRegenerateInput(true)}
              className="w-full h-10 sm:h-11 border-2 border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 text-primary"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Regenerate with Instructions
            </Button>
          )}
        </div>

        {/* Priority indicator */}
        <div className="px-3 sm:px-4 pb-2 flex-shrink-0">
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium',
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
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex-shrink-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
              </div>
              <span>Skip</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Send</span>
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-success/10 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
