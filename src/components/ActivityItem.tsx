import { Send, MessageCircle, Bell, Link2 } from 'lucide-react';
import { Activity } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface ActivityItemProps {
  activity: Activity;
}

const typeConfig = {
  sent: {
    icon: Send,
    bgClass: 'bg-success/10',
    iconClass: 'text-success',
  },
  received: {
    icon: MessageCircle,
    bgClass: 'bg-primary/10',
    iconClass: 'text-primary',
  },
  reminder: {
    icon: Bell,
    bgClass: 'bg-warning/10',
    iconClass: 'text-warning',
  },
  connected: {
    icon: Link2,
    bgClass: 'bg-secondary/10',
    iconClass: 'text-secondary',
  },
};

export function ActivityItem({ activity }: ActivityItemProps) {
  const config = typeConfig[activity.type];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', config.bgClass)}>
        <Icon className={cn('h-4 w-4', config.iconClass)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          {activity.contact && <span className="font-medium">{activity.contact}</span>}
          {activity.contact && ' • '}
          {activity.message}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {activity.platform && `${activity.platform} • `}{activity.timestamp}
        </p>
      </div>
    </div>
  );
}
