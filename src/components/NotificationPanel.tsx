import { motion, AnimatePresence } from 'framer-motion';
import { X, Youtube, Linkedin, Users, MessageSquare, Bell, Check, CheckCheck } from 'lucide-react';
import { useNotificationStore, AppNotification } from '@/stores/notificationStore';

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

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { notifications, dismissNotification, dismissAll } = useNotificationStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-16 right-4 z-50 w-full max-w-md bg-card rounded-2xl shadow-elevated border border-border max-h-[70vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-foreground">Notifications</h2>
                {notifications.length > 0 && (
                  <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                    {notifications.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={() => dismissAll()}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Clear all
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[calc(70vh-64px)]">
              {notifications.length > 0 ? (
                notifications.map((notification) => {
                  const config = typeConfig[notification.type] || typeConfig.reminder;
                  const Icon = config.icon;

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors group"
                    >
                      <div className="flex gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${config.bgClass}`}>
                          <Icon className={`h-5 w-5 ${config.iconClass}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-foreground text-sm">{notification.title}</h3>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {notification.isNew && (
                                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                              )}
                              <button
                                onClick={() => dismissNotification(notification.id)}
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-all"
                                title="Dismiss"
                              >
                                <Check className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{notification.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(notification.timestamp)}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No notifications</p>
                  <p className="text-xs mt-1">Schedule a reminder from a contact to get started</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}