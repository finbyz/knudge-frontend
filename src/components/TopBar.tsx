import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { NotificationPanel } from '@/components/NotificationPanel';

interface TopBarProps {
  title: string;
  showNotifications?: boolean;
}

export function TopBar({ title, showNotifications = true }: TopBarProps) {
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  return (
    <>
      <header className="sticky top-0 w-full z-40 bg-card/80 backdrop-blur-md border-b border-border shadow-sm h-16">
        <div className="flex items-center justify-between px-4 h-full max-w-lg mx-auto md:max-w-5xl md:mx-auto md:w-full">
          {/* Page Title - Centered on Mobile, Left on Desktop */}
          <div className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:flex-1">
            <h1 className="text-xl font-bold text-foreground text-center md:text-left">{title}</h1>
          </div>

          {/* Right side icons - Always on right */}
          <div className="flex items-center gap-3 ml-auto md:ml-0">
            {showNotifications && (
              <button
                onClick={() => setShowNotificationPanel(true)}
                className="h-9 w-9 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center relative transition-colors"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
              </button>
            )}

            {/* User Profile Icon */}
            <Link
              to="/settings"
              className="h-9 w-9 rounded-full bg-gradient-to-r from-primary to-cyan-400 flex items-center justify-center hover:scale-105 transition-transform shadow-sm"
            >
              <span className="text-primary-foreground font-semibold text-xs">JD</span>
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
