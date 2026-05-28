import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/ui/Navbar";
import Home from "./pages/Home";
import Jobs from "./pages/Jobs";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import ResetPasswordPage from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import NotFound from "./pages/NotFound";
import { isAdminRole, isRecruiterRole } from "./lib/roles";
const queryClient = new QueryClient();

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const RecruiterRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isRecruiterRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const RestrictedAccountBanner = () => {
  const { restrictedMessage } = useAuth();
  const { t } = useTranslation();

  if (!restrictedMessage) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="container mx-auto flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>{t(restrictedMessage)}</span>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <RestrictedAccountBanner />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/recruiter" element={<RecruiterRoute><RecruiterDashboard /></RecruiterRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
