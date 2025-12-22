import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { FixedBottomContainer } from '@/components/FixedBottomContainer';

const messageVariants = [
  { length: 'concise', tone: 'professional', emoji: 'never', text: 'Hi John, checking in on the project status.' },
  { length: 'concise', tone: 'casual', emoji: 'never', text: 'Hey John, quick check-in?' },
  { length: 'concise', tone: 'casual', emoji: 'tasteful', text: 'Hey John! 👋 Quick check-in?' },
  { length: 'detailed', tone: 'professional', emoji: 'never', text: "Hi John, I hope this message finds you well. I wanted to check in regarding the project status and see if there's anything you need from my end." },
  { length: 'detailed', tone: 'professional', emoji: 'tasteful', text: "Hi John, I hope this message finds you well! 😊 I wanted to check in regarding the project status and see if there's anything you need from my end." },
  { length: 'detailed', tone: 'casual', emoji: 'tasteful', text: "Hey John! 👋 Hope you're crushing it! Wanted to check in on the project. How's everything going on your end? Let me know if you need anything!" },
  { length: 'detailed', tone: 'casual', emoji: 'heavy', text: "Hey John! 👋😊 Hope you're crushing it! 🚀 Wanted to check in on the project. How's everything going on your end? 💪 Let me know if you need anything! 🙌" },
];

export default function OnboardingVoice() {
  const navigate = useNavigate();
  const { goal, setVoice, setStep } = useOnboardingStore();
  const [length, setLength] = useState(50);
  const [tone, setTone] = useState(50);
  const [emoji, setEmoji] = useState(33);
  const [hasInteracted, setHasInteracted] = useState(false);

  const previewMessage = useMemo(() => {
    const lengthType = length < 50 ? 'concise' : 'detailed';
    const toneType = tone < 50 ? 'professional' : 'casual';
    const emojiType = emoji < 33 ? 'never' : emoji < 66 ? 'tasteful' : 'heavy';

    const match = messageVariants.find(
      (v) => v.length === lengthType && v.tone === toneType && v.emoji === emojiType
    );

    return match?.text || messageVariants[0].text;
  }, [length, tone, emoji]);

  const handleSliderChange = (setter: (val: number) => void) => (value: number[]) => {
    setter(value[0]);
    setHasInteracted(true);
  };

  const handleNext = () => {
    setVoice({ length, tone, emoji });
    
    // Skip knowledge step if not grow_business
    if (goal === 'grow_business') {
      setStep(4);
      navigate('/onboarding/knowledge');
    } else {
      setStep(5);
      navigate('/onboarding/connections');
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
            onClick={() => navigate('/onboarding/profile')}
            className="text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back
          </Button>
          <span className="text-sm text-muted-foreground">Step 3 of 7</span>
          <div className="w-16" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            How do you sound in DMs?
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Your drafts should sound like YOU
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Sliders */}
            <div className="space-y-8">
              {/* Length */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">
                  Message Length
                </label>
                <Slider
                  value={[length]}
                  onValueChange={handleSliderChange(setLength)}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Concise</span>
                  <span>Detailed</span>
                </div>
              </div>

              {/* Tone */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">
                  Tone
                </label>
                <Slider
                  value={[tone]}
                  onValueChange={handleSliderChange(setTone)}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Professional</span>
                  <span>Casual</span>
                </div>
              </div>

              {/* Emoji */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">
                  Emoji Usage
                </label>
                <Slider
                  value={[emoji]}
                  onValueChange={handleSliderChange(setEmoji)}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Never</span>
                  <span>Tasteful</span>
                  <span>Heavy</span>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="md:sticky md:top-32">
              <div className="bg-card rounded-xl shadow-lg p-6">
                <p className="text-sm font-medium text-muted-foreground mb-4">
                  Live Preview
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  To: John Smith
                </p>
                <motion.div
                  key={previewMessage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-primary/10 rounded-lg p-4"
                >
                  <p className="text-base text-foreground leading-relaxed">
                    {previewMessage}
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Fixed bottom button */}
      <FixedBottomContainer show={true}>
        <Button
          onClick={handleNext}
          disabled={!hasInteracted}
          className="w-full h-12 rounded-xl font-semibold gradient-primary text-primary-foreground disabled:opacity-50"
        >
          Next →
        </Button>
      </FixedBottomContainer>
    </div>
  );
}
