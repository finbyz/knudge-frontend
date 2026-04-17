import { Inbox, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface EmptyInboxProps {
  onAddService?: () => void;
  onOpenSettings?: () => void;
}

export function EmptyInbox({
  onAddService,
  onOpenSettings,
}: EmptyInboxProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto h-[60vh]">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 relative"
      >
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/5" />
        <Inbox className="h-12 w-12 text-primary" />
      </motion.div>

      <motion.h3
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-2xl font-bold tracking-tight mb-2"
      >
        Your inbox is empty
      </motion.h3>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-muted-foreground mb-8 text-lg"
      >
        Connect your services to start seeing messages from WhatsApp, Gmail, and more in one place.
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4 w-full"
      >
        <Button onClick={onAddService} className="flex-1 py-6 text-lg shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-5 w-5" />
          Add Service
        </Button>
        <Button variant="outline" onClick={onOpenSettings} className="flex-1 py-6 text-lg border-primary/20 hover:bg-primary/5">
          <Settings className="mr-2 h-5 w-5" />
          Settings
        </Button>
      </motion.div>
    </div>
  );
}
