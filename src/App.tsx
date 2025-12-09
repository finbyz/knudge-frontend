import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/ui/BottomNav";
import Index from "./pages/Index";
import Deck from "./pages/Deck";
import Connections from "./pages/Connections";
import Contacts from "./pages/Contacts";
import Feed from "./pages/Feed";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="max-w-lg mx-auto bg-background min-h-screen relative">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/deck" element={<Deck />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
