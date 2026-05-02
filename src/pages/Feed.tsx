import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FeedItemCard } from '@/components/FeedItemCard';
import { PageShell } from '@/components/layout/PageShell';
import { toast } from '@/hooks/use-toast';
import { Inbox } from 'lucide-react';
import { FeedItem } from '@/types';
import { useUnreadStore } from '@/stores/unreadStore';
import { ApiClient } from '@/lib/api-client';
import { useSourcesStore } from '@/stores/sourcesStore';

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'rss', label: 'RSS' },
];

export default function Feed() {
  const [activeTab, setActiveTab] = useState('all');
  const [items, setItems] = useState<FeedItem[]>([]);
  const { clearUnreadFeed } = useUnreadStore();
  const { fetchSources } = useSourcesStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    clearUnreadFeed();
    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchSources();
        const data = await ApiClient.get('/feed/items');
        setItems(data);
      } catch (error) {
        console.error('Failed to fetch feed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [clearUnreadFeed, fetchSources]);

  const filteredItems = activeTab === 'all'
    ? items
    : items.filter((item) => item.source_type === activeTab);

  const handleDraft = async (itemId: string) => {
    // In a real app, this would call an API to generate a draft card
    toast({
      title: 'Draft Created',
      description: 'AI has drafted a comment for you. Check your deck!',
    });
  };

  const handleDismiss = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  return (
    <PageShell
      title="Feed"
      toolbar={
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                  ? 'gradient-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Link
            to="/feed/sources"
            className="hidden h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-primary-foreground shadow-md gradient-primary transition-transform hover:scale-[1.02] sm:inline-flex"
          >
            <Radar className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Manage Sources</span>
            <span className="md:hidden">Sources</span>
          </Link>
        </div>
      }
    >
      <Link
        to="/feed/sources"
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-lg gradient-primary transition-transform hover:scale-105 sm:hidden"
        aria-label="Manage Sources"
      >
        <Radar className="h-6 w-6" />
      </Link>

      <main className="space-y-4 py-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">Fetching latest updates...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <FeedItemCard
                item={item}
                onDraft={() => handleDraft(item.id)}
                onDismiss={() => handleDismiss(item.id)}
              />
            </motion.div>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/10 py-16 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">No feed items</h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              Add monitoring targets to see content from YouTube, LinkedIn, and RSS feeds.
            </p>
          </motion.div>
        )}
      </main>
    </PageShell>
  );
}
