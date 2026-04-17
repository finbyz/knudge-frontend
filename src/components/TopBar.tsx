import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { NotificationPanel } from '@/components/NotificationPanel';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Avatar } from '@/components/Avatar';

interface TopBarProps {
  title: string;
  showNotifications?: boolean;
}

export function TopBar({ title, showNotifications = true }: TopBarProps) {
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  return (
    <>
      {/* Single flow root so PageShell spacing isn't broken by fragment + fixed overlays */}
      <div className="relative z-40 mb-4 w-full shrink-0 sm:mb-5">
        <header className="sticky top-4 h-16 w-full rounded-2xl glass-panel shadow-elevated sm:top-6">
          <div className="flex h-full w-full min-w-0 items-center justify-between gap-3 px-4 sm:px-6">
            {/* Page Title */}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-black tracking-tight text-foreground">{title}</h1>
            </div>

            {/* Right: optional actions + icons */}
            <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
              {showNotifications && (
                <button
                  type="button"
                  onClick={() => setShowNotificationPanel(true)}
                  className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 transition-all hover:bg-primary/10 active:scale-95"
                >
                  <Bell className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-primary shadow-glow ring-2 ring-white">
                      <span className="text-[10px] font-black text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    </span>
                  )}
                </button>
              )}

              <Link to="/settings" className="transition-all duration-300 hover:scale-110 active:scale-90">
                <div className="rounded-full border-2 border-primary/20 p-0.5 transition-colors hover:border-primary/50">
                  <Avatar
                    src={user?.photo_url}
                    initials={`${user?.first_name?.[0] || user?.username?.[0] || 'U'}${user?.last_name?.[0] || ''}`.toUpperCase()}
                    size="sm"
                  />
                </div>
              </Link>
            </div>
          </div>
        </header>
      </div>

      {/* Notification Panel */}
      {showNotifications && (
        <NotificationPanel
          isOpen={showNotificationPanel}
          onClose={() => setShowNotificationPanel(false)}
        />
      )}
    </>
  );
}
