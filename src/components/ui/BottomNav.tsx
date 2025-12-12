import { Home, Layers, Users, Rss, Inbox } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUnreadStore } from '@/stores/unreadStore';

const navItems = [
  { path: '/', icon: Home, label: 'Home', hasUnread: false },
  { path: '/deck', icon: Layers, label: 'Deck', hasUnread: false },
  { path: '/contacts', icon: Users, label: 'Contacts', hasUnread: false },
  { path: '/feed', icon: Rss, label: 'Feed', hasUnread: true, unreadKey: 'feed' as const },
  { path: '/inbox', icon: Inbox, label: 'Inbox', hasUnread: true, unreadKey: 'inbox' as const },
];

export function BottomNav() {
  const { unreadInbox, unreadFeed } = useUnreadStore();

  const getUnreadCount = (key?: 'inbox' | 'feed') => {
    if (key === 'inbox') return unreadInbox;
    if (key === 'feed') return unreadFeed;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const unreadCount = item.hasUnread ? getUnreadCount(item.unreadKey) : 0;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 relative',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <item.icon
                      className={cn(
                        'h-5 w-5 transition-transform duration-200',
                        isActive && 'scale-110'
                      )}
                    />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium transition-all duration-200',
                    isActive && 'font-semibold'
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
