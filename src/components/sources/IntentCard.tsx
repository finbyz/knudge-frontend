import { motion } from 'framer-motion';
import { Target, Handshake, Star, Newspaper } from 'lucide-react';
import { IntentType } from '@/stores/sourcesStore';
import { cn } from '@/lib/utils';

interface IntentCardProps {
  intent: IntentType;
  isSelected: boolean;
  onSelect: () => void;
}

const intentConfig: Record<IntentType, {
  icon: React.ElementType;
  emoji: string;
  title: string;
  description: string;
}> = {
  competitor: {
    icon: Target,
    emoji: '🎯',
    title: 'Competitor',
    description: 'Watch for pricing changes or new features. Draft counter-arguments.',
  },
  lead: {
    icon: Handshake,
    emoji: '🤝',
    title: 'Lead/Prospect',
    description: 'Notify me of life events. Draft congratulatory/bonding comments.',
  },
  influencer: {
    icon: Star,
    emoji: '⭐',
    title: 'Influencer/Guru',
    description: 'Draft value-add comments to boost my visibility on their posts.',
  },
  news: {
    icon: Newspaper,
    emoji: '📰',
    title: 'News Source',
    description: 'Summarize trends for my own content ideas.',
  },
};

export function IntentCard({ intent, isSelected, onSelect }: IntentCardProps) {
  const config = intentConfig[intent];
  
  return (
    <motion.button
      onClick={onSelect}
      className={cn(
        'w-full p-5 rounded-xl border-2 text-left transition-all',
        'hover:shadow-md hover:scale-[1.02]',
        isSelected 
          ? 'border-primary bg-primary/5' 
          : 'border-border bg-card hover:border-primary/30'
      )}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{config.emoji}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-lg text-foreground mb-1">{config.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>
        </div>
        <div className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1',
          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
        )}>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-2 h-2 rounded-full bg-primary-foreground"
            />
          )}
        </div>
      </div>
    </motion.button>
  );
}
