import { useState } from 'react';
import { motion } from 'framer-motion';
import { FeedItemCard } from '@/components/FeedItemCard';
import { mockFeedItems } from '@/data/mockData';
import { toast } from '@/hooks/use-toast';

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'rss', label: 'RSS' },
];

export default function Feed() {
  const [activeTab, setActiveTab] = useState('all');
  const [items, setItems] = useState(mockFeedItems);

  const filteredItems = activeTab === 'all' 
    ? items 
    : items.filter((item) => item.type === activeTab);

  const handleDraft = (itemId: string) => {
    toast({
      title: 'Draft Created',
      description: 'AI has drafted a comment for you. Check your deck!',
    });
  };

  const handleDismiss = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-center px-4 h-16">
          <span className="font-semibold text-foreground">Feed Monitor</span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pb-3 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'gradient-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {filteredItems.length > 0 ? (
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
            className="text-center py-12"
          >
            <p className="text-muted-foreground">No feed items to display</p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
