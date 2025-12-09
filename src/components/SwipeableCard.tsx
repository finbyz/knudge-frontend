import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useState } from 'react';
import { Edit3, Check, X } from 'lucide-react';
import { ActionCard } from '@/data/mockData';
import { Avatar } from './Avatar';
import { PlatformBadge } from './PlatformBadge';
import { cn } from '@/lib/utils';

interface SwipeableCardProps {
  card: ActionCard;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  isTop: boolean;
}

export function SwipeableCard({ card, onSwipeRight, onSwipeLeft, isTop }: SwipeableCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(card.draft);

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

  return (
    <motion.div
      className={cn(
        'absolute inset-x-4 top-0 touch-none',
        !isTop && 'pointer-events-none'
      )}
      style={{ x, rotate, opacity }}
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

      {/* Card content */}
      <div className="bg-card rounded-3xl shadow-elevated border border-border overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border">
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
        <div className="px-5 py-3 bg-muted/30 border-b border-border">
          <p className="text-sm text-muted-foreground">{card.context}</p>
        </div>

        {/* Message */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              AI Draft
            </span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
              {isEditing ? 'Save' : 'Edit'}
            </button>
          </div>

          {isEditing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full min-h-[120px] p-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          ) : (
            <p className="text-foreground text-sm leading-relaxed">{draft}</p>
          )}
        </div>

        {/* Priority indicator */}
        <div className="px-5 pb-5">
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
        <div className="px-5 pb-5">
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
