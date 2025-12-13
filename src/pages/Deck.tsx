import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, PartyPopper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SwipeableCard } from '@/components/SwipeableCard';
import { mockActionCards } from '@/data/mockData';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';

export default function Deck() {
  const [cards, setCards] = useState(mockActionCards);
  const [completedCount, setCompletedCount] = useState(0);

  const handleSwipeRight = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (card) {
      toast({
        title: 'Message Sent! ✨',
        description: `Your message to ${card.contact.name} has been queued.`,
      });
      setCompletedCount((prev) => prev + 1);
    }
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const handleSwipeLeft = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const isEmpty = cards.length === 0;
  const totalCards = mockActionCards.length;
  const currentIndex = totalCards - cards.length + 1;

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
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
      <main className="px-4 pt-4 pb-4">
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
          <div className="relative" style={{ height: 'calc(100vh - 180px)' }}>
            {/* Cards stack container */}
            <AnimatePresence mode="popLayout">
              {cards.slice(0, 4).reverse().map((card, index, arr) => (
                <SwipeableCard
                  key={card.id}
                  card={card}
                  onSwipeRight={() => handleSwipeRight(card.id)}
                  onSwipeLeft={() => handleSwipeLeft(card.id)}
                  isTop={index === arr.length - 1}
                  stackIndex={arr.length - 1 - index}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
