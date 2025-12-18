import { motion } from 'framer-motion';
import { Settings, AlertTriangle, Trash2 } from 'lucide-react';
import { Source } from '@/stores/sourcesStore';
import { PlatformIcon, getPlatformName } from './PlatformIcon';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useSwipeable } from 'react-swipeable';

interface SourceRowProps {
  source: Source;
  onToggle: (id: string) => void;
  onEdit: (source: Source) => void;
  onDelete: (id: string) => void;
}

export function SourceRow({ source, onToggle, onEdit, onDelete }: SourceRowProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteButton, setShowDeleteButton] = useState(false);

  const DELETE_THRESHOLD = 60; // Reduced from 80px
  const DELETE_ZONE_WIDTH = 100; // Width of red delete area

  const resetSwipe = () => {
    setSwipeOffset(0);
    setShowDeleteButton(false);
    setIsDeleting(false);
  };

  const handleDelete = () => {
    setIsDeleting(true);
    // Animate out before deleting
    setTimeout(() => {
      onDelete(source.id);
      resetSwipe();
    }, 200);
  };

  const swipeHandlers = useSwipeable({
    onSwiping: (e) => {
      // Only allow left swipe (negative deltaX)
      if (e.deltaX < 0) {
        // Clamp swipe between 0 and -DELETE_ZONE_WIDTH
        const newOffset = Math.max(Math.min(e.deltaX, 0), -DELETE_ZONE_WIDTH);
        setSwipeOffset(newOffset);

        // Show delete button when swiped past 30% of threshold
        if (Math.abs(newOffset) > DELETE_THRESHOLD * 0.3) {
          setShowDeleteButton(true);
        } else {
          setShowDeleteButton(false);
        }
      }
    },

    onSwipedLeft: (e) => {
      // Check if swiped past threshold
      if (Math.abs(e.deltaX) > DELETE_THRESHOLD) {
        // Lock at delete position
        setSwipeOffset(-DELETE_ZONE_WIDTH);
        setShowDeleteButton(true);
        setIsDeleting(false); // Don't auto-delete, wait for button click
      } else {
        // Snap back to original position
        resetSwipe();
      }
    },

    onSwipedRight: () => {
      // Swipe right always resets
      resetSwipe();
    },

    onTouchEndOrOnMouseUp: () => {
      // If not at delete position, reset
      if (swipeOffset > -DELETE_ZONE_WIDTH && !isDeleting) {
        resetSwipe();
      }
    },

    // CRITICAL FIX: Enable mouse tracking for desktop
    trackMouse: true,  // Changed from false
    trackTouch: true,
    preventScrollOnSwipe: true,
    delta: 10,
    swipeDuration: 500,
  });

  return (
    <div className="relative overflow-hidden">
      {/* Delete background - slides in smoothly */}
      <motion.div
        initial={{ x: 100 }}
        animate={{
          x: swipeOffset < -20 ? 0 : 100,
          opacity: swipeOffset < -20 ? 1 : 0
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
        className="absolute inset-y-0 right-0 w-24 bg-destructive flex items-center justify-center"
      >
        <button
          onClick={handleDelete}
          disabled={!showDeleteButton}
          className={cn(
            "flex flex-col items-center gap-1 text-destructive-foreground transition-opacity",
            showDeleteButton ? "opacity-100" : "opacity-50 pointer-events-none"
          )}
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-xs font-medium">Delete</span>
        </button>
      </motion.div>

      {/* Main row - smooth transform */}
      <motion.div
        {...swipeHandlers}
        animate={{
          x: isDeleting ? -400 : swipeOffset,
          opacity: isDeleting ? 0 : 1
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 40,
          duration: 0.3
        }}
        className={cn(
          'relative flex items-center gap-3 p-4 bg-card border-b border-border',
          'hover:bg-muted/30 touch-pan-y', // Added touch-pan-y
          !source.isActive && 'opacity-60',
          swipeOffset < -DELETE_THRESHOLD && 'bg-destructive/5' // Visual feedback
        )}
        style={{
          cursor: 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        {/* Rest of the component stays same */}
        <div className="relative flex-shrink-0">
          {source.avatarUrl ? (
            <>
              <img
                src={source.avatarUrl}
                alt={source.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="absolute -bottom-1 -right-1">
                <PlatformIcon platform={source.platform} size="sm" />
              </div>
            </>
          ) : (
            <PlatformIcon platform={source.platform} size="lg" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground truncate">{source.name}</h4>
            {source.syncStatus === 'error' && (
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {source.metadata.activityFrequency || getPlatformName(source.platform)}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Switch
            checked={source.isActive}
            onCheckedChange={() => onToggle(source.id)}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(source);
            }}
            className="h-8 w-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
