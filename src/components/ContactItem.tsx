import { ChevronRight } from 'lucide-react';
import { Contact } from '@/api/contacts';
import { Avatar } from './Avatar';
import { PlatformBadge } from './PlatformBadge';
import { formatPhone, formatSenderName } from '@/lib/utils';

interface ContactItemProps {
  contact: Contact;
  onClick: () => void;
}

export function ContactItem({ contact, onClick }: ContactItemProps) {
  // Derive details that might be missing in API response compared to mock
  // Or handle them gracefully.
  // Derive platforms from available contact info
  // Derive platforms from available contact info
  const platforms: string[] = [];

  // 1. Check explicit providers (e.g. "outlook", "whatsapp")
  if (contact.provider) {
    const providers = contact.provider.split(',').map((p) => {
      const x = p.trim().toLowerCase();
      return x === 'google_contacts' ? 'gmail' : x;
    });
    platforms.push(...providers);
  }

  // 2. Fallback to inferred channels IF not already covered
  // If we have 'outlook', we don't need generic 'email' unless specified
  if (contact.email && !contact.provider) platforms.push('email');
  const hasWa =
    Boolean(contact.has_whatsapp) ||
    (contact.provider || '').toLowerCase().split(',').some((x) => x.trim() === 'whatsapp');
  if (hasWa && !platforms.map((p) => p.toLowerCase()).includes('whatsapp')) {
    platforms.push('whatsapp');
  }
  if (contact.linkedin_url && !platforms.includes('linkedin')) platforms.push('linkedin');

  const uniquePlatforms = [...new Set(platforms)];

  // Title/Company not in backend currently. Display nothing or placeholder if really needed.
  // For now we just show name.

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card hover:bg-muted/50 transition-colors text-left border border-transparent hover:border-border"
    >
      <Avatar
        initials={contact.name.substring(0, 2).toUpperCase()}
        src={contact.avatar}
        size="md"
        isGroup={contact.notes === 'WhatsApp Group'}
      />

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground truncate">{formatSenderName(contact.name)}</h3>
        <p className="text-sm text-muted-foreground truncate">
          {contact.email?.trim() ||
            (contact.phone ? formatPhone(contact.phone) : '') ||
            (contact.provider?.toLowerCase() === 'whatsapp' ? 'WhatsApp contact' : '') ||
            (['gmail', 'google_contacts'].includes((contact.provider || '').toLowerCase())
              ? 'Google Contacts'
              : '') ||
            'No contact info'}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          {uniquePlatforms.slice(0, 2).map((platform) => (
            <PlatformBadge key={platform} platform={platform as any} size="sm" />
          ))}
          {uniquePlatforms.length > 2 && (
            <span className="text-xs text-muted-foreground">+{uniquePlatforms.length - 2}</span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}
