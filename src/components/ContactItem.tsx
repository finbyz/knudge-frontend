import { ChevronRight } from 'lucide-react';
import { Contact } from '@/data/mockData';
import { Avatar } from './Avatar';
import { PlatformBadge } from './PlatformBadge';

interface ContactItemProps {
  contact: Contact;
  onClick: () => void;
}

export function ContactItem({ contact, onClick }: ContactItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card hover:bg-muted/50 transition-colors text-left border border-transparent hover:border-border"
    >
      <Avatar initials={contact.avatar} size="md" isVIP={contact.isVIP} />
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground truncate">{contact.name}</h3>
        <p className="text-sm text-muted-foreground truncate">
          {contact.title} {contact.company && `• ${contact.company}`}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          {contact.platforms.slice(0, 2).map((platform) => (
            <PlatformBadge key={platform} platform={platform} size="sm" />
          ))}
          {contact.platforms.length > 2 && (
            <span className="text-xs text-muted-foreground">+{contact.platforms.length - 2}</span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}
