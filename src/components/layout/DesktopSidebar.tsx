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
      animate={{ 
        width: collapsed ? 64 : 260,
        margin: 12,
        borderRadius: 24
      }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className="h-[calc(100vh-24px)] glass-panel z-40 flex flex-col flex-shrink-0 shadow-elevated"
    >
      {/* Logo Section */}
      <div className="h-20 flex items-center justify-between px-6">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <span className="text-white font-bold text-base">K</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-sidebar-foreground">Knudge</span>
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && (
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center mx-auto shadow-glow">
            <span className="text-white font-bold text-base">K</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const unreadCount = getUnreadCount(item.unreadKey);
          const isActive = location.pathname === item.path ||
            (item.path === '/feed' && location.pathname.startsWith('/feed'));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-primary/5 hover:text-sidebar-foreground'
              )}
            >
              <div className="relative flex-shrink-0">
                <item.icon className={cn(
                  'h-5 w-5 transition-transform duration-300',
                  isActive ? 'scale-110 text-primary' : 'group-hover:scale-110'
                )} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                )}
              </div>

              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'text-sm font-medium whitespace-nowrap overflow-hidden',
                      isActive ? 'font-bold text-foreground' : 'font-medium'
                    )}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Active indicator (Pill shape) */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full shadow-glow"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-primary/5 hover:text-foreground transition-all duration-200"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* User Profile Section */}
      <div className="p-3 mt-auto">
        <div className={cn(
          'flex items-center gap-3 px-3 py-3 rounded-2xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-all cursor-pointer group',
          collapsed && 'justify-center p-2'
        )}>
          <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform">
            <span className="text-white text-sm font-bold">
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
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-bold text-foreground truncate">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'User'}
                </p>
                <p className="text-[10px] font-bold text-primary/70 uppercase tracking-tighter">Premium Agent</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
