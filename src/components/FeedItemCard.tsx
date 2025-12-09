import { Youtube, Rss, Linkedin, Sparkles } from 'lucide-react';
import { FeedItem } from '@/data/mockData';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface FeedItemCardProps {
  item: FeedItem;
  onDraft: () => void;
  onDismiss: () => void;
}

const typeConfig = {
  youtube: {
    icon: Youtube,
    bgClass: 'bg-red-500/10',
    iconClass: 'text-red-500',
  },
  rss: {
    icon: Rss,
    bgClass: 'bg-orange-500/10',
    iconClass: 'text-orange-500',
  },
  linkedin: {
    icon: Linkedin,
    bgClass: 'bg-blue-500/10',
    iconClass: 'text-blue-600',
  },
};

export function FeedItemCard({ item, onDraft, onDismiss }: FeedItemCardProps) {
  const config = typeConfig[item.type];
  const Icon = config.icon;

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
      {item.thumbnail && (
        <div className="aspect-video bg-muted">
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', config.bgClass)}>
            <Icon className={cn('h-4 w-4', config.iconClass)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground line-clamp-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {item.source} • {item.timestamp}
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">AI Suggests</span>
          </div>
          <p className="text-sm text-foreground">{item.suggestion}</p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            onClick={onDraft}
            className="flex-1 gradient-primary text-primary-foreground border-0"
          >
            Draft Comment
          </Button>
          <Button
            variant="outline"
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
