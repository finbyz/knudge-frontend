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
          'w-full flex items-center justify-between p-4 md:px-6 transition-colors',
          isExpanded ? 'bg-card' : 'bg-muted/30'
        )}
      >
        <div className="text-left flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base md:text-lg text-foreground">{title}</h3>
              <span className="text-xs md:text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {sources.length}
              </span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0"
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
              <div className="divide-y divide-border">
                {sources.map((source) => (
                  <SourceRow
                    key={source.id}
                    source={source}
                    onToggle={onToggleSource}
                    onEdit={onEditSource}
                    onDelete={onDeleteSource}
                  />
                ))}
              </div>
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
