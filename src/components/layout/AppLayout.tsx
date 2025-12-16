import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DesktopSidebar } from './DesktopSidebar';
import { BottomNav } from '@/components/ui/BottomNav';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');
  const [isDesktop, setIsDesktop] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (isOnboardingRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar - Only visible on lg+ screens */}
      {isDesktop && (
        <DesktopSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      )}

      {/* Main Content Area */}
      <main 
        className={cn(
          'flex-1 min-h-screen transition-all duration-300',
          isDesktop && !sidebarCollapsed && 'lg:ml-64',
          isDesktop && sidebarCollapsed && 'lg:ml-16',
          !isDesktop && 'pb-16' // Space for bottom nav on mobile
        )}
      >
        <div className={cn(
          'max-w-5xl mx-auto w-full',
          isDesktop ? 'px-6' : 'px-0'
        )}>
          {children}
        </div>
      </main>

      {/* Bottom Nav - Only on mobile/tablet */}
      {!isDesktop && <BottomNav />}
    </div>
  );
}
