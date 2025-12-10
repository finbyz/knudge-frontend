import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useState } from 'react';
import { Check, X, Calendar, RefreshCw, Send } from 'lucide-react';
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
}

export function SwipeableCard({ card, onSwipeRight, onSwipeLeft, isTop }: SwipeableCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(card.draft);
  const [regenerateInstructions, setRegenerateInstructions] = useState('');
  const [showRegenerateInput, setShowRegenerateInput] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const leftIndicatorOpacity = useTransform(x, [-150, -50, 0], [1, 0.5, 0]);
  const rightIndicatorOpacity = useTransform(x, [0, 50, 150], [0, 0.5, 1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      onSwipeRight();
    } else if (info.offset.x < -threshold) {
      onSwipeLeft();
    }
  };

  const handleRegenerate = () => {
    // Simulate AI regeneration
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

  return (
    <motion.div
      className={cn(
        'absolute inset-x-4 touch-none',
        !isTop && 'pointer-events-none'
      )}
      style={{ 
        x, 
        rotate, 
        opacity, 
        zIndex: isTop ? 10 : 1,
        top: 0,
        height: 'calc(100vh - 220px)',
        marginBottom: '20px'
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 20 }}
      animate={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Swipe indicators */}
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

      {/* Card content with platform-specific background */}
      <div className={cn(
        'rounded-3xl shadow-elevated border overflow-hidden h-full flex flex-col',
        platformStyles.cardBg,
        platformStyles.borderClass
      )}>
        {/* Header */}
        <div className="p-5 border-b border-border/50 bg-card/60 backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                initials={card.contact.avatar}
                size="lg"
                isVIP={card.contact.isVIP}
              />
              <div>
                <h3 className="font-semibold text-foreground">{card.contact.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {card.contact.title} {card.contact.company && `at ${card.contact.company}`}
                </p>
              </div>
            </div>
            <PlatformBadge platform={card.platform} size="lg" />
          </div>
        </div>

        {/* Context */}
        <div className="px-5 py-3 bg-card/40 border-b border-border/50">
          <p className="text-sm text-muted-foreground">{card.context}</p>
        </div>

        {/* Message - Clickable to edit with scroll */}
        <div className="p-5 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              AI Draft
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{card.createdAt}</span>
            </div>
          </div>

          {/* Scrollable draft container */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {isEditing ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => setIsEditing(false)}
                className="w-full h-full p-3 rounded-xl bg-card/80 border border-border text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 overflow-y-auto"
                style={{ maxHeight: '180px', minHeight: '120px' }}
                autoFocus
              />
            ) : (
              <div 
                onClick={() => setIsEditing(true)}
                className="h-full p-3 rounded-xl bg-card/50 border border-transparent hover:border-border/50 cursor-text transition-colors overflow-y-auto"
                style={{ maxHeight: '180px', minHeight: '120px' }}
              >
                <p className="text-foreground text-sm leading-relaxed">{draft}</p>
              </div>
            )}
          </div>

          {/* Regenerate section - fixed at bottom */}
          <div className="mt-3 space-y-2 flex-shrink-0">
            {showRegenerateInput && (
              <input
                type="text"
                placeholder="Add instructions for regeneration (optional)..."
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
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleRegenerate}
                    className="flex-1 gradient-primary text-primary-foreground border-0"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Regenerate
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRegenerateInput(true)}
                  className="w-full"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Regenerate with Instructions
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Priority indicator */}
        <div className="px-5 pb-3">
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

        {/* Swipe hint - always visible */}
        <div className="px-5 pb-5 flex-shrink-0 bg-gradient-to-t from-card/80 to-transparent pt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="h-3.5 w-3.5 text-destructive" />
              </div>
              <span>Swipe left to skip</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Swipe right to send</span>
              <div className="h-6 w-6 rounded-full bg-success/10 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-success" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}