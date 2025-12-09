import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

const variantClasses = {
  default: {
    bg: 'bg-muted/50',
    iconBg: 'bg-muted',
    iconText: 'text-muted-foreground',
  },
  primary: {
    bg: 'bg-primary/5',
    iconBg: 'gradient-primary',
    iconText: 'text-primary-foreground',
  },
  success: {
    bg: 'bg-success/5',
    iconBg: 'bg-success',
    iconText: 'text-success-foreground',
  },
  warning: {
    bg: 'bg-warning/5',
    iconBg: 'bg-warning',
    iconText: 'text-warning-foreground',
  },
};

export function StatsCard({ icon: Icon, label, value, trend, variant = 'default' }: StatsCardProps) {
  const classes = variantClasses[variant];

  return (
    <div className={cn('rounded-2xl p-4', classes.bg)}>
      <div className="flex items-start justify-between">
        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', classes.iconBg)}>
          <Icon className={cn('h-5 w-5', classes.iconText)} />
        </div>
        {trend && (
          <span className="text-xs font-medium text-success">{trend}</span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}
