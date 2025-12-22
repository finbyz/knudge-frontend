import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Zap, PartyPopper } from 'lucide-react';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { cn } from '@/lib/utils';

const steps = [
  { id: 1, text: 'Analyzing contacts', icon: '🔍' },
  { id: 2, text: 'Checking last contacted', icon: '📅' },
  { id: 3, text: 'Generating AI drafts', icon: '✨' },
];

export default function OnboardingComplete() {
  const navigate = useNavigate();
  const { completeOnboarding } = useOnboardingStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length) {
          return prev + 1;
        }
        return prev;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentStep === steps.length) {
      setTimeout(() => {
        setIsComplete(true);
        completeOnboarding();
        
        setTimeout(() => {
          navigate('/deck');
        }, 1500);
      }, 500);
    }
  }, [currentStep, completeOnboarding, navigate]);

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-purple-500 to-secondary flex items-center justify-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-32 bg-white/5 rounded-full"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              scale: 0,
            }}
            animate={{ 
              scale: [0, 1, 0],
              opacity: [0, 0.5, 0],
            }}
            transition={{ 
              duration: 4,
              delay: i * 0.5,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md px-6 text-center"
      >
        <AnimatePresence mode="wait">
          {!isComplete ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Loading icon */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center"
              >
                <Zap className="h-10 w-10 text-white" />
              </motion.div>

              <h1 className="text-2xl font-bold text-white mb-8">
                ⚡ Generating your first Deck...
              </h1>

              {/* Progress bar */}
              <div className="w-full bg-white/20 rounded-full h-2 mb-8 overflow-hidden">
                <motion.div
                  className="h-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* Steps */}
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const isActive = index < currentStep;
                  const isCurrent = index === currentStep;

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ 
                        opacity: isActive || isCurrent ? 1 : 0.4,
                        x: 0,
                      }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 justify-center"
                    >
                      {isActive ? (
                        <Check className="h-5 w-5 text-white" />
                      ) : isCurrent ? (
                        <Loader2 className="h-5 w-5 text-white/70 animate-spin" />
                      ) : (
                        <span className="text-white/50">⏳</span>
                      )}
                      <span
                        className={cn(
                          'text-lg',
                          isActive ? 'text-white' : 'text-white/70'
                        )}
                      >
                        {step.icon} {step.text}
                        {isActive && ' ✓'}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
              >
                <PartyPopper className="h-12 w-12 text-white" />
              </motion.div>

              <h1 className="text-3xl font-bold text-white mb-2">
                All set! 🎉
              </h1>
              <p className="text-lg text-white/80">
                Redirecting to your deck...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
