import { Contact } from '@/api/contacts';

export interface ActionCard {
  id: string;
  contact: Contact;
  // UI specific fields not in API Contact but used in Deck UI
  // We might populate these with fallback values or partial data
  platform: 'whatsapp' | 'email' | 'gmail' | 'outlook' | 'telegram' | 'instagram';
  draft: string;
  context: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  subject?: string;
  circleName?: string;
  circleAgenda?: string;
}

export interface Connection {
  platform: 'whatsapp' | 'email' | 'gmail' | 'outlook' | 'erpnext' | 'telegram' | 'instagram';
  status: 'connected' | 'disconnected' | 'syncing';
  lastSync: string | null;
  contactCount?: number;
}

export interface FeedItem {
  id: string;
  type: 'youtube' | 'rss';
  title: string;
  source: string;
  thumbnail?: string;
  suggestion: string;
  timestamp: string;
}

export interface Activity {
  id: string;
  type: 'sent' | 'received' | 'reminder' | 'connected';
  contact?: string;
  platform?: string;
  message: string;
  timestamp: string;
}
