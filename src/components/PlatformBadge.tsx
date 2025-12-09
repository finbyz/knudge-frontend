import { cn } from '@/lib/utils';
import { MessageCircle, Linkedin, Mail, Shield } from 'lucide-react';

type Platform = 'whatsapp' | 'linkedin' | 'signal' | 'email';

interface PlatformBadgeProps {
  platform: Platform;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const platformConfig = {
  whatsapp: {
    icon: MessageCircle,
    label: 'WhatsApp',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600',
  },
  linkedin: {
    icon: Linkedin,
    label: 'LinkedIn',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-600',
  },
  signal: {
    icon: Shield,
    label: 'Signal',
    bgClass: 'bg-indigo-500/10',
    textClass: 'text-indigo-600',
  },
  email: {
    icon: Mail,
    label: 'Email',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-600',
  },
};

const sizeClasses = {
  sm: 'h-5 w-5 p-1',
  md: 'h-7 w-7 p-1.5',
  lg: 'h-9 w-9 p-2',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function PlatformBadge({ platform, size = 'md', showLabel = false }: PlatformBadgeProps) {
  const config = platformConfig[platform];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-1.5', showLabel && 'pr-2')}>
      <div
        className={cn(
          'rounded-lg flex items-center justify-center',
          config.bgClass,
          sizeClasses[size]
        )}
      >
        <Icon className={cn(iconSizes[size], config.textClass)} />
      </div>
      {showLabel && (
        <span className={cn('text-xs font-medium', config.textClass)}>
          {config.label}
        </span>
      )}
    </div>
  );
}
