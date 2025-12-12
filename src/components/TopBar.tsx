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
      <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-sm h-16">
        <div className="flex items-center justify-between px-4 h-full max-w-lg mx-auto">
          {/* Page Title */}
          <h1 className="text-xl font-bold text-foreground">{title}</h1>

          {/* Right side icons */}
          <div className="flex items-center gap-2">
            {showNotifications && (
              <button 
                onClick={() => setShowNotificationPanel(true)}
                className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center relative transition-colors"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              </button>
            )}
            
            {/* User Profile Icon - navigates to Settings */}
            <Link
              to="/settings"
              className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-cyan-400 flex items-center justify-center hover:scale-110 transition-transform"
            >
              <span className="text-primary-foreground font-semibold text-sm">JD</span>
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
