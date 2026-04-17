import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Mail, Globe, Check, Loader2, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { bridgesApi } from '@/api/bridges';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const steps = [
  {
    id: 'intro',
    title: 'Ready to sync?',
    description: 'Connect your primary messaging apps to see everything in one place.',
    icon: <Globe className="h-10 w-10 text-primary" />,
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    description: 'Sync your WhatsApp chats in real-time.',
    icon: <Smartphone className="h-6 w-6 text-white" />,
    iconBg: 'bg-[#25D366]',
  },
  {
    id: 'email',
    title: 'Email',
    description: 'Connect Gmail or Outlook to sync your threads.',
    icon: <Mail className="h-6 w-6 text-white" />,
    iconBg: 'bg-blue-500',
  }
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  const currentStep = steps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleConnectWhatsApp = async () => {
    setIsConnecting(true);
    try {
      const response = await bridgesApi.login('whatsapp');
      if (response.qr_code) {
        setQrCodeData(response.qr_code);
        setIsQrModalOpen(true);
      } else {
        toast.error("Failed to get QR code.");
      }
    } catch (error) {
      toast.error("WhatsApp connection failed.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleQrScanned = async () => {
    setIsQrModalOpen(false);
    try {
      toast.promise(bridgesApi.sync('whatsapp'), {
        loading: 'Syncing WhatsApp...',
        success: (data) => `Connected! Synced ${data.synced_count} contacts.`,
        error: 'Sync failed. Please try again.',
      });
      handleNext();
    } catch (error) {
      // toast handled by promise
    }
  };

  const handleConnectEmail = () => {
    // Navigate to connections page or trigger OAuth
    window.location.href = '/connections';
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-card rounded-2xl border border-border overflow-hidden shadow-2xl relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-muted">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div className="p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center text-center"
          >
            <div className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg",
              (currentStep as any).iconBg || "bg-primary/10"
            )}>
              {currentStep.icon}
            </div>

            <h2 className="text-2xl font-bold mb-2">{currentStep.title}</h2>
            <p className="text-muted-foreground mb-8">{currentStep.description}</p>

            <div className="w-full flex flex-col gap-3">
              {currentStep.id === 'intro' && (
                <Button onClick={handleNext} size="lg" className="w-full py-6 text-lg">
                  Get Started
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              )}

              {currentStep.id === 'whatsapp' && (
                <>
                  <Button 
                    onClick={handleConnectWhatsApp} 
                    disabled={isConnecting}
                    size="lg" 
                    className="w-full py-6 text-lg bg-[#25D366] hover:bg-[#128C7E] text-white"
                  >
                    {isConnecting ? <Loader2 className="animate-spin mr-2" /> : <Smartphone className="mr-2" />}
                    Connect WhatsApp
                  </Button>
                  <Button variant="ghost" onClick={handleNext} className="text-muted-foreground">
                    Maybe later
                  </Button>
                </>
              )}

              {currentStep.id === 'email' && (
                <>
                  <Button onClick={handleConnectEmail} size="lg" className="w-full py-6 text-lg">
                    <Mail className="mr-2 h-5 w-5" />
                    Connect Gmail/Outlook
                  </Button>
                  <Button variant="ghost" onClick={handleNext} className="text-muted-foreground">
                    Finish
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan WhatsApp QR Code</DialogTitle>
            <DialogDescription>
              Open WhatsApp on your phone `{'>'}` Menu or Settings `{'>'}` Linked Devices `{'>'}` Link a Device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl">
             {qrCodeData && (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCodeData)}`}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64 shadow-inner"
                />
             )}
             <Button onClick={handleQrScanned} className="mt-8 w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-6 text-lg">
                I've scanned it
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
