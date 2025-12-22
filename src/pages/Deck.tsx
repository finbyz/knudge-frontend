import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Check, PartyPopper, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SwipeableCard } from '@/components/SwipeableCard';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import { deckApi, DeckItem } from '@/api/deck';
import { ActionCard } from '@/types';

// Helper to map API data to UI format
const mapDeckItemToCard = (item: DeckItem): ActionCard => ({
  id: item.id,
  contact: item.contact
    ? {
      id: item.contact.id,
      name: item.contact.name,
      phone: item.contact.phone,
      email: item.contact.email,
      avatar: item.contact.avatar,
    }
    : {
      id: item.id,
      name: item.ui_title.replace('Reconnect with ', '') || 'Unknown Contact',
    },
  context: item.ui_subtitle,
  draft: item.content_payload.draft_text || '',
  platform: item.platform as ActionCard['platform'],
  createdAt: new Date(item.created_at || Date.now()).toLocaleDateString(),
  priority: 'medium'
});

export default function Deck() {
  const [cards, setCards] = useState<ActionCard[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeck();
  }, []);

  const loadDeck = async () => {
    try {
      const items = await deckApi.getDeck();
      const mappedCards = items.map(mapDeckItemToCard);
      setCards(mappedCards);
    } catch (error) {
      console.error("Failed to load deck:", error);
      toast.error("Failed to load action cards.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwipeRight = async (cardId: string, updatedDraft?: string) => {
    // Optimistic UI update
    const card = cards.find((c) => c.id === cardId);
    setCards((prev) => prev.filter((c) => c.id !== cardId));

    if (card) {
      toast.success(`Message sent to ${card.contact.name}! ✨`);
      setCompletedCount((prev) => prev + 1);

      try {
        // Send EXECUTE action with updated draft if edited
        await deckApi.swipe(cardId, 'EXECUTE', updatedDraft ? { draft_text: updatedDraft } : undefined);
      } catch (error) {
        console.error("Failed to execute card:", error);
        toast.error("Failed to process action. Please try again.");
        // Revert optimistic update? For now, we assume success or reload.
      }
    }
  };

  const handleSwipeLeft = async (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    try {
      await deckApi.swipe(cardId, 'SNOOZE');
    } catch (error) {
      console.error("Failed to snooze card:", error);
    }
  };

  const isEmpty = cards.length === 0;
  const totalCards = cards.length + completedCount; // Approx total
  const currentIndex = totalCards - cards.length + 1;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopBar title="Deck" />

      {/* Progress bar - below TopBar */}
      {!isEmpty && (
        <div className="sticky top-16 z-40 h-1 bg-muted">
          <motion.div
            className="h-full gradient-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(currentIndex / totalCards) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
          <div className="absolute right-4 top-2 text-xs text-muted-foreground">
            {currentIndex} of {totalCards}
          </div>
        </div>
      )}

      {/* Card Stack */}
      <main className="px-4 pt-2 pb-2">
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center px-8 text-center py-20"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="h-20 w-20 rounded-full gradient-success flex items-center justify-center mb-6"
            >
              {completedCount > 0 ? (
                <PartyPopper className="h-10 w-10 text-success-foreground" />
              ) : (
                <Check className="h-10 w-10 text-success-foreground" />
              )}
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {completedCount > 0 ? 'All Done!' : 'No Pending Messages'}
            </h2>
            <p className="text-muted-foreground mb-8">
              {completedCount > 0
                ? `You've sent ${completedCount} message${completedCount > 1 ? 's' : ''} today. Great job staying connected!`
                : 'Check back later for AI-generated message suggestions.'}
            </p>
            <Link to="/">
              <Button className="gradient-primary text-primary-foreground border-0">
                Back to Dashboard
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="relative" style={{ height: 'calc(100vh - 160px)' }}>
            {/* Cards stack container */}
            <div className="relative w-full h-full">
              <AnimatePresence mode="popLayout">
                {cards.slice(0, 4).reverse().map((card, index, arr) => {
                  const isTop = index === arr.length - 1;
                  const stackIndex = arr.length - 1 - index;
                  // Use unique key with card.id and stack position to force Brave mobile remount
                  const uniqueKey = `card-${card.id}-${cards.length}-${isTop ? 'top' : stackIndex}`;

                  return (
                    <SwipeableCard
                      key={uniqueKey}
                      card={card}
                      onSwipeRight={(draft) => handleSwipeRight(card.id, draft)}
                      onSwipeLeft={() => handleSwipeLeft(card.id)}
                      isTop={isTop}
                      stackIndex={stackIndex}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
