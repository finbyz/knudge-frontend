import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Check, PartyPopper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SwipeableCard } from '@/components/SwipeableCard';
import { mockActionCards } from '@/data/mockData';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className="h-5 w-5 rotate-90" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <div className="text-center">
            <span className="font-semibold text-foreground">The Deck</span>
            {!isEmpty && (
              <p className="text-xs text-muted-foreground">
                {currentIndex} of {totalCards}
              </p>
            )}
          </div>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Progress bar */}
        {!isEmpty && (
          <div className="h-1 bg-muted">
            <motion.div
              className="h-full gradient-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(currentIndex / totalCards) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </header>

      {/* Card Stack */}
      <main className="flex-1 relative overflow-hidden">
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
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
          <div className="absolute inset-0 pt-6">
            <AnimatePresence mode="popLayout">
              {cards.slice(0, 3).map((card, index) => (
                <SwipeableCard
                  key={card.id}
                  card={card}
                  onSwipeRight={() => handleSwipeRight(card.id)}
                  onSwipeLeft={() => handleSwipeLeft(card.id)}
                  isTop={index === 0}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Counter badge */}
      {!isEmpty && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2">
          <div className="px-4 py-2 rounded-full bg-card shadow-elevated border border-border">
            <span className="text-sm font-medium text-foreground">
              {cards.length} remaining
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
