import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface FixedBottomContainerProps {
  children: React.ReactNode;
  show?: boolean;
  className?: string;
}

export function FixedBottomContainer({ 
  children, 
  show = true, 
  className 
}: FixedBottomContainerProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={cn(
            'fixed bottom-0 left-0 right-0 z-40',
            'bg-background/95 backdrop-blur-sm',
            'border-t border-border',
            'px-4 py-4',
            'flex items-center justify-center gap-3',
            'safe-bottom',
            className
          )}
          style={{ minHeight: '80px' }}
        >
          <div className="w-full max-w-md">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
