import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { BottomNav } from "@/components/ui/BottomNav";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useAuthStore } from "@/stores/authStore";
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

const queryClient = new QueryClient();

function AppRoutes() {
  const location = useLocation();
  const { completed } = useOnboardingStore();
  const { accessToken } = useAuthStore();
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');

  // If not on onboarding route and no token or onboarding not complete, redirect to login
  if (!isOnboardingRoute && (!accessToken || !completed)) {
    return <Navigate to="/onboarding/login" replace />;
  }

  // If trying to access onboarding but user is fully authenticated and completed, go to main app
  if (isOnboardingRoute && accessToken && completed && location.pathname !== '/onboarding/login') {
    return <Navigate to="/" replace />;
  }

  return (
    <>
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
      {!isOnboardingRoute && <BottomNav />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="max-w-lg mx-auto bg-background min-h-screen relative">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;