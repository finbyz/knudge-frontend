import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Source, SourceGroup as SourceGroupType } from '@/stores/sourcesStore';
import { SourceRow } from './SourceRow';
import { cn } from '@/lib/utils';

interface SourceGroupProps {
  title: string;
  subtitle: string;
  group: SourceGroupType;
  sources: Source[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleSource: (id: string) => void;
  onEditSource: (source: Source) => void;
  onDeleteSource: (id: string) => void;
}

export function SourceGroup({
  title,
  subtitle,
  sources,
  isExpanded,
  onToggleExpand,
  onToggleSource,
  onEditSource,
  onDeleteSource,
}: SourceGroupProps) {
  return (
    <div className="overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggleExpand}
        className={cn(
          'w-full flex items-center justify-between p-4 transition-colors',
          isExpanded ? 'bg-card' : 'bg-muted/50'
        )}
      >
        <div className="text-left">
          <h3 className="font-semibold text-lg text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            {sources.length > 0 ? (
              sources.map((source) => (
                <SourceRow
                  key={source.id}
                  source={source}
                  onToggle={onToggleSource}
                  onEdit={onEditSource}
                  onDelete={onDeleteSource}
                />
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground text-sm">No sources in this group</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
