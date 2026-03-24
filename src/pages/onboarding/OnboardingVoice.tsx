import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { FixedBottomContainer } from '@/components/FixedBottomContainer';
import { ApiClient } from '@/lib/api-client';

export default function OnboardingVoice() {
  const navigate = useNavigate();
  const { goal, setVoice, setStep } = useOnboardingStore();

  const [length, setLength] = useState(50);
  const [tone, setTone] = useState(50);
  const [emoji, setEmoji] = useState(33);

  const [previewMessage, setPreviewMessage] = useState('Hi John, checking in on the project status.');
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchPreview = async (l: number, t: number, e: number) => {
    setIsLoading(true);
    try {
      const data = await ApiClient.post('/ai/preview-message', {
        length: l,
        tone: t,
        emoji: e
      });
      if (data?.message) {
        setPreviewMessage(data.message);
      }
    } catch (err) {
      console.error('Failed to fetch AI preview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasInteracted) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchPreview(length, tone, emoji);
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [length, tone, emoji, hasInteracted]);

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
      navigate('/onboarding/trial');
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
          <span className="text-sm text-muted-foreground">Step 3 of 6</span>
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
              <div className="bg-card rounded-xl shadow-lg p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Live Preview
                  </p>
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center text-[10px] text-primary font-medium uppercase tracking-wider"
                    >
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Generating...
                    </motion.div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  To: John Smith
                </p>

                <div className="relative min-h-[100px]">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-primary/5 rounded-lg"
                      >
                        <motion.div
                          animate={{ opacity: [0.4, 0.7, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          className="text-sm font-medium text-primary"
                        >
                          Generating preview...
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-primary/10 rounded-lg p-4"
                      >
                        <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                          {previewMessage}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Fixed bottom button */}
      <FixedBottomContainer show={true}>
        <Button
          onClick={handleNext}
          disabled={!hasInteracted || isLoading}
          className="w-full h-12 rounded-xl font-semibold gradient-primary text-primary-foreground disabled:opacity-50"
        >
          Next →
        </Button>
      </FixedBottomContainer>
    </div>
  );
}
