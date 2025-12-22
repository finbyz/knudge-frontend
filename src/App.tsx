import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { BottomNav } from "@/components/ui/BottomNav";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useAuthStore } from "@/stores/authStore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Deck from "./pages/Deck";
import Connections from "./pages/Connections";
import Contacts from "./pages/Contacts";
import Feed from "./pages/Feed";
import Settings from "./pages/Settings";
import Inbox from "./pages/Inbox";
import ChatDetail from "./pages/inbox/ChatDetail";
import EmailDetail from "./pages/inbox/EmailDetail";
import Activities from "./pages/Activities";
import MySources from "./pages/feed/MySources";
import AddSource from "./pages/feed/AddSource";
import NotFound from "./pages/NotFound";
import OnboardingLogin from "./pages/onboarding/OnboardingLogin";
import OnboardingGoal from "./pages/onboarding/OnboardingGoal";
import OnboardingProfile from "./pages/onboarding/OnboardingProfile";
import OnboardingVoice from "./pages/onboarding/OnboardingVoice";
import OnboardingKnowledge from "./pages/onboarding/OnboardingKnowledge";
import OnboardingConnections from "./pages/onboarding/OnboardingConnections";
import OnboardingTrial from "./pages/onboarding/OnboardingTrial";
import OnboardingComplete from "./pages/onboarding/OnboardingComplete";
import GmailCallback from "./pages/GmailCallback";
import OutlookCallback from "./pages/OutlookCallback";
import { DesktopSidebar } from "./components/layout/DesktopSidebar";
import { cn } from "./lib/utils";
import GmailCallback from "./pages/GmailCallback";
import OutlookCallback from "./pages/OutlookCallback";

const queryClient = new QueryClient();

const getStepPath = (step: number) => {
  switch (step) {
    case 1: return '/onboarding/goal';
    case 2: return '/onboarding/profile';
    case 3: return '/onboarding/voice';
    case 4: return '/onboarding/knowledge';
    case 5: return '/onboarding/connections';
    case 6: return '/onboarding/trial';
    case 7: return '/onboarding/complete';
    default: return '/onboarding/goal';
  }
};

function AppLayout({ children }: { children: React.ReactNode }) {
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
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      {isDesktop && (
        <DesktopSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300">
        <div className={cn(
          'w-full h-full overflow-y-auto',
          isDesktop ? 'max-w-5xl mx-auto px-4 lg:px-8' : 'mx-auto max-w-lg'
        )}>
          {children}
        </div>
      </main>

      {/* Bottom Nav - Mobile only */}
      {!isDesktop && <BottomNav />}
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const { completed, currentStep } = useOnboardingStore();
  const { accessToken, setUser } = useAuthStore();
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');

  useEffect(() => {
    if (accessToken) {
      authApi.getMe().then(user => {
        setUser(user);
        // Sync onboarding state from backend user data
        useOnboardingStore.getState().syncFromUser(user);
      }).catch(() => {
        // If getMe fails (e.g. token expired), we might want to logout or ignore
        // For now, ignore to avoid disruption if it's transient
      });
    }
  }, [accessToken, setUser]);

  // Case 1: Not authenticated - only allow login
  if (!accessToken) {
    if (location.pathname !== '/onboarding/login') {
      return <Navigate to="/onboarding/login" replace />;
    }
    return <AppLayout><Routes><Route path="/onboarding/login" element={<OnboardingLogin />} /></Routes></AppLayout>;
  }

  // Case 2: Authenticated but not completed - redirect to current step if not on onboarding
  if (!completed) {
    if (!isOnboardingRoute || location.pathname === '/onboarding/login') {
      return <Navigate to={getStepPath(currentStep)} replace />;
    }
  }

  // Case 3: Authenticated and completed - redirect to main app if on onboarding (except login which might be used for switching acts)
  // Actually if completed, they shouldn't be on onboarding unless explicitly testing. 
  // But usually we want to block onboarding access if done.
  if (completed && isOnboardingRoute) {
    return <Navigate to="/" replace />;
  }

  // If trying to access onboarding but user is fully authenticated and completed, go to main app
  if (isOnboardingRoute && accessToken && completed && location.pathname !== '/onboarding/login') {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <Routes>
        {/* Onboarding routes */}
        <Route path="/onboarding" element={<Navigate to="/onboarding/login" replace />} />
        <Route path="/onboarding/login" element={<OnboardingLogin />} />
        <Route path="/onboarding/goal" element={<OnboardingGoal />} />
        <Route path="/onboarding/profile" element={<OnboardingProfile />} />
        <Route path="/onboarding/voice" element={<OnboardingVoice />} />
        <Route path="/onboarding/knowledge" element={<OnboardingKnowledge />} />
        <Route path="/onboarding/connections" element={<OnboardingConnections />} />
        <Route path="/onboarding/trial" element={<OnboardingTrial />} />
        <Route path="/onboarding/complete" element={<OnboardingComplete />} />

        {/* Protected app routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Index />} />
          <Route path="/deck" element={<Deck />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/feed/sources" element={<MySources />} />
          <Route path="/feed/sources/add" element={<AddSource />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/inbox/chat/:contactId" element={<ChatDetail />} />
          <Route path="/inbox/email/:emailId" element={<EmailDetail />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/gmail/callback" element={<GmailCallback />} />
          <Route path="/outlook/callback" element={<OutlookCallback />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
