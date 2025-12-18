import { Contact } from '@/api/contacts';

export interface ActionCard {
  id: string;
  contact: Contact; 
  // UI specific fields not in API Contact but used in Deck UI
  // We might populate these with fallback values or partial data
  platform: 'whatsapp' | 'linkedin' | 'signal' | 'email' | 'gmail' | 'outlook';
  draft: string;
  context: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

export interface Connection {
  platform: 'whatsapp' | 'linkedin' | 'signal' | 'email' | 'gmail' | 'outlook';
  status: 'connected' | 'disconnected' | 'syncing';
  lastSync: string | null;
  contactCount?: number;
}

export interface FeedItem {
  id: string;
  type: 'youtube' | 'rss' | 'linkedin';
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
