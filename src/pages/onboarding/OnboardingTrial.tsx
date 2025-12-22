import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, CreditCard, Sparkles, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { FixedBottomContainer } from '@/components/FixedBottomContainer';

type FormMode = 'payment' | 'invite';

export default function OnboardingTrial() {
  const navigate = useNavigate();
  const { setTrial, setStep } = useOnboardingStore();
  const [mode, setMode] = useState<FormMode>('payment');
  const [loading, setLoading] = useState(false);
  
  // Payment form
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  
  // Invite code
  const [inviteCode, setInviteCode] = useState('');

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setTrial({ subscribed: true });
    setStep(7);
    navigate('/onboarding/complete');
  };

  const handleInviteSubmit = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setTrial({ subscribed: true, inviteCode });
    setStep(7);
    navigate('/onboarding/complete');
  };

  const isPaymentValid = cardNumber.length >= 19 && expiry.length === 5 && cvc.length >= 3 && name.length > 0;
  const isInviteValid = inviteCode.length >= 6;

  return (
    <div className="min-h-screen bg-muted flex flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/onboarding/connections')}
            className="text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back
          </Button>
          <span className="text-sm text-muted-foreground">Step 6 of 7</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStep(7);
              navigate('/onboarding/complete');
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Ready to start Knudging?
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Start your free trial today
          </p>

          {/* Offer card */}
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">
                15-Day Free Trial
              </h3>
            </div>

            <ul className="space-y-2 mb-4">
              <li className="flex items-center gap-2 text-foreground">
                <Check className="h-4 w-4 text-success" />
                First 50 AI drafts free
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <Check className="h-4 w-4 text-success" />
                Cancel anytime
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <Check className="h-4 w-4 text-success" />
                No commitment
              </li>
            </ul>

            <p className="text-sm text-muted-foreground">
              After trial: $29/month
            </p>
          </div>

          {mode === 'payment' ? (
            <>
              {/* Payment form */}
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Card Number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                    className="pl-12 h-14 rounded-xl border-2 border-border focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                    className="h-14 rounded-xl border-2 border-border focus:border-primary"
                  />
                  <Input
                    placeholder="CVC"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                    className="h-14 rounded-xl border-2 border-border focus:border-primary"
                  />
                </div>

                <Input
                  placeholder="Name on Card"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 rounded-xl border-2 border-border focus:border-primary"
                />
              </div>

              {/* OR Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-muted px-2 text-muted-foreground">OR</span>
                </div>
              </div>

              <button
                onClick={() => setMode('invite')}
                className="text-sm text-primary hover:underline w-full text-center mb-6"
              >
                Have an organization invite code?
              </button>
            </>
          ) : (
            <>
              {/* Invite code form */}
              <div className="space-y-4 mb-6">
                <Input
                  placeholder="Enter Invite Code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="h-14 rounded-xl border-2 border-border focus:border-primary text-center text-lg tracking-wider"
                />
              </div>

              <button
                onClick={() => setMode('payment')}
                className="text-sm text-muted-foreground hover:text-foreground w-full text-center mb-6"
              >
                ← Back to payment
              </button>
            </>
          )}

          <p className="text-xs text-muted-foreground text-center">
            We'll remind you 3 days before trial ends. No surprises.
          </p>
        </motion.div>
      </main>

      {/* Fixed bottom button */}
      <FixedBottomContainer show={true}>
        {mode === 'payment' ? (
          <Button
            onClick={handleSubmit}
            disabled={!isPaymentValid || loading}
            className="w-full h-12 rounded-xl font-semibold gradient-primary text-primary-foreground disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting up your account...
              </>
            ) : (
              'Start Free Trial →'
            )}
          </Button>
        ) : (
          <Button
            onClick={handleInviteSubmit}
            disabled={!isInviteValid || loading}
            className="w-full h-12 rounded-xl font-semibold gradient-primary text-primary-foreground disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining organization...
              </>
            ) : (
              'Join Organization'
            )}
          </Button>
        )}
      </FixedBottomContainer>
    </div>
  );
}
