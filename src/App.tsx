import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/ui/Navbar";
import Home from "./pages/Home";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import ResetPasswordPage from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCompanyReview from "./pages/AdminCompanyReview";
import AdminUserProfile from "./pages/AdminUserProfile";
import CompanyProfile from "./pages/CompanyProfile";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import RecruiterVerification from "./pages/RecruiterVerification";
import ModeratorDashboard from "./pages/ModeratorDashboard.tsx";
import Applications from "./pages/Applications";
import NotFound from "./pages/NotFound";
import { isAdminRole, isCandidateRole, isModeratorRole, isRecruiterRole } from "./lib/roles";
import { SanityCustomSections } from "./components/sanity/SanityPageSections";
import { useSanityManagedInterface } from "./lib/sanityInterfaceText";
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

// Moderator Route
const ModeratorRoute = ({ children }: { children: JSX.Element }) => {
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

  if (!isModeratorRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AdminOrModeratorRoute = ({ children }: { children: JSX.Element }) => {
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

  if (!isAdminRole(user?.role) && !isModeratorRole(user?.role)) {
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

const CandidateRoute = ({ children }: { children: JSX.Element }) => {
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

  if (!isCandidateRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const CandidateOrRecruiterRoute = ({ children }: { children: JSX.Element }) => {
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

  if (!isCandidateRole(user?.role) && !isRecruiterRole(user?.role)) {
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

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const managedPageRoutes = new Set([
  "/", "/jobs", "/profile", "/applications", "/recruiter-verification", "/admin", "/recruiter", "/moderator",
]);

const SanityContentGate = ({children}: {children: React.ReactNode}) => {
  const { t } = useTranslation();
  const {pathname} = useLocation();
  const routePath = managedPageRoutes.has(pathname) ? pathname : "/";
  const homeInterface = useSanityManagedInterface("/");
  const routeInterface = useSanityManagedInterface(routePath);

  if (homeInterface.isLoading || routeInterface.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50" aria-label={t("app.loading")}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <SanityContentGate>
            <Navbar />
            <RestrictedAccountBanner />
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:jobId" element={<JobDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/companies/:companyId" element={<CompanyProfile />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/users/:userId" element={<AdminRoute><AdminUserProfile /></AdminRoute>} />
            <Route path="/admin/company-reviews/:applicationId" element={<AdminOrModeratorRoute><AdminCompanyReview /></AdminOrModeratorRoute>} />
            <Route path="/recruiter" element={<RecruiterRoute><RecruiterDashboard /></RecruiterRoute>} />
            <Route path="/recruiter-verification" element={<CandidateOrRecruiterRoute><RecruiterVerification /></CandidateOrRecruiterRoute>} />
            <Route path="/moderator" element={<ModeratorRoute><ModeratorDashboard /></ModeratorRoute>} />
            <Route path="/applications" element={<CandidateRoute><Applications /></CandidateRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
            <SanityCustomSections />
          </SanityContentGate>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
