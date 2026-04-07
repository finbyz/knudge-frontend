import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        'glass-card rounded-3xl p-5 relative overflow-hidden group transition-all duration-300',
        'hover:shadow-elevated hover:iridescent-border'
      )}
    >
      <div className="flex items-start justify-between relative z-10">
        <div className={cn(
          'h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-500 group-hover:rotate-6', 
          classes.iconBg
        )}>
          <Icon className={cn('h-6 w-6', classes.iconText)} />
        </div>
        {trend && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {trend}
            </span>
          </div>
        )}
      </div>
      <div className="mt-4 relative z-10">
        <p className="text-3xl font-extrabold tracking-tight text-foreground">{value}</p>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1 opacity-70">
          {label}
        </p>
      </div>
      
      {/* Absolute decorative element */}
      <div className={cn(
        "absolute -right-4 -bottom-4 h-24 w-24 opacity-[0.03] transition-opacity duration-500 group-hover:opacity-[0.07]",
        classes.iconBg
      )} style={{ borderRadius: '50%' }} />
    </motion.div>
  );
}
