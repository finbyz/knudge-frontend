import { useState } from 'react';
import {
  Home,
  Layers,
  Users,
  Rss,
  Inbox,
  Settings,
  Link2,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUnreadStore } from '@/stores/unreadStore';
import { useAuthStore } from '@/stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const { user, logout } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const getUnreadCount = (key?: 'inbox' | 'feed') => {
    if (key === 'inbox') return unreadInbox;
    if (key === 'feed') return unreadFeed;
    return 0;
  };

  return (
    <motion.aside
      initial={false}
      animate={{
        width: collapsed ? 72 : 260,
        borderRadius: 24,
      }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className="z-40 flex h-full min-h-0 max-h-full min-w-0 flex-shrink-0 flex-col glass-panel shadow-elevated"
    >
      {/* Logo Section */}
      <div
        className={cn(
          'flex h-[4.5rem] flex-shrink-0 items-center border-b border-sidebar-border/40',
          collapsed ? 'justify-center px-2' : 'justify-between px-5'
        )}
      >
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex min-w-0 items-center gap-3"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl gradient-primary shadow-glow">
                <span className="text-base font-bold text-white">K</span>
              </div>
              <span className="truncate text-xl font-bold tracking-tight text-sidebar-foreground">Knudge</span>
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <span className="text-base font-bold text-white">K</span>
          </div>
        )}
      </div>

      {/* Navigation — items share px-3 with logo/footer; active rail is flush with highlight left edge */}
      <nav className="no-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-2">
        {navItems.map((item) => {
          const unreadCount = getUnreadCount(item.unreadKey);
          const isActive =
            location.pathname === item.path || (item.path === '/feed' && location.pathname.startsWith('/feed'));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group relative flex min-h-[44px] w-full items-center rounded-xl outline-none transition-colors duration-200',
                'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-primary/5 hover:text-sidebar-foreground'
              )}
            >
              {/* Flush with the highlight pill’s left edge; inset-y clears rounded-xl corners. */}
              {isActive && (
                <motion.span
                  layoutId="sidebarActiveRail"
                  aria-hidden
                  className="pointer-events-none absolute inset-y-2 left-0 z-[1] w-[3px] rounded-r-full bg-primary"
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                />
              )}

              <div
                className={cn(
                  'relative z-0 flex min-w-0 flex-1 items-center py-2.5',
                  collapsed ? 'justify-center px-2' : 'gap-3 pl-3 pr-3'
                )}
              >
                <div className="relative flex-shrink-0">
                  <item.icon
                    className={cn(
                      'h-5 w-5 transition-transform duration-200',
                      isActive ? 'scale-110 text-primary' : 'group-hover:scale-110'
                    )}
                  />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.18 }}
                      className={cn(
                        'truncate text-sm',
                        isActive ? 'font-semibold text-foreground' : 'font-medium'
                      )}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto flex-shrink-0">
        <div className="px-3 pb-1 pt-0">
          <button
            type="button"
            onClick={onToggle}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-muted-foreground transition-colors duration-200 hover:bg-primary/5 hover:text-foreground"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" aria-hidden />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
                <span className="text-sm font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>

        <div className="px-3 pb-3 pt-1">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                className={cn(
                  'group flex w-full items-center gap-3 rounded-2xl border border-primary/10 bg-primary/5 px-3 py-2.5 text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=open]:ring-2 data-[state=open]:ring-primary/25',
                  collapsed && 'justify-center px-2 py-2'
                )}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full gradient-primary shadow-md transition-transform group-hover:scale-[1.02]">
                  <span className="text-sm font-bold text-white">
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
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm font-bold text-foreground">
                        {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'User'}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-tighter text-primary/70">Premium Agent</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="center"
              sideOffset={10}
              className="z-[100] min-w-[11rem] rounded-xl border border-border/80 bg-popover/95 p-1 shadow-elevated backdrop-blur-md"
            >
              <DropdownMenuItem
                className="cursor-pointer gap-2 rounded-lg font-medium text-destructive focus:bg-destructive/10 focus:text-destructive"
                onSelect={() => setShowLogoutConfirm(true)}
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to access your data and conversations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => logout()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.aside>
  );
}
