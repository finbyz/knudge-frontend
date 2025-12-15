import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Search, Loader2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSourcesStore, Platform, IntentType, SourceGroup } from '@/stores/sourcesStore';
import { PlatformIcon, getPlatformName } from '@/components/sources/PlatformIcon';
import { IntentConfigModal } from '@/components/sources/IntentConfigModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Mock search results generator
const generateMockResults = (query: string, platform?: Platform): SearchResult[] => {
  if (!query || query.length < 2) return [];
  
  const allResults: SearchResult[] = [
    { id: '1', name: 'Alex Hormozi', platform: 'youtube', bio: 'Entrepreneur & Investor', followers: 2500000, activityFrequency: '4 posts/week' },
    { id: '2', name: 'Alex Hormozi', platform: 'linkedin', bio: 'CEO at Acquisition.com', followers: 450000, activityFrequency: '2 posts/week' },
    { id: '3', name: 'Alex Hormozi', platform: 'instagram', bio: 'Building Businesses', followers: 1800000, activityFrequency: '5 posts/week' },
    { id: '4', name: 'OpenAI', platform: 'linkedin', bio: 'AI Research Company', followers: 3200000, activityFrequency: '3 posts/week' },
    { id: '5', name: 'OpenAI', platform: 'youtube', bio: 'Official Channel', followers: 890000, activityFrequency: '1 post/week' },
    { id: '6', name: 'TechCrunch', platform: 'rss', bio: 'Technology News', followers: 0, activityFrequency: '20 posts/day' },
    { id: '7', name: 'The Verge', platform: 'rss', bio: 'Tech & Culture', followers: 0, activityFrequency: '15 posts/day' },
    { id: '8', name: 'Startup Founders', platform: 'whatsapp', bio: 'Community Group', followers: 0, activityFrequency: '50 messages/day' },
    { id: '9', name: 'Tech Daily', platform: 'telegram', bio: 'Daily Tech Updates', followers: 125000, activityFrequency: '10 posts/day' },
    { id: '10', name: 'Elon Musk', platform: 'twitter', bio: 'CEO of Tesla & SpaceX', followers: 170000000, activityFrequency: '10 posts/day' },
  ];

  return allResults
    .filter(r => r.name.toLowerCase().includes(query.toLowerCase()))
    .filter(r => !platform || r.platform === platform)
    .slice(0, 6);
};

// URL platform detection
const detectPlatformFromUrl = (url: string): Platform | null => {
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('chat.whatsapp.com')) return 'whatsapp';
  if (url.includes('t.me')) return 'telegram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  return null;
};

interface SearchResult {
  id: string;
  name: string;
  platform: Platform;
  bio?: string;
  avatarUrl?: string;
  followers?: number;
  activityFrequency?: string;
}

const platformFilters: { id: Platform | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'rss', label: 'RSS' },
];

