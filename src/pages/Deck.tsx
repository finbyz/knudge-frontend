import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, PartyPopper, Loader2, Sparkles, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SwipeableCard } from '@/components/SwipeableCard';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/layout/PageShell';
import { deckApi, DeckItem } from '@/api/deck';
import { ActionCard } from '@/types';

function DeckQueueToolbar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Queue</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {current}
            <span className="font-medium text-muted-foreground"> / {total}</span>
          </p>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>Progress</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-full bg-muted shadow-inner">
          <motion.div
            className="h-full rounded-full gradient-primary shadow-sm"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          />
        </div>
      </div>
    </div>
  );
}

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
  priority: 'medium',
  subject: item.content_payload.subject,
  circleName: item.content_payload.circle_name,
  circleAgenda: item.content_payload.circle_agenda,
});

export default function Deck() {
  const [cards, setCards] = useState<ActionCard[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeck();
  }, []);

  const [hasTriggeredOnboarding, setHasTriggeredOnboarding] = useState(false);

  const loadDeck = async () => {
    setLoading(true);
    try {
      const items = await deckApi.getDeck();

      if (items.length === 0 && !hasTriggeredOnboarding) {
        setHasTriggeredOnboarding(true);
        try {
          await deckApi.generateOnboardingCards();
          const freshItems = await deckApi.getDeck();
          setCards(freshItems.map(mapDeckItemToCard));
          setLoading(false);
          return;
        } catch (e) {
          console.error('Failed to generate onboarding cards', e);
        }
      }

      setCards(items.map(mapDeckItemToCard));
    } catch (error) {
      console.error('Failed to load deck:', error);
      toast.error('Failed to load action cards.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipeRight = async (cardId: string, data?: { draft: string; subject?: string } | string) => {
    const card = cards.find((c) => c.id === cardId);
    setCards((prev) => prev.filter((c) => c.id !== cardId));

    if (card) {
      toast.success(`Message sent to ${card.contact.name}! ✨`);
      setCompletedCount((prev) => prev + 1);

      try {
        let payload: Record<string, string> = {};
        if (typeof data === 'string') {
          if (data) payload.draft_text = data;
        } else if (data) {
          if (data.draft) payload.draft_text = data.draft;
          if (data.subject) payload.subject = data.subject;
        }

        await deckApi.swipe(cardId, 'EXECUTE', Object.keys(payload).length > 0 ? payload : undefined);
      } catch (error) {
        console.error('Failed to execute card:', error);
        toast.error('Failed to process action. Please try again.');
      }
    }
  };

  const handleSwipeLeft = async (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    try {
      await deckApi.swipe(cardId, 'SNOOZE');
    } catch (error) {
      console.error('Failed to snooze card:', error);
    }
  };

  const isEmpty = cards.length === 0;
  const totalCards = cards.length + completedCount;
  const currentIndex = totalCards - cards.length + 1;

  if (loading) {
    return (
      <PageShell title="Deck">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 py-16">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" style={{ animationDuration: '1.5s' }} />
            <Loader2 className="relative h-11 w-11 animate-spin text-primary" aria-hidden />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Loading your deck</p>
            <p className="mt-1 text-xs text-muted-foreground">Fetching AI suggestions…</p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Deck"
      className="pb-20"
      toolbar={!isEmpty ? <DeckQueueToolbar current={currentIndex} total={totalCards} /> : undefined}
    >
      <main className="flex w-full min-w-0 flex-col">
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto flex w-full max-w-md flex-col items-center rounded-3xl border border-dashed border-border/70 bg-gradient-to-b from-muted/40 to-background px-8 py-16 text-center shadow-sm"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 22 }}
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl gradient-success shadow-lg shadow-success/20"
            >
              {completedCount > 0 ? (
                <PartyPopper className="h-10 w-10 text-success-foreground" aria-hidden />
              ) : (
                <Inbox className="h-9 w-9 text-success-foreground" aria-hidden />
              )}
            </motion.div>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {completedCount > 0 ? "You're all caught up" : 'Nothing in your deck'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {completedCount > 0
                ? `You sent ${completedCount} message${completedCount > 1 ? 's' : ''} from this session. New suggestions will land here when they're ready.`
                : 'When Knudge drafts outreach for you, cards appear here. Swipe or tap to send or snooze.'}
            </p>
            <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild className="gradient-primary border-0 text-primary-foreground shadow-md">
                <Link to="/">Back to overview</Link>
              </Button>
              <Button asChild variant="outline" className="border-border/80 bg-background">
                <Link to="/inbox">Open inbox</Link>
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="relative flex min-h-[min(72dvh,calc(100dvh-14rem))] w-full flex-1 flex-col">
            <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-left">
              Drag the card · Snooze left · Send right
            </p>
            <div className="relative min-h-0 flex-1">
              <AnimatePresence mode="popLayout">
                {cards.slice(0, 4).reverse().map((card, index, arr) => {
                  const isTop = index === arr.length - 1;
                  const stackIndex = arr.length - 1 - index;
                  const uniqueKey = `card-${card.id}-${cards.length}-${isTop ? 'top' : stackIndex}`;

                  return (
                    <SwipeableCard
                      key={uniqueKey}
                      card={card}
                      onSwipeRight={(data) => handleSwipeRight(card.id, data)}
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
    </PageShell>
  );
}
