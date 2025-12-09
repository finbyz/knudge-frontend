import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, Loader2 } from 'lucide-react';
import { ConnectionCard } from '@/components/ConnectionCard';
import { mockConnections, Connection } from '@/data/mockData';
import { toast } from '@/hooks/use-toast';

const platformNames = {
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  signal: 'Signal',
  email: 'Email',
};

export default function Connections() {
  const [connections, setConnections] = useState<Connection[]>(mockConnections);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const handleConnect = (platform: string) => {
    setConnectingPlatform(platform);
  };

  const handleCloseModal = () => {
    setConnectingPlatform(null);
  };

  const handleScanComplete = () => {
    if (connectingPlatform) {
      setConnections((prev) =>
        prev.map((c) =>
          c.platform === connectingPlatform
            ? { ...c, status: 'connected' as const, lastSync: 'Just now', contactCount: Math.floor(Math.random() * 100) + 20 }
            : c
        )
      );
      toast({
        title: 'Connected!',
        description: `${platformNames[connectingPlatform as keyof typeof platformNames]} has been connected successfully.`,
      });
    }
    setConnectingPlatform(null);
  };

  const handleDisconnect = (platform: string) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.platform === platform
          ? { ...c, status: 'disconnected' as const, lastSync: null, contactCount: 0 }
          : c
      )
    );
    toast({
      title: 'Disconnected',
      description: `${platformNames[platform as keyof typeof platformNames]} has been disconnected.`,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-center px-4 h-16">
          <span className="font-semibold text-foreground">Connections</span>
        </div>
      </header>

      <main className="px-4 py-6 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-muted-foreground mb-4">
            Connect your messaging platforms to let Knudge sync your conversations and draft personalized messages.
          </p>
        </motion.div>

        {connections.map((connection, index) => (
          <motion.div
            key={connection.platform}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <ConnectionCard
              connection={connection}
              onConnect={() => handleConnect(connection.platform)}
              onDisconnect={() => handleDisconnect(connection.platform)}
            />
          </motion.div>
        ))}
      </main>

      {/* QR Code Modal */}
      <AnimatePresence>
        {connectingPlatform && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-3xl shadow-elevated p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">
                  Connect {platformNames[connectingPlatform as keyof typeof platformNames]}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="aspect-square bg-muted rounded-2xl flex items-center justify-center mb-6 border-2 border-dashed border-border">
                <QrCode className="h-32 w-32 text-muted-foreground/50" />
              </div>

              <p className="text-sm text-muted-foreground text-center mb-6">
                Scan this QR code with {platformNames[connectingPlatform as keyof typeof platformNames]} on your phone to connect your account.
              </p>

              <button
                onClick={handleScanComplete}
                className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-medium flex items-center justify-center gap-2"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Simulating scan...
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