export default function AddSource() {
  const navigate = useNavigate();
  const { addSource } = useSourcesStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [urlDetectedResult, setUrlDetectedResult] = useState<SearchResult | null>(null);
  
  // Intent modal state
  const [showIntentModal, setShowIntentModal] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SearchResult | null>(null);

  // Check if input is a URL
  const isUrl = useMemo(() => {
    return /^(https?:\/\/|www\.)/.test(searchQuery) || searchQuery.includes('.com') || searchQuery.includes('.io');
  }, [searchQuery]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setUrlDetectedResult(null);
      return;
    }

    if (isUrl) {
      // URL detection
      setIsSearching(true);
      const platform = detectPlatformFromUrl(searchQuery);
      
      setTimeout(() => {
        if (platform) {
          setUrlDetectedResult({
            id: 'url-result',
            name: extractNameFromUrl(searchQuery),
            platform,
            bio: `${getPlatformName(platform)} Profile`,
            followers: Math.floor(Math.random() * 1000000),
            activityFrequency: '3 posts/week',
          });
        } else {
          setUrlDetectedResult(null);
        }
        setSearchResults([]);
        setIsSearching(false);
      }, 800);
    } else {
      // Text search
      const timer = setTimeout(() => {
        setIsSearching(true);
        setUrlDetectedResult(null);
        
        setTimeout(() => {
          const results = generateMockResults(
            searchQuery, 
            selectedPlatform === 'all' ? undefined : selectedPlatform
          );
          setSearchResults(results);
          setIsSearching(false);
        }, 600);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [searchQuery, selectedPlatform, isUrl]);

  const extractNameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const path = urlObj.pathname.split('/').filter(Boolean);
      return path[path.length - 1] || urlObj.hostname;
    } catch {
      return 'Unknown';
    }
  };

  const formatFollowers = (count?: number): string => {
    if (!count) return '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M followers`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K followers`;
    return `${count} followers`;
  };

  const handleSelectSource = (result: SearchResult) => {
    setSelectedSource(result);
    setShowIntentModal(true);
  };

  const handleSaveSource = (config: {
    intent: IntentType;
    options: {
      notifyOnShorts?: boolean;
      summarizeLongVideos?: boolean;
      inviteLink?: string;
    };
  }) => {
    if (!selectedSource) return;

    // Determine group based on intent
    const groupMap: Record<IntentType, SourceGroup> = {
      competitor: 'priority',
      lead: 'priority',
      influencer: 'inspiration',
      news: selectedSource.platform === 'whatsapp' || selectedSource.platform === 'telegram' 
        ? 'communities' 
        : 'inspiration',
    };

    addSource({
      name: selectedSource.name,
      platform: selectedSource.platform,
      url: isUrl ? searchQuery : `https://${selectedSource.platform}.com/${selectedSource.name.toLowerCase().replace(/\s/g, '')}`,
      avatarUrl: selectedSource.avatarUrl,
      bio: selectedSource.bio,
      metadata: {
        followers: selectedSource.followers,
        activityFrequency: selectedSource.activityFrequency,
      },
      intent: config.intent,
      group: groupMap[config.intent],
      isActive: true,
      options: config.options,
    });

    toast({
      title: `${selectedSource.name} added successfully`,
      description: 'You will now receive updates from this source',
    });

    setShowIntentModal(false);
    navigate('/feed/sources');
  };

  // Group results by platform for display
  const groupedResults = useMemo(() => {
    const groups: Record<Platform, SearchResult[]> = {
      youtube: [],
      linkedin: [],
      instagram: [],
      whatsapp: [],
      telegram: [],
      rss: [],
      twitter: [],
    };
    searchResults.forEach(r => groups[r.platform].push(r));
    return Object.entries(groups).filter(([, results]) => results.length > 0);
  }, [searchResults]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-sm h-16">
        <div className="flex items-center justify-between px-4 h-full max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Add Source</h1>
          <button
            onClick={() => navigate('/feed/sources')}
            className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="pt-20 px-4">
        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Paste a URL or search for a person/channel..."
            className="h-14 pl-12 pr-12 text-base rounded-xl border-2 focus:border-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Platform Filter Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
          {platformFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedPlatform(filter.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                selectedPlatform === filter.id
                  ? 'gradient-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isSearching && (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Searching across platforms...</p>
          </div>
        )}

        {/* URL Detected Result */}
        <AnimatePresence mode="wait">
          {urlDetectedResult && !isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6"
            >
              <div className="p-6 bg-card border-2 border-border rounded-2xl shadow-card">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                      {urlDetectedResult.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      <PlatformIcon platform={urlDetectedResult.platform} size="md" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1">{urlDetectedResult.name}</h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    {getPlatformName(urlDetectedResult.platform)} Profile
                  </p>
                  {urlDetectedResult.followers && (
                    <p className="text-xs text-muted-foreground mb-4">
                      {formatFollowers(urlDetectedResult.followers)}
                    </p>
                  )}
                  <Button
                    onClick={() => handleSelectSource(urlDetectedResult)}
                    className="w-full h-12 gradient-primary text-primary-foreground text-base"
                  >
                    <Check className="h-5 w-5 mr-2" />
                    Follow
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Results */}
        <AnimatePresence mode="wait">
          {searchResults.length > 0 && !isSearching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 space-y-4"
            >
              {groupedResults.map(([platform, results], groupIndex) => (
                <div key={platform}>
                  <h3 className="text-sm font-medium text-muted-foreground px-2 py-2 bg-muted/50 rounded-lg mb-2">
                    {getPlatformName(platform as Platform)} Results
                  </h3>
                  {results.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (groupIndex * results.length + index) * 0.05 }}
                      className="flex items-center gap-3 p-4 bg-card border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => handleSelectSource(result)}
                    >
                      <PlatformIcon platform={result.platform} size="md" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{result.name}</h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {result.bio} {result.followers ? `• ${formatFollowers(result.followers)}` : ''}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        className="h-9 w-9 rounded-full gradient-primary text-primary-foreground flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSource(result);
                        }}
                      >
                        <span className="text-lg font-bold">+</span>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* No Results */}
        {!isSearching && searchQuery.length >= 2 && !urlDetectedResult && searchResults.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
            <p className="text-sm text-muted-foreground mt-2">Try a different search term or paste a URL</p>
          </div>
        )}

        {/* Empty State */}
        {!searchQuery && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Search for people, channels, or paste a URL to get started
            </p>
          </div>
        )}
      </main>

      {/* Intent Configuration Modal */}
      <IntentConfigModal
        isOpen={showIntentModal}
        onClose={() => setShowIntentModal(false)}
        onSave={handleSaveSource}
        source={selectedSource ? {
          name: selectedSource.name,
          platform: selectedSource.platform,
          avatarUrl: selectedSource.avatarUrl,
          bio: selectedSource.bio,
          url: isUrl ? searchQuery : '',
        } : null}
      />
    </div>
  );
}
