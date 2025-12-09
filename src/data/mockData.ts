export interface Contact {
  id: string;
  name: string;
  avatar: string;
  title: string;
  company?: string;
  circle: string;
  platforms: ('whatsapp' | 'linkedin' | 'signal' | 'email')[];
  lastContacted: string;
  isVIP?: boolean;
}

export interface ActionCard {
  id: string;
  contact: Contact;
  platform: 'whatsapp' | 'linkedin' | 'signal' | 'email';
  draft: string;
  context: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Connection {
  platform: 'whatsapp' | 'linkedin' | 'signal' | 'email';
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

export const mockContacts: Contact[] = [
  {
    id: 'c1',
    name: 'Sarah Chen',
    avatar: 'SC',
    title: 'CTO',
    company: 'TechCorp',
    circle: 'Team',
    platforms: ['whatsapp', 'linkedin'],
    lastContacted: '3 days ago',
  },
  {
    id: 'c2',
    name: 'John Investor',
    avatar: 'JI',
    title: 'Partner',
    company: 'VC Fund',
    circle: 'VIP Investors',
    platforms: ['whatsapp', 'linkedin', 'email'],
    lastContacted: '14 days ago',
    isVIP: true,
  },
  {
    id: 'c3',
    name: 'Emily Rodriguez',
    avatar: 'ER',
    title: 'Product Manager',
    company: 'StartupXYZ',
    circle: 'Team',
    platforms: ['signal', 'linkedin'],
    lastContacted: '1 week ago',
  },
  {
    id: 'c4',
    name: 'Michael Chang',
    avatar: 'MC',
    title: 'Angel Investor',
    company: 'Chang Capital',
    circle: 'VIP Investors',
    platforms: ['whatsapp', 'email'],
    lastContacted: '5 days ago',
    isVIP: true,
  },
  {
    id: 'c5',
    name: 'Lisa Park',
    avatar: 'LP',
    title: 'CEO',
    company: 'InnovateTech',
    circle: 'Friends',
    platforms: ['whatsapp', 'linkedin', 'signal'],
    lastContacted: '2 days ago',
  },
  {
    id: 'c6',
    name: 'David Kim',
    avatar: 'DK',
    title: 'Software Engineer',
    company: 'BigTech',
    circle: 'Team',
    platforms: ['signal'],
    lastContacted: '1 day ago',
  },
];

export const mockActionCards: ActionCard[] = [
  {
    id: 'card_1',
    contact: mockContacts[1],
    platform: 'whatsapp',
    draft: "Hey John, hope you're doing well! Following up on our term sheet discussion. Would love to schedule a call this week to finalize details. Are you free Thursday afternoon?",
    context: 'Last contacted 14 days ago • Birthday in 3 days 🎂',
    priority: 'high',
  },
  {
    id: 'card_2',
    contact: mockContacts[0],
    platform: 'linkedin',
    draft: "Hi Sarah! Saw your post about the new AI features. Would love to discuss how we could collaborate on the integration. Coffee next week?",
    context: 'Mentioned you in a LinkedIn post yesterday',
    priority: 'medium',
  },
  {
    id: 'card_3',
    contact: mockContacts[3],
    platform: 'whatsapp',
    draft: "Hi Michael! Quick update on our progress - we've hit our Q4 targets ahead of schedule. Would love to share the details over a call.",
    context: 'Quarterly update due • Last contacted 5 days ago',
    priority: 'high',
  },
  {
    id: 'card_4',
    contact: mockContacts[4],
    platform: 'signal',
    draft: "Lisa! That conference was amazing. Let's catch up over dinner this weekend - I have some exciting news to share!",
    context: 'Both attended Tech Summit 2024',
    priority: 'low',
  },
  {
    id: 'card_5',
    contact: mockContacts[2],
    platform: 'linkedin',
    draft: "Emily, congrats on the product launch! The new dashboard looks incredible. Would love to hear about the design process.",
    context: 'Product launch yesterday 🚀',
    priority: 'medium',
  },
];

export const mockConnections: Connection[] = [
  { platform: 'whatsapp', status: 'connected', lastSync: '2 hours ago', contactCount: 156 },
  { platform: 'linkedin', status: 'disconnected', lastSync: null, contactCount: 0 },
  { platform: 'signal', status: 'connected', lastSync: '1 day ago', contactCount: 42 },
  { platform: 'email', status: 'syncing', lastSync: '5 minutes ago', contactCount: 89 },
];

export const mockFeedItems: FeedItem[] = [
  {
    id: 'f1',
    type: 'youtube',
    title: 'The Future of AI in Business',
    source: 'Tech Insights',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=300',
    suggestion: 'Comment about your experience with AI automation',
    timestamp: '2 hours ago',
  },
  {
    id: 'f2',
    type: 'linkedin',
    title: 'John Investor shared thoughts on market trends',
    source: 'John Investor',
    suggestion: 'Engage with his analysis on SaaS valuations',
    timestamp: '4 hours ago',
  },
  {
    id: 'f3',
    type: 'rss',
    title: 'Startup Funding Reaches New Heights in Q4',
    source: 'TechCrunch',
    suggestion: 'Share with your investor network',
    timestamp: '6 hours ago',
  },
];

export const mockActivities: Activity[] = [
  {
    id: 'a1',
    type: 'sent',
    contact: 'Lisa Park',
    platform: 'WhatsApp',
    message: 'Sent follow-up message',
    timestamp: '2 hours ago',
  },
  {
    id: 'a2',
    type: 'received',
    contact: 'Sarah Chen',
    platform: 'LinkedIn',
    message: 'Replied to your connection request',
    timestamp: '4 hours ago',
  },
  {
    id: 'a3',
    type: 'reminder',
    message: "Michael Chang's quarterly update is due",
    timestamp: '1 day ago',
  },
  {
    id: 'a4',
    type: 'connected',
    platform: 'Signal',
    message: 'Successfully synced 42 contacts',
    timestamp: '2 days ago',
  },
  {
    id: 'a5',
    type: 'sent',
    contact: 'Emily Rodriguez',
    platform: 'Signal',
    message: 'Congratulated on product launch',
    timestamp: '3 days ago',
  },
];

export const circles = ['All', 'VIP', 'Investors', 'Team', 'Friends'];
