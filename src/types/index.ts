import { Contact } from '@/api/contacts';

export interface ActionCard {
  id: string;
  contact: Contact;
  // UI specific fields not in API Contact but used in Deck UI
  // We might populate these with fallback values or partial data
  platform: 'whatsapp' | 'email' | 'gmail' | 'outlook' | 'telegram' | 'instagram' | 'linkedin';
  draft: string;
  context: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  subject?: string;
  circleName?: string;
  circleAgenda?: string;
}

export interface Connection {
  platform: 'whatsapp' | 'email' | 'gmail' | 'outlook' | 'erpnext' | 'telegram' | 'instagram' | 'linkedin';
  status: 'connected' | 'disconnected' | 'syncing';
  lastSync: string | null;
  contactCount?: number;
}

export interface FeedItem {
  id: string;
  source_type: 'youtube' | 'linkedin' | 'instagram' | 'whatsapp' | 'telegram' | 'rss' | 'twitter';
  title: string;
  content?: string;
  url: string;
  source_name: string;
  image_url?: string;
  published_at: string;
  is_read: boolean;
}

export interface Activity {
  id: string;
  type: 'sent' | 'received' | 'reminder' | 'connected';
  contact?: string;
  platform?: string;
  message: string;
  timestamp: string;
}
