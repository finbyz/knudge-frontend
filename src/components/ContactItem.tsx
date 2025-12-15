import { ChevronRight } from 'lucide-react';
import { Contact } from '@/api/contacts';
import { Avatar } from './Avatar';
import { PlatformBadge } from './PlatformBadge';

interface ContactItemProps {
  contact: Contact;
  onClick: () => void;
}

export function ContactItem({ contact, onClick }: ContactItemProps) {
  // Derive details that might be missing in API response compared to mock
  // Or handle them gracefully.
  const platforms = contact.bridge_map ? Object.keys(contact.bridge_map) : [];

  // Title/Company not in backend currently. Display nothing or placeholder if really needed.
  // For now we just show name.

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card hover:bg-muted/50 transition-colors text-left border border-transparent hover:border-border"
    >
      <Avatar initials={contact.avatar || contact.name.substring(0, 2)} size="md" /> 
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground truncate">{contact.name}</h3>
        <p className="text-sm text-muted-foreground truncate">
          {/* Fallback or specific logic if we add title later */}
          {contact.email || contact.phone || 'No contact info'}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          {platforms.slice(0, 2).map((platform) => (
            <PlatformBadge key={platform} platform={platform as any} size="sm" />
          ))}
          {platforms.length > 2 && (
            <span className="text-xs text-muted-foreground">+{platforms.length - 2}</span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}
