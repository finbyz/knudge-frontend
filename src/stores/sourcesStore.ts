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
  fetchSources: () => Promise<void>;
  addSource: (source: { url: string; source_type: Platform }) => Promise<void>;
  updateSource: (id: string, updates: Partial<Source>) => void;
  deleteSource: (id: string) => Promise<void>;
  toggleSourceActive: (id: string) => void;
  toggleGroup: (group: SourceGroup) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

import { ApiClient } from '@/lib/api-client';

// Generate unique ID
const generateId = () => `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Mock sources for testing (Initial empty state, will fetch from API)
const initialSources: Source[] = [];

export const useSourcesStore = create<SourcesState>()(
  persist(
    (set, get) => ({
      sources: initialSources,
      isLoading: false,
      error: null,
      expandedGroups: {
        priority: true,
        inspiration: true,
        communities: true,
      },

      fetchSources: async () => {
        set({ isLoading: true });
        try {
          const data = await ApiClient.get('/feed/sources');
          // Map backend MonitorTarget to Source
          const mappedSources: Source[] = data.map((t: any) => ({
            id: t.id,
            name: t.url.split('/').pop() || t.url,
            platform: t.source_type,
            url: t.url,
            metadata: {},
            intent: 'news',
            group: t.source_type === 'rss' ? 'inspiration' : 'priority',
            isActive: true,
            options: {},
            createdAt: Date.now(),
            syncStatus: t.last_scraped ? 'active' : 'pending',
          }));
          set({ sources: mappedSources, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      addSource: async (sourceData) => {
        set({ isLoading: true });
        try {
          await ApiClient.post('/feed/sources', {
            url: sourceData.url,
            source_type: sourceData.source_type
          });
          await get().fetchSources();
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      updateSource: (id, updates) => {
        set((state) => ({
          sources: state.sources.map((source) =>
            source.id === id ? { ...source, ...updates } : source
          ),
        }));
      },

      deleteSource: async (id) => {
        set({ isLoading: true });
        try {
          await ApiClient.delete(`/feed/sources/${id}`);
          await get().fetchSources();
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
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
