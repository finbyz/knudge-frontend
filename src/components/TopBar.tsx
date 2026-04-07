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
      <header className="sticky top-6 w-[calc(100%-48px)] mx-auto z-40 rounded-2xl glass-panel shadow-elevated h-16 mb-8">
        <div className="flex items-center justify-between px-6 h-full w-full">
          {/* Page Title */}
          <div className="flex-1">
            <h1 className="text-xl font-black tracking-tight text-foreground">{title}</h1>
          </div>

          {/* Right side icons */}
          <div className="flex items-center gap-3">
            {showNotifications && (
              <button
                onClick={() => setShowNotificationPanel(true)}
                className="h-10 w-10 rounded-xl bg-primary/5 hover:bg-primary/10 flex items-center justify-center relative transition-all active:scale-95 group"
              >
                <Bell className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full bg-primary ring-2 ring-white flex items-center justify-center shadow-glow">
                    <span className="text-[10px] font-black text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </span>
                )}
              </button>
            )}

            {/* User Profile Icon */}
            <Link to="/settings" className="hover:scale-110 active:scale-90 transition-all duration-300">
              <div className="p-0.5 rounded-full border-2 border-primary/20 hover:border-primary/50 transition-colors">
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
