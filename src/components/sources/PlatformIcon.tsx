import { Platform } from '@/stores/sourcesStore';
import { Youtube, Linkedin, Instagram, MessageCircle, Send, Rss, Twitter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlatformIconProps {
  platform: Platform;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBackground?: boolean;
  className?: string;
}

const platformConfig: Record<Platform, { 
  icon: React.ElementType; 
  bgColor: string; 
  iconColor: string;
  gradient?: string;
}> = {
  youtube: { 
    icon: Youtube, 
    bgColor: 'bg-red-500', 
    iconColor: 'text-white' 
  },
  linkedin: { 
    icon: Linkedin, 
    bgColor: 'bg-[#0A66C2]', 
    iconColor: 'text-white' 
  },
  instagram: { 
    icon: Instagram, 
    bgColor: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400', 
    iconColor: 'text-white',
    gradient: 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #F77737 100%)'
  },
  whatsapp: { 
    icon: MessageCircle, 
    bgColor: 'bg-[#25D366]', 
    iconColor: 'text-white' 
  },
  telegram: { 
    icon: Send, 
    bgColor: 'bg-[#0088CC]', 
    iconColor: 'text-white' 
  },
  rss: { 
    icon: Rss, 
    bgColor: 'bg-orange-500', 
    iconColor: 'text-white' 
  },
  twitter: { 
    icon: Twitter, 
    bgColor: 'bg-[#1DA1F2]', 
    iconColor: 'text-white' 
  },
};

const sizeClasses = {
  sm: { container: 'w-8 h-8', icon: 'h-4 w-4' },
  md: { container: 'w-10 h-10', icon: 'h-5 w-5' },
  lg: { container: 'w-12 h-12', icon: 'h-6 w-6' },
  xl: { container: 'w-20 h-20', icon: 'h-10 w-10' },
};

export function PlatformIcon({ platform, size = 'md', showBackground = true, className }: PlatformIconProps) {
  const config = platformConfig[platform];
  const sizeConfig = sizeClasses[size];
  const Icon = config.icon;

  if (!showBackground) {
    return <Icon className={cn(sizeConfig.icon, config.iconColor, className)} />;
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center flex-shrink-0',
        sizeConfig.container,
        config.bgColor,
        className
      )}
      style={config.gradient ? { background: config.gradient } : undefined}
    >
      <Icon className={cn(sizeConfig.icon, config.iconColor)} />
    </div>
  );
}

export function getPlatformName(platform: Platform): string {
  const names: Record<Platform, string> = {
    youtube: 'YouTube',
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    rss: 'RSS',
    twitter: 'Twitter',
  };
  return names[platform];
}
