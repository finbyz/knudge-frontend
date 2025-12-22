import { Home, Layers, Users, Rss, Inbox, Settings, Link2, ChevronLeft, ChevronRight } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUnreadStore } from '@/stores/unreadStore';
import { useAuthStore } from '@/stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/deck', icon: Layers, label: 'Deck' },
  { path: '/contacts', icon: Users, label: 'Contacts' },
  { path: '/feed', icon: Rss, label: 'Feed', unreadKey: 'feed' as const },
  { path: '/inbox', icon: Inbox, label: 'Inbox', unreadKey: 'inbox' as const },
  { path: '/connections', icon: Link2, label: 'Connections' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

interface DesktopSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function DesktopSidebar({ collapsed, onToggle }: DesktopSidebarProps) {
  const location = useLocation();
  const { unreadInbox, unreadFeed } = useUnreadStore();
  const { user } = useAuthStore();

  const getUnreadCount = (key?: 'inbox' | 'feed') => {
    if (key === 'inbox') return unreadInbox;
    if (key === 'feed') return unreadFeed;
    return 0;
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-full bg-sidebar border-r border-sidebar-border z-40 flex flex-col flex-shrink-0"
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3"
            >
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-lg text-sidebar-foreground">Knudge</span>
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && (
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">K</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const unreadCount = getUnreadCount(item.unreadKey);
          const isActive = location.pathname === item.path ||
            (item.path === '/feed' && location.pathname.startsWith('/feed'));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <div className="relative flex-shrink-0">
                <item.icon className={cn(
                  'h-5 w-5 transition-transform',
                  isActive && 'scale-110'
                )} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </div>

              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      'text-sm font-medium whitespace-nowrap overflow-hidden',
                      isActive && 'font-semibold'
                    )}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* User Profile Section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn(
          'flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors cursor-pointer',
          collapsed && 'justify-center'
        )}>
          <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-semibold">
              {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
              {(user?.last_name?.[0] || user?.username?.[1] || '').toUpperCase()}
            </span>
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">Free Plan</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
