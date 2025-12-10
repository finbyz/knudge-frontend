import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Chrome, Linkedin, Mail, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { FixedBottomContainer } from '@/components/FixedBottomContainer';
import { cn } from '@/lib/utils';

interface Connection {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  contactCount?: number;
}

const connectionOptions: Connection[] = [
  {
    id: 'google',
    name: 'Google Contacts',
    description: 'Quick and easy contact sync',
    icon: <Chrome className="h-6 w-6" />,
    iconBg: 'bg-white border border-border',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Network',
    description: 'Import professional contacts',
    icon: <Linkedin className="h-6 w-6 text-white" />,
    iconBg: 'bg-[#0A66C2]',
  },
  {
    id: 'gmail',
    name: 'Gmail/Outlook',
    description: 'Draft emails automatically',
    icon: <Mail className="h-6 w-6" />,
    iconBg: 'bg-muted',
  },
];

export default function OnboardingConnections() {
  const navigate = useNavigate();
  const { goal, connections, addConnection, setStep } = useOnboardingStore();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [contactCounts, setContactCounts] = useState<Record<string, number>>({});

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId);
    
    // Simulate OAuth connection
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    const randomCount = Math.floor(Math.random() * 250) + 250; // 250-500
    setContactCounts((prev) => ({ ...prev, [platformId]: randomCount }));
    addConnection(platformId);
    setConnecting(null);
  };

  const handleNext = () => {
    setStep(6);
    navigate('/onboarding/trial');
  };

  const handleBack = () => {
    if (goal === 'grow_business') {
      navigate('/onboarding/knowledge');
    } else {
      navigate('/onboarding/voice');
    }
  };

  const isConnected = (id: string) => connections.includes(id);
  const canProceed = connections.length >= 1;

  return (
    <div className="min-h-screen bg-muted flex flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back
          </Button>
          <span className="text-sm text-muted-foreground">Step 5 of 7</span>
          <div className="w-16" />
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
            Where do your people live?
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Connect at least one source to continue
          </p>

          {/* Connection cards */}
          <div className="space-y-4 mb-8">
            {connectionOptions.map((connection) => {
              const connected = isConnected(connection.id);
              const isConnecting = connecting === connection.id;

              return (
                <motion.div
                  key={connection.id}
                  layout
                  className={cn(
                    'bg-card rounded-xl shadow-md p-6 border-2 transition-colors',
                    connected ? 'border-success bg-success/5' : 'border-border'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-lg flex items-center justify-center',
                        connection.iconBg
                      )}
                    >
                      {connection.icon}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {connection.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {connection.description}
                      </p>
                      <AnimatePresence>
                        {connected && contactCounts[connection.id] && (
                          <motion.p
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-sm font-medium text-success mt-1"
                          >
                            ✓ Found {contactCounts[connection.id]} contacts
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <Button
                      onClick={() => handleConnect(connection.id)}
                      disabled={connected || isConnecting}
                      className={cn(
                        'min-w-[120px]',
                        connected
                          ? 'bg-success text-white hover:bg-success'
                          : 'gradient-primary text-primary-foreground'
                      )}
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : connected ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Connected
                        </>
                      ) : (
                        'Connect →'
                      )}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            We never message anyone without your permission
          </p>
        </motion.div>
      </main>

      {/* Fixed bottom button */}
      <FixedBottomContainer show={true}>
        <Button
          onClick={handleNext}
          disabled={!canProceed}
          className="w-full h-12 rounded-xl font-semibold gradient-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {canProceed ? 'Next →' : 'Connect at least one source'}
        </Button>
      </FixedBottomContainer>
    </div>
  );
}
