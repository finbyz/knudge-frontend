import { cn } from '@/lib/utils';

interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isVIP?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function Avatar({ initials, size = 'md', isVIP = false }: AvatarProps) {
  return (
    <div className="relative">
      <div
        className={cn(
          'rounded-full gradient-primary flex items-center justify-center font-semibold text-primary-foreground',
          sizeClasses[size],
          isVIP && 'ring-2 ring-warning ring-offset-2 ring-offset-background'
        )}
      >
        {initials}
      </div>
      {isVIP && (
        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-warning flex items-center justify-center">
          <span className="text-[8px]">⭐</span>
        </div>
      )}
    </div>
  );
}
