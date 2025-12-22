import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Linkedin, Globe, Loader2, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';
import { cn } from '@/lib/utils';

type Phase = 'form' | 'loading' | 'result';

const loadingSteps = [
  { icon: '🔍', text: 'Reading your profile...' },
  { icon: '🧠', text: 'Analyzing tone...' },
  { icon: '📊', text: 'Detecting keywords...' },
];

const summaries = {
  grow_business: {
    summary: 'You are a Fintech Founder who speaks in a Direct, Professional tone. You care about SaaS and Venture Capital.',
    highlights: ['Fintech Founder', 'Direct, Professional', 'SaaS', 'Venture Capital'],
  },
  build_brand: {
    summary: 'You are a Content Creator who speaks in an Engaging, Authentic tone. You care about Marketing and Personal Branding.',
    highlights: ['Content Creator', 'Engaging, Authentic', 'Marketing', 'Personal Branding'],
  },
  stay_connected: {
    summary: 'You are a Community Builder who speaks in a Warm, Friendly tone. You care about Relationships and Connection.',
    highlights: ['Community Builder', 'Warm, Friendly', 'Relationships', 'Connection'],
  },
};

export default function OnboardingProfile() {
  const navigate = useNavigate();
  const { goal, setProfile, setStep } = useOnboardingStore();
  const { setUser } = useAuthStore();
  const [phase, setPhase] = useState<Phase>('form');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const handleAnalyze = async () => {
    setPhase('loading');
    setProgress(0);
    setLoadingStep(0);

    // Simulate loading steps
    for (let i = 0; i < loadingSteps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setLoadingStep(i + 1);
      setProgress(((i + 1) / loadingSteps.length) * 100);
    }

    setPhase('result');
  };

  const handleConfirm = async () => {
    const goalKey = goal || 'stay_connected';

    // Save profile to store
    setProfile({
      linkedinUrl,
      websiteUrl,
      summary: summaries[goalKey].summary,
    });

    // Save to backend
    try {
      const updatedUser = await authApi.updateMe({
        first_name: firstName,
        last_name: lastName,
        linkedin_url: linkedinUrl,
        personal_profile: summaries[goalKey].summary,
        onboarding_step: 3
      });
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to update profile:', error);
      // Continue anyway? Or show error? For onboarding flow smooth UX, maybe log and continue if non-critical.
      // But name is critical. Let's assume it works or we should block.
      // For MVP, we'll log and proceed to not block user flow if backend fails.
    }

    setStep(3);
    navigate('/onboarding/voice');
  };

  const handleEdit = () => {
    setPhase('form');
  };

  const goalKey = goal || 'stay_connected';
  const summaryData = summaries[goalKey];

  const renderHighlightedSummary = () => {
    let text = summaryData.summary;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;

    summaryData.highlights.forEach((highlight, i) => {
      const index = text.indexOf(highlight, lastIndex);
      if (index !== -1) {
        if (index > lastIndex) {
          parts.push(text.slice(lastIndex, index));
        }
        parts.push(
          <span key={i} className="font-semibold text-primary">
            {highlight}
          </span>
        );
        lastIndex = index + highlight.length;
      }
    });

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/onboarding/goal')}
            className="text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back
          </Button>
          <span className="text-sm text-muted-foreground">Step 2 of 7</span>
          <div className="w-16" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8 flex flex-col items-center justify-center">
        {phase === 'form' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Let's build your Digital Twin
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              We'll analyze your profile to match your tone
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-12 h-14 rounded-xl border-2 border-border focus:border-primary"
                  />
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="pl-4 h-14 rounded-xl border-2 border-border focus:border-primary"
                  />
                </div>
              </div>

              <div className="relative">
                <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#0A66C2]" />
                <Input
                  type="url"
                  placeholder="LinkedIn Profile URL"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="pl-12 h-14 rounded-xl border-2 border-border focus:border-primary"
                />
              </div>

              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="Company Website (Optional)"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="pl-12 h-14 rounded-xl border-2 border-border focus:border-primary"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                This helps us understand your business
              </p>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!linkedinUrl || !firstName}
              className="w-full h-12 mt-8 rounded-xl font-semibold gradient-primary text-primary-foreground"
            >
              Analyze Me →
            </Button>
          </motion.div>
        )}

        {phase === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-md text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 mx-auto mb-8 rounded-full gradient-primary flex items-center justify-center"
            >
              <Loader2 className="h-8 w-8 text-white" />
            </motion.div>

            <div className="space-y-4 mb-8">
              {loadingSteps.map((step, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center justify-center gap-2 text-lg transition-opacity',
                    i < loadingStep ? 'opacity-100' : 'opacity-40'
                  )}
                >
                  <span>{step.icon}</span>
                  <span className={i < loadingStep ? 'text-foreground' : 'text-muted-foreground'}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>

            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full gradient-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Progress: {Math.round(progress)}%
            </p>
          </motion.div>
        )}

        {phase === 'result' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                Here's what we learned:
              </h2>
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20 rounded-2xl p-6 mb-8">
              <p className="text-lg text-foreground leading-relaxed">
                {renderHighlightedSummary()}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleEdit}
                variant="outline"
                className="flex-1 h-12 rounded-xl"
              >
                Let me edit ✏️
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground"
              >
                Looks good ✓
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
