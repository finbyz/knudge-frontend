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

  const swipeHandlers = useSwipeable({
    onSwiping: (e) => {
      if (e.deltaX < 0) {
        setSwipeOffset(Math.max(e.deltaX, -100));
      }
    },
    onSwipedLeft: (e) => {
      if (Math.abs(e.deltaX) > 80) {
        setIsDeleting(true);
      } else {
        setSwipeOffset(0);
      }
    },
    onTouchEndOrOnMouseUp: () => {
      if (!isDeleting) {
        setSwipeOffset(0);
      }
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
    delta: 10,
  });

  const handleDelete = () => {
    onDelete(source.id);
    setIsDeleting(false);
    setSwipeOffset(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      <div className="absolute inset-y-0 right-0 w-24 bg-destructive flex items-center justify-center">
        <button
          onClick={handleDelete}
          className="flex flex-col items-center gap-1 text-destructive-foreground"
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-xs font-medium">Delete</span>
        </button>
      </div>

      {/* Main row */}
      <motion.div
        {...swipeHandlers}
        className={cn(
          'relative flex items-center gap-3 p-4 bg-card border-b border-border cursor-pointer transition-colors',
          'hover:bg-muted/30',
          !source.isActive && 'opacity-60'
        )}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        whileHover={{ backgroundColor: 'hsl(var(--muted) / 0.3)' }}
      >
        {/* Platform Icon with Avatar */}
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

        {/* Content */}
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

        {/* Actions */}
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
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
