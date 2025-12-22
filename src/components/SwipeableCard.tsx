import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Check, X, Calendar, RefreshCw } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { ActionCard } from '@/types';
import { deckApi } from '@/api/deck';
import { Avatar } from './Avatar';
import { PlatformBadge, getPlatformCardStyles } from './PlatformBadge';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface SwipeableCardProps {
  card: ActionCard;
  onSwipeRight: (data?: { draft: string; subject?: string } | string) => void;
  onSwipeLeft: () => void;
  isTop: boolean;
  stackIndex: number;
}

export function SwipeableCard({ card, onSwipeRight, onSwipeLeft, isTop, stackIndex }: SwipeableCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(card.draft);
  const [subject, setSubject] = useState(card.subject || '');
  const [regenerateInstructions, setRegenerateInstructions] = useState('');
  const [showRegenerateInput, setShowRegenerateInput] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);

  // Use refs to prevent double-firing and track swipe state
  const hasSwipedRef = useRef(false);
  const swipeDirectionRef = useRef<'left' | 'right' | null>(null);
  const cardIdRef = useRef(card.id);
  // Add a mount counter to force handler recreation
  const mountCountRef = useRef(0);

  const x = useMotionValue(0);

  // Critical: Reset ALL state when card.id changes (fixes Brave mobile bug)
  useEffect(() => {
    // Increment mount counter to force handler recreation
    mountCountRef.current += 1;

    // Force reset when card changes
    if (cardIdRef.current !== card.id) {
      cardIdRef.current = card.id;
    }

    // Reset all swipe state
    hasSwipedRef.current = false;
    swipeDirectionRef.current = null;
    setIsSwiping(false);
    setDraft(card.draft);
    setSubject(card.subject || '');
    setIsEditing(false);
    setShowRegenerateInput(false);
    setRegenerateInstructions('');

    // Use double requestAnimationFrame for Brave mobile to ensure reset is processed
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        x.set(0);
      });
    });

    // Debug log for Brave mobile
    if (process.env.NODE_ENV === 'development') {
      console.log(`Card mounted: ${card.id}, isTop: ${isTop}, mount: ${mountCountRef.current}`);
    }
  }, [card.id, card.draft, isTop, x]);

  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const leftIndicatorOpacity = useTransform(x, [-100, -40, 0], [1, 0.5, 0]);
  const rightIndicatorOpacity = useTransform(x, [0, 40, 100], [0, 0.5, 1]);

  const SWIPE_THRESHOLD = 80;

  // Handle swipe completion - only fires ONCE per card
  const handleSwipeComplete = useCallback((direction: 'left' | 'right') => {
    if (hasSwipedRef.current) {
      console.log('Swipe already processed, ignoring');
      return;
    }
    hasSwipedRef.current = true;
    swipeDirectionRef.current = direction;

    // Use requestAnimationFrame to ensure browser processes the swipe before callback
    requestAnimationFrame(() => {
      if (direction === 'right') {
        onSwipeRight({ draft, subject });
      } else {
        onSwipeLeft();
      }
    });
  }, [onSwipeRight, onSwipeLeft, draft]);

  // Reset card state
  const resetCardState = useCallback(() => {
    setIsSwiping(false);
    swipeDirectionRef.current = null;
    requestAnimationFrame(() => {
      x.set(0);
    });
  }, [x]);

  // Create handlers that are bound to current card - recreated when card changes
  // Using mountCountRef ensures Brave mobile gets fresh handlers
  const swipeHandlers = useMemo(() => {
    const currentCardId = card.id;
    const currentMount = mountCountRef.current;

    return {
      onSwiping: (eventData: { deltaX: number }) => {
        if (!isTop || hasSwipedRef.current) return;

        setIsSwiping(true);
        x.set(eventData.deltaX);

        // Track direction based on current position
        if (eventData.deltaX > SWIPE_THRESHOLD) {
          swipeDirectionRef.current = 'right';
        } else if (eventData.deltaX < -SWIPE_THRESHOLD) {
          swipeDirectionRef.current = 'left';
        } else {
          swipeDirectionRef.current = null;
        }
      },
      onSwiped: (eventData: { deltaX: number }) => {
        if (!isTop || hasSwipedRef.current) return;

        const absX = Math.abs(eventData.deltaX);

        if (absX > SWIPE_THRESHOLD) {
          const direction = eventData.deltaX > 0 ? 'right' : 'left';
          handleSwipeComplete(direction);
        } else {
          resetCardState();
        }
      },
      onTouchStartOrOnMouseDown: () => {
        // Log touch start for debugging Brave mobile
        if (process.env.NODE_ENV === 'development') {
          console.log(`Touch start on card: ${currentCardId}, mount: ${currentMount}`);
        }
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, isTop, handleSwipeComplete, resetCardState]);

  // Use useSwipeable with fresh handlers for each card
  const swipeableHandlers = useSwipeable({
    ...swipeHandlers,
    trackMouse: true,
    trackTouch: true,
    preventScrollOnSwipe: true,
    delta: 10,
    swipeDuration: 500,
    touchEventOptions: { passive: false },
  });

  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (!regenerateInstructions.trim()) return;

    setIsRegenerating(true);
    try {
      const data = await deckApi.regenerate(card.id, regenerateInstructions);
      setDraft(data.draft_text);
      if (data.subject) setSubject(data.subject);
      setShowRegenerateInput(false);
      setRegenerateInstructions('');
    } catch (error) {
      console.error('Regeneration failed:', error);
      // Ideally show toast here
    } finally {
      setIsRegenerating(false);
    }
  };

  const platformStyles = getPlatformCardStyles(card.platform);

  // Stack effect calculations
  const stackScale = 1 - (stackIndex * 0.04);
  const stackTranslateY = stackIndex * 16;
  const stackZIndex = 40 - (stackIndex * 10);
  const stackOpacity = 1 - (stackIndex * 0.15);

  return (
    <motion.div
      {...(isTop ? swipeableHandlers : {})}
      data-card-id={card.id}
      data-is-top={isTop}
      className={cn(
        'absolute select-none',
        isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
      )}
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? opacity : stackOpacity,
        zIndex: stackZIndex,
        top: 16,
        left: `${2 + stackIndex * 0.5}%`,
        right: `${2 + stackIndex * 0.5}%`,
        height: 'calc(100% - 32px)',
        // Brave mobile specific CSS properties
        willChange: isTop ? 'transform' : 'auto',
        touchAction: isTop ? 'pan-y' : 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        pointerEvents: isTop ? 'auto' : 'none',
        // Force GPU layer for Brave mobile
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
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
        x: swipeDirectionRef.current === 'right' ? 400 : -400,
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

      {/* Card content with platform-specific background */}
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
                initials={card.contact.avatar || card.contact.name.substring(0, 2)}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground text-lg truncate">{card.contact.name}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {card.contact.email || card.contact.phone || 'Contact'}
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

          {/* Draft text area */}
          {/* Subject Line for specific platforms */}
          {['email', 'gmail', 'outlook'].includes(card.platform) && (
            <div className="mb-3">
              {isEditing ? (
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full p-2 rounded-lg bg-primary/5 border border-primary/20 text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              ) : (
                <div
                  onClick={() => setIsEditing(true)}
                  className="p-2 rounded-lg bg-primary/5 border border-primary/20 hover:border-primary/40 cursor-text transition-colors"
                >
                  <p className="text-foreground font-medium text-sm">
                    <span className="text-muted-foreground font-normal">Subject: </span>
                    {subject || '(No Subject)'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Draft text area */}
          {isEditing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                // Only exit edit mode if we clicked outside? 
                // Actually relying on blur for textarea might be annoying if click subject input.
                // Let's remove onBlur auto-close or make it smarter.
                // For simplicity, keep it but maybe delay or check active element.
                // User can click "Send" to finish.
                // Or we rely on the container click to open edit, and explicit 'Done' button?
                // Current UX: click text -> edit -> blur -> view.
                // If I click Subject input, Textarea blurs.
                // I should wrap the whole editing block in a container that handles edit state?
                // For now, I'll remove onBlur from textarea so user can switch between inputs.
              }}
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

          {/* Done Editing Button (Only visible when editing) */}
          {isEditing && (
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                Done Editing
              </Button>
            </div>
          )}
        </div>

        {/* Regenerate section */}
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
