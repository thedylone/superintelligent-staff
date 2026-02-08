import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import ActionItems from "./pages/ActionItems";
import OrgNetwork from "./pages/OrgNetwork";
import Updates from "./pages/Updates";
import Submit from "./pages/Submit";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import ProfileOnboarding from "./pages/ProfileOnboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute requireApproval={false}>
                  <ProfileOnboarding />
                </ProtectedRoute>
              }
            />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/action-items" element={<ActionItems />} />
              <Route path="/action-items/:id" element={<ActionItems />} />
              <Route path="/network" element={<OrgNetwork />} />
              <Route path="/updates" element={<Updates />} />
              <Route path="/submit" element={<Submit />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <NotFound />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
