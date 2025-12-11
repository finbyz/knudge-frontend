import { Bell, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { NotificationPanel } from '@/components/NotificationPanel';

interface AppHeaderProps {
  showNotifications?: boolean;
}

export function AppHeader({ showNotifications = true }: AppHeaderProps) {
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">K</span>
            </div>
            <span className="font-bold text-xl text-foreground">Knudge</span>
          </div>

          {/* Right side icons */}
          <div className="flex items-center gap-2">
            {showNotifications && (
              <button 
                onClick={() => setShowNotificationPanel(true)}
                className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center relative hover:bg-muted transition-colors"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
              </button>
            )}
            
            {/* User Profile Icon - navigates to Settings */}
            <Link
              to="/settings"
              className="relative h-10 w-10 rounded-full bg-gradient-to-r from-primary to-cyan-400 flex items-center justify-center hover:scale-110 transition-transform group"
            >
              <span className="text-primary-foreground font-semibold text-sm">JD</span>
              {/* Settings gear overlay */}
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-background border border-border flex items-center justify-center">
                <Settings className="h-2.5 w-2.5 text-muted-foreground" />
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
