import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Platform = 'youtube' | 'linkedin' | 'instagram' | 'whatsapp' | 'telegram' | 'rss' | 'twitter';
export type IntentType = 'competitor' | 'lead' | 'influencer' | 'news';
export type SourceGroup = 'priority' | 'inspiration' | 'communities';
export type SyncStatus = 'active' | 'error' | 'pending';

export interface Source {
  id: string;
  name: string;
  platform: Platform;
  url: string;
  avatarUrl?: string;
  bio?: string;
  metadata: {
    followers?: number;
    posts?: number;
    activityFrequency?: string;
  };
  intent: IntentType;
  group: SourceGroup;
  isActive: boolean;
  options: {
    notifyOnShorts?: boolean;
    summarizeLongVideos?: boolean;
    inviteLink?: string;
  };
  createdAt: number;
  lastSynced?: number;
  syncStatus: SyncStatus;
}

interface SourcesState {
  sources: Source[];
  isLoading: boolean;
  error: string | null;
  expandedGroups: Record<SourceGroup, boolean>;
  
  // Actions
  addSource: (source: Omit<Source, 'id' | 'createdAt' | 'syncStatus'>) => void;
  updateSource: (id: string, updates: Partial<Source>) => void;
  deleteSource: (id: string) => void;
  toggleSourceActive: (id: string) => void;
  toggleGroup: (group: SourceGroup) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Generate unique ID
const generateId = () => `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Mock sources for testing
const mockSources: Source[] = [
  // Priority Accounts (4 sources)
  {
    id: 'source_1',
    name: 'Satya Nadella',
    platform: 'linkedin',
    url: 'https://linkedin.com/in/satyanadella',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop',
    bio: 'Chairman and CEO at Microsoft',
    metadata: { followers: 10500000, activityFrequency: '2 posts/week' },
    intent: 'competitor',
    group: 'priority',
    isActive: true,
    options: {},
    createdAt: Date.now() - 86400000 * 10,
    syncStatus: 'active',
  },
  {
    id: 'source_2',
    name: 'Gary Vaynerchuk',
    platform: 'youtube',
    url: 'https://youtube.com/@garyvee',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop',
    bio: 'Serial Entrepreneur & CEO of VaynerMedia',
    metadata: { followers: 4200000, activityFrequency: '5 posts/week' },
    intent: 'lead',
    group: 'priority',
    isActive: true,
    options: { notifyOnShorts: false, summarizeLongVideos: true },
    createdAt: Date.now() - 86400000 * 8,
    syncStatus: 'active',
  },
  {
    id: 'source_3',
    name: 'Microsoft',
    platform: 'linkedin',
    url: 'https://linkedin.com/company/microsoft',
    avatarUrl: 'https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=80&h=80&fit=crop',
    bio: 'Every company has a mission.',
    metadata: { followers: 18000000, activityFrequency: '10 posts/week' },
    intent: 'competitor',
    group: 'priority',
    isActive: true,
    options: {},
    createdAt: Date.now() - 86400000 * 7,
    syncStatus: 'active',
  },
  {
    id: 'source_4',
    name: 'Tim Ferriss',
    platform: 'instagram',
    url: 'https://instagram.com/timferriss',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop',
    bio: 'Author of 4-Hour Workweek, Angel Investor',
    metadata: { followers: 2100000, activityFrequency: '3 posts/week' },
    intent: 'lead',
    group: 'priority',
    isActive: false,
    options: {},
    createdAt: Date.now() - 86400000 * 6,
    syncStatus: 'active',
  },
  
  // Content Inspiration (5 sources)
  {
    id: 'source_5',
    name: 'MKBHD',
    platform: 'youtube',
    url: 'https://youtube.com/@mkbhd',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop',
    bio: 'Quality Tech Videos',
    metadata: { followers: 18000000, activityFrequency: '3 posts/week' },
    intent: 'influencer',
    group: 'inspiration',
    isActive: true,
    options: { notifyOnShorts: true, summarizeLongVideos: true },
    createdAt: Date.now() - 86400000 * 5,
    syncStatus: 'active',
  },
  {
    id: 'source_6',
    name: 'TechCrunch',
    platform: 'rss',
    url: 'https://techcrunch.com/feed',
    avatarUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=80&h=80&fit=crop',
    bio: 'Technology news and analysis',
    metadata: { activityFrequency: '20 posts/day' },
    intent: 'news',
    group: 'inspiration',
    isActive: true,
    options: {},
    createdAt: Date.now() - 86400000 * 4,
    syncStatus: 'active',
  },
  {
    id: 'source_7',
    name: 'Y Combinator',
    platform: 'linkedin',
    url: 'https://linkedin.com/company/y-combinator',
    avatarUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=80&h=80&fit=crop',
    bio: 'A startup accelerator',
    metadata: { followers: 820000, activityFrequency: '4 posts/week' },
    intent: 'news',
    group: 'inspiration',
    isActive: true,
    options: {},
    createdAt: Date.now() - 86400000 * 3,
    syncStatus: 'active',
  },
  {
    id: 'source_8',
    name: 'Ali Abdaal',
    platform: 'youtube',
    url: 'https://youtube.com/@aliabdaal',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop',
    bio: 'Productivity & Business',
    metadata: { followers: 5400000, activityFrequency: '2 posts/week' },
    intent: 'influencer',
    group: 'inspiration',
    isActive: true,
    options: { notifyOnShorts: false, summarizeLongVideos: true },
    createdAt: Date.now() - 86400000 * 2,
    syncStatus: 'active',
  },
  {
    id: 'source_9',
    name: 'The Verge',
    platform: 'rss',
    url: 'https://theverge.com/rss',
    avatarUrl: 'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=80&h=80&fit=crop',
    bio: 'Tech, science, and culture',
    metadata: { activityFrequency: '15 posts/day' },
    intent: 'news',
    group: 'inspiration',
    isActive: true,
    options: {},
    createdAt: Date.now() - 86400000 * 1,
    syncStatus: 'error',
  },
  
  // Communities (3 sources)
  {
    id: 'source_10',
    name: 'Startup Founders Group',
    platform: 'whatsapp',
    url: 'https://chat.whatsapp.com/abc123',
    bio: 'Community of startup founders',
    metadata: { activityFrequency: '50 messages/day' },
    intent: 'news',
    group: 'communities',
    isActive: true,
    options: { inviteLink: 'https://chat.whatsapp.com/abc123' },
    createdAt: Date.now() - 86400000 * 15,
    syncStatus: 'active',
  },
  {
    id: 'source_11',
    name: 'Tech News Daily',
    platform: 'telegram',
    url: 'https://t.me/technewsdaily',
    bio: 'Daily tech news updates',
    metadata: { followers: 125000, activityFrequency: '10 posts/day' },
    intent: 'news',
    group: 'communities',
    isActive: true,
    options: { inviteLink: 'https://t.me/technewsdaily' },
    createdAt: Date.now() - 86400000 * 12,
    syncStatus: 'active',
  },
  {
    id: 'source_12',
    name: 'Marketing Insiders',
    platform: 'whatsapp',
    url: 'https://chat.whatsapp.com/xyz789',
    bio: 'Marketing professionals community',
    metadata: { activityFrequency: '30 messages/day' },
    intent: 'influencer',
    group: 'communities',
    isActive: false,
    options: { inviteLink: 'https://chat.whatsapp.com/xyz789' },
    createdAt: Date.now() - 86400000 * 20,
    syncStatus: 'active',
  },
];

export const useSourcesStore = create<SourcesState>()(
  persist(
    (set, get) => ({
      sources: mockSources,
      isLoading: false,
      error: null,
      expandedGroups: {
        priority: true,
        inspiration: true,
        communities: true,
      },

      addSource: (sourceData) => {
        const newSource: Source = {
          ...sourceData,
          id: generateId(),
          createdAt: Date.now(),
          syncStatus: 'pending',
        };
        set((state) => ({
          sources: [newSource, ...state.sources],
        }));
      },

      updateSource: (id, updates) => {
        set((state) => ({
          sources: state.sources.map((source) =>
            source.id === id ? { ...source, ...updates } : source
          ),
        }));
      },

      deleteSource: (id) => {
        set((state) => ({
          sources: state.sources.filter((source) => source.id !== id),
        }));
      },

      toggleSourceActive: (id) => {
        set((state) => ({
          sources: state.sources.map((source) =>
            source.id === id ? { ...source, isActive: !source.isActive } : source
          ),
        }));
      },

      toggleGroup: (group) => {
        set((state) => ({
          expandedGroups: {
            ...state.expandedGroups,
            [group]: !state.expandedGroups[group],
          },
        }));
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'knudge-sources-storage',
    }
  )
);
