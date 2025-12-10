import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboardingStore, GoalType } from '@/stores/onboardingStore';
import { FixedBottomContainer } from '@/components/FixedBottomContainer';
import { cn } from '@/lib/utils';

const goals = [
  {
    id: 'grow_business' as GoalType,
    emoji: '🚀',
    title: 'Grow my Business',
    description: 'Manage investors, leads, and clients',
    tag: 'CRM Mode',
  },
  {
    id: 'build_brand' as GoalType,
    emoji: '🤝',
    title: 'Build my Brand',
    description: 'Network, create content, grow audience',
    tag: 'Personal Brand',
  },
  {
    id: 'stay_connected' as GoalType,
    emoji: '☕',
    title: 'Stay in Touch',
    description: 'Connect with friends and family',
    tag: 'Casual Mode',
  },
];

export default function OnboardingGoal() {
  const navigate = useNavigate();
  const { setGoal, setStep } = useOnboardingStore();
  const [selected, setSelected] = useState<GoalType>(null);

  const handleNext = () => {
    if (selected) {
      setGoal(selected);
      setStep(2);
      navigate('/onboarding/profile');
    }
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/onboarding/login')}
            className="text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back
          </Button>
          <span className="text-sm text-muted-foreground">Step 1 of 7</span>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            What is your main goal for Knudge?
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            This helps us personalize your experience
          </p>

          {/* Goal cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {goals.map((goal) => (
              <motion.button
                key={goal.id}
                onClick={() => setSelected(goal.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'bg-card rounded-xl shadow-md hover:shadow-xl transition-all p-6 text-left border-2 cursor-pointer',
                  selected === goal.id
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent'
                )}
              >
                <div className="text-5xl mb-4">{goal.emoji}</div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {goal.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {goal.description}
                </p>
                <span className="inline-block px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                  {goal.tag}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Fixed bottom button */}
      <FixedBottomContainer show={!!selected}>
        <Button
          onClick={handleNext}
          className="w-full h-12 rounded-xl font-semibold gradient-primary text-primary-foreground"
        >
          Next
        </Button>
      </FixedBottomContainer>
    </div>
  );
}
