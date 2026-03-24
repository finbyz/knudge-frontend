import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

interface AvatarProps {
  initials: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isVIP?: boolean;
  isGroup?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function Avatar({ initials, src, size = 'md', isVIP = false, isGroup = false }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  // Only show image if src is a real URL (starts with http/https or /)
  const isValidUrl = src && (src.startsWith('http') || src.startsWith('/'));
  const showImg = isValidUrl && !imgFailed;

  return (
    <div className="relative">
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-semibold text-primary-foreground overflow-hidden',
          showImg ? 'bg-muted' : 'gradient-primary',
          sizeClasses[size],
          isVIP && 'ring-2 ring-warning ring-offset-2 ring-offset-background'
        )}
      >
        {showImg ? (
          <img
            src={src}
            alt={initials}
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : isGroup ? (
          <Users className="h-1/2 w-1/2" />
        ) : (
          initials
        )}
      </div>
      {isVIP && (
        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-warning flex items-center justify-center">
          <span className="text-[8px]">⭐</span>
        </div>
      )}
    </div>
  );
}
