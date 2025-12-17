import { motion } from 'framer-motion';
import { Target, Handshake, Star, Newspaper, Check } from 'lucide-react';
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
  outcome: string;
  accentColor: string;
}> = {
  competitor: {
    icon: Target,
    emoji: '🎯',
    title: 'Competitor',
    description: 'Watch for pricing changes, new features, and positioning. AI drafts counter-arguments and highlights your advantages.',
    outcome: 'Position yourself strategically against competition',
    accentColor: 'border-red-500/50 bg-red-50/50',
  },
  lead: {
    icon: Handshake,
    emoji: '💼',
    title: 'Lead / Prospect',
    description: 'Track life events, job changes, and milestones. AI drafts congratulatory messages and bonding comments.',
    outcome: 'Build relationships naturally and authentically',
    accentColor: 'border-blue-500/50 bg-blue-50/50',
  },
  influencer: {
    icon: Star,
    emoji: '⭐',
    title: 'Influencer / Guru',
    description: 'Monitor their content and engagement patterns. AI drafts valuable comments to boost your visibility.',
    outcome: 'Establish yourself in their audience community',
    accentColor: 'border-purple-500/50 bg-purple-50/50',
  },
  news: {
    icon: Newspaper,
    emoji: '📰',
    title: 'News Source',
    description: 'Track trends, breaking news, and industry updates. AI summarizes insights for your content strategy.',
    outcome: 'Stay ahead with timely, relevant commentary',
    accentColor: 'border-orange-500/50 bg-orange-50/50',
  },
};

export function IntentCard({ intent, isSelected, onSelect }: IntentCardProps) {
  const config = intentConfig[intent];

  return (
    <motion.button
      onClick={onSelect}
      className={cn(
        'w-full p-4 rounded-xl border-2 text-left transition-all relative',
        'hover:shadow-md',
        isSelected
          ? 'border-primary bg-primary/5 shadow-md'
          : `border-border bg-card hover:border-primary/30`
      )}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{config.emoji}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-base text-foreground mb-1">{config.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">{config.description}</p>
          <p className="text-xs text-primary/70 font-medium">→ {config.outcome}</p>
        </div>
        <div className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
        )}>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <Check className="w-4 h-4 text-primary-foreground" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.button>
  );
}
