import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Loader2, CheckCircle2, Circle, AlertCircle, MapPin, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FixedBottomContainer } from '@/components/FixedBottomContainer';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { researchApi, UserResearchProfile } from '@/api/research';
import { authApi } from '@/api/auth';

// ---- Helpers -----------------------------------------------------------

/** Render [[highlighted]] text as colored spans */
function renderHighlights(text: string): React.ReactNode {
  const parts = text.split(/(\[\[.*?\]\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const word = part.slice(2, -2);
      return (
        <span key={i} className="text-primary font-semibold">
          {word}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ---- Loading steps ----------------------------------------------------

const LOADING_STEPS = [
  { label: 'Fetching LinkedIn profile…', duration: 3000 },
  { label: 'Building your Digital Twin…', duration: 5000 },
  { label: 'Setting up Knowledge Base…', duration: 2000 },
];

// -----------------------------------------------------------------------

interface FormData {
  firstName: string;
  lastName: string;
  linkedinUrl: string;
  company: string;
  jobTitle: string;
}

export default function OnboardingProfile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { goal, setStep } = useOnboardingStore();

  const [form, setForm] = useState<FormData>({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    linkedinUrl: user?.linkedin_url || '',
    company: '',
    jobTitle: '',
  });

  const [phase, setPhase] = useState<'form' | 'loading' | 'result' | 'error'>('form');
  const [loadingStep, setLoadingStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([false, false, false]);
  const [research, setResearch] = useState<UserResearchProfile | null>(null);
  const [showFullBio, setShowFullBio] = useState(false);
  const [error, setError] = useState('');

  // ---- Progress simulation (runs while API is in-flight) -----------

  const runLoadingAnimation = () => {
    let step = 0;
    setLoadingStep(0);
    setCompletedSteps([false, false, false]);

    const advance = () => {
      if (step < LOADING_STEPS.length - 1) {
        setTimeout(() => {
          step++;
          setLoadingStep(step);
          setCompletedSteps(prev => {
            const next = [...prev];
            next[step - 1] = true;
            return next;
          });
          advance();
        }, LOADING_STEPS[step].duration);
      }
    };
    advance();
  };

  // ---- Submit -------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.linkedinUrl && !form.firstName && !form.lastName) {
      setError('Please enter your LinkedIn URL or at least your name.');
      return;
    }

    setError('');
    setPhase('loading');
    runLoadingAnimation();

    try {
      const result = await researchApi.researchUserProfile(
        form.linkedinUrl || undefined,
        undefined,
        {
          firstName: form.firstName,
          lastName: form.lastName,
          company: form.company,
          jobTitle: form.jobTitle,
        }
      );

      // Mark all steps complete
      setCompletedSteps([true, true, true]);
      setLoadingStep(2);

      // Small delay so user sees the final step tick
      setTimeout(() => {
        setResearch(result);
        setPhase('result');

        // Refresh user in global store (photo_url may have changed)
        authApi.getMe().then(setUser).catch(() => { });
      }, 800);
    } catch (err: unknown) {
      console.error('[OnboardingProfile] research error:', err);
      setPhase('error');
      setError('Research failed. Please check your LinkedIn URL and try again.');
    }
  };

  // ---- Skip ---------------------------------------------------------

  const goToNextStep = () => {
    setStep(3);
    navigate('/onboarding/voice');
  };

  const handleSkip = async () => {
    // Save name if provided
    if (form.firstName || form.lastName) {
      try {
        const updated = await authApi.updateMe({
          first_name: form.firstName,
          last_name: form.lastName,
          linkedin_url: form.linkedinUrl,
        });
        setUser(updated);
      } catch {
        // non-fatal
      }
    }
    goToNextStep();
  };

  // ---- Render: Loading Phase -----------------------------------------

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-muted flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-foreground mb-8">Building your Digital Twin…</h2>
          <div className="space-y-4 text-left">
            {LOADING_STEPS.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.3 }}
                className="flex items-center gap-3"
              >
                {completedSteps[idx] ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : idx === loadingStep ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span className={`text-sm ${completedSteps[idx] ? 'text-foreground' : idx === loadingStep ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ---- Render: Result Phase ------------------------------------------

  if (phase === 'result' && research) {
    return (
      <div className="min-h-screen bg-muted flex flex-col pb-24">
        <header className="sticky top-0 z-40 bg-background border-b border-border px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setPhase('form')} className="text-muted-foreground">
              <ChevronLeft className="h-5 w-5 mr-1" />
              Edit
            </Button>
            <span className="text-sm text-muted-foreground">Step 2 of 6</span>
            <div className="w-16" />
          </div>
        </header>

        <main className="flex-1 px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            {/* Profile Card */}
            <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
              {/* Header with photo */}
              <div className="p-6 flex items-center gap-5">
                {research.photo_url ? (
                  <img
                    src={research.photo_url}
                    alt="Profile"
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/20 flex-shrink-0"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-primary-foreground">
                      {(form.firstName?.[0] || 'U').toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-foreground truncate">
                    {research.headline || research.identity || `${form.firstName} ${form.lastName}`}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    {research.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {research.location}
                      </span>
                    )}
                    {research.connections && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {research.connections}+ connections
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary */}
              {research.short_summary && (
                <div className="px-6 pb-5 border-t border-border pt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Your Digital Twin</h3>
                  </div>
                  <p className="text-[15px] leading-relaxed text-foreground/90">
                    {renderHighlights(research.short_summary)}
                  </p>

                  {research.full_bio && (
                    <>
                      <AnimatePresence>
                        {showFullBio && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-sm text-muted-foreground italic leading-relaxed mt-4"
                          >
                            {research.full_bio}
                          </motion.p>
                        )}
                      </AnimatePresence>
                      <button
                        onClick={() => setShowFullBio(v => !v)}
                        className="text-primary text-sm font-medium mt-2 hover:underline"
                      >
                        {showFullBio ? 'Show less ↑' : 'Read full bio ↓'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Talking Points & Topics */}
              {(research.talking_points?.length > 0 || research.topics?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-border">
                  {research.talking_points?.length > 0 && (
                    <div className="p-5 border-b md:border-b-0 md:border-r border-border">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                        💬 Conversation Starters
                      </h4>
                      <ul className="space-y-2">
                        {research.talking_points.slice(0, 3).map((point, i) => (
                          <li key={i} className="text-sm text-foreground flex gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {research.topics?.length > 0 && (
                    <div className="p-5">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                        🏷️ Topics
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {research.topics.map((topic, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </main>

        <FixedBottomContainer show={true}>
          <Button
            onClick={goToNextStep}
            className="w-full h-12 rounded-xl font-semibold gradient-primary text-primary-foreground"
          >
            Looks good — Next →
          </Button>
        </FixedBottomContainer>
      </div>
    );
  }

  // ---- Render: Error Phase -------------------------------------------

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-muted flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => setPhase('form')} className="gradient-primary text-primary-foreground px-6">
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  // ---- Render: Form Phase --------------------------------------------

  return (
    <div className="min-h-screen bg-muted flex flex-col pb-24">
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
          <span className="text-sm text-muted-foreground">Step 2 of 6</span>
          <div className="w-16" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🧬</div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Build Your Digital Twin</h1>
            <p className="text-lg text-muted-foreground">
              We'll create a rich profile that helps Knudge write personalised messages on your behalf.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="text-sm font-medium text-foreground mb-1.5 block">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Jhon"
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full h-11 px-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="text-sm font-medium text-foreground mb-1.5 block">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Deo"
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full h-11 px-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>
            </div>

            {/* LinkedIn URL */}
            <div>
              <label htmlFor="linkedinUrl" className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                LinkedIn URL
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-wide">
                  Best results
                </span>
              </label>
              <input
                id="linkedinUrl"
                type="url"
                placeholder="https://linkedin.com/in/your-profile"
                value={form.linkedinUrl}
                onChange={e => setForm(f => ({ ...f, linkedinUrl: e.target.value }))}
                className="w-full h-11 px-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>

            {/* Job / Company row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="jobTitle" className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                  Job Title
                  <span className="text-xs text-muted-foreground font-normal">optional</span>
                </label>
                <input
                  id="jobTitle"
                  type="text"
                  placeholder="Software Developer"
                  value={form.jobTitle}
                  onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))}
                  className="w-full h-11 px-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>
              <div>
                <label htmlFor="company" className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                  Company
                  <span className="text-xs text-muted-foreground font-normal">optional</span>
                </label>
                <input
                  id="company"
                  type="text"
                  placeholder="FinByz Tech"
                  value={form.company}
                  onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  className="w-full h-11 px-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </form>
        </motion.div>
      </main>

      {/* Bottom actions */}
      <FixedBottomContainer show={true}>
        <div className="space-y-3">
          <Button
            onClick={handleSubmit as any}
            className="w-full h-12 rounded-xl font-semibold gradient-primary text-primary-foreground"
          >
            Analyse My Profile ✨
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="w-full text-muted-foreground"
          >
            Skip for now
          </Button>
        </div>
      </FixedBottomContainer>
    </div>
  );
}
