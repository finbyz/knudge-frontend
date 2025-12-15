import { motion, AnimatePresence } from 'framer-motion';
import { X, Youtube, Linkedin, Users, MessageSquare, Bell } from 'lucide-react';

interface Notification {
  id: string;
  type: 'feed' | 'connects' | 'message' | 'reminder';
  title: string;
  description: string;
  timestamp: string;
  isNew?: boolean;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeConfig = {
  feed: {
    icon: Youtube,
    bgClass: 'bg-red-500/10',
    iconClass: 'text-red-500',
  },
  connects: {
    icon: Users,
    bgClass: 'bg-primary/10',
    iconClass: 'text-primary',
  },
  message: {
    icon: MessageSquare,
    bgClass: 'bg-success/10',
    iconClass: 'text-success',
  },
  reminder: {
    icon: Bell,
    bgClass: 'bg-warning/10',
    iconClass: 'text-warning',
  },
};

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  // TODO: Fetch real notifications
  const notifications: Notification[] = []; // Starting empty

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-16 right-4 left-4 z-50 bg-card rounded-2xl shadow-elevated border border-border max-h-[70vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Notifications</h2>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[calc(70vh-64px)]">
              {notifications.length > 0 ? (
                notifications.map((notification) => {
                  const config = typeConfig[notification.type];
                  const Icon = config.icon;

                  return (
                    <div
                      key={notification.id}
                      className="p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <div className="flex gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${config.bgClass}`}>
                          <Icon className={`h-5 w-5 ${config.iconClass}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-foreground text-sm">{notification.title}</h3>
                            {notification.isNew && (
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{notification.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{notification.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No new notifications</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}