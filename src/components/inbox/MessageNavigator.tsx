import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSwipeable } from 'react-swipeable';

interface MessageNavigatorProps {
  currentIndex: number;
  totalMessages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  children: React.ReactNode;
}

export function MessageNavigator({
  currentIndex,
  totalMessages,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  children,
}: MessageNavigatorProps) {
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => hasNext && onNext(),
    onSwipedRight: () => hasPrevious && onPrevious(),
    trackMouse: false,
    trackTouch: true,
    delta: 50,
    preventScrollOnSwipe: true,
  });

  return (
    <div className="relative" {...swipeHandlers}>
      {/* Message counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted/80 backdrop-blur-sm px-3 py-1 rounded-full"
        >
          <span className="text-xs font-medium text-muted-foreground">
            {currentIndex} of {totalMessages}
          </span>
        </motion.div>
      </div>

      {/* Previous arrow indicator */}
      {hasPrevious && (
        <button
          onClick={onPrevious}
          className={cn(
            'absolute left-2 top-1/2 -translate-y-1/2 z-10',
            'h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm border border-border',
            'flex items-center justify-center',
            'text-muted-foreground hover:text-foreground hover:bg-card',
            'transition-all opacity-50 hover:opacity-100',
            'hidden sm:flex' // Only visible on larger screens
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Next arrow indicator */}
      {hasNext && (
        <button
          onClick={onNext}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 z-10',
            'h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm border border-border',
            'flex items-center justify-center',
            'text-muted-foreground hover:text-foreground hover:bg-card',
            'transition-all opacity-50 hover:opacity-100',
            'hidden sm:flex' // Only visible on larger screens
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Edge swipe indicators for mobile */}
      <div className="sm:hidden">
        {hasPrevious && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-gradient-to-r from-primary/20 to-transparent rounded-r-full" />
        )}
        {hasNext && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-gradient-to-l from-primary/20 to-transparent rounded-l-full" />
        )}
      </div>

      {/* Main content */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
