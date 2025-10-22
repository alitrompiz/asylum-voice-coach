
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequireAdminRole } from "@/components/RequireAdminRole";
import { LanguageProvider } from "@/components/LanguageProvider";
import '@/lib/i18n';
import { Suspense, lazy, Component, ErrorInfo, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
// Import pages (lazy-loaded)
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Auth pages
const Auth = lazy(() => import("./pages/auth/Auth"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const Verify = lazy(() => import("./pages/auth/Verify"));

// Main app pages
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Interview = lazy(() => import("./pages/Interview"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const ContactUsForm = lazy(() => import("./components/ContactUsForm"));

// Admin pages
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const HomePageContentManagement = lazy(() => import("./pages/admin/HomePageContentManagement"));
const EnhancedUserManagement = lazy(() => import("./pages/admin/EnhancedUserManagement"));
const SkillsManagement = lazy(() => import("./pages/admin/SkillsManagement"));
const PersonasManagement = lazy(() => import("./pages/admin/PersonasManagement"));
const PromptsManagement = lazy(() => import("./pages/admin/PromptsManagement"));
const RoleManagement = lazy(() => import("./pages/admin/RoleManagement"));
const UsageAnalytics = lazy(() => import("./pages/admin/UsageAnalytics"));
const PhrasesManagement = lazy(() => import("./pages/admin/PhrasesManagement"));
const SessionLimitsManagement = lazy(() => import("./pages/admin/SessionLimitsManagement"));
const TestStoriesManagement = lazy(() => import("./pages/admin/TestStoriesManagement"));

const queryClient = new QueryClient();

const PageSkeleton = () => (
  <div className="p-6 space-y-4">
    <div className="h-8 w-1/3"><Skeleton className="h-8 w-full" /></div>
    <Skeleton className="h-40 w-full" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

const LandingSkeleton = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-10 w-2/3" />
    <Skeleton className="h-6 w-1/2" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
            <p className="text-muted-foreground">
              The application encountered an error. Please try refreshing the page.
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Error details
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                {this.state.error?.toString()}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <LanguageProvider>
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  
                  {/* Auth routes */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/login" element={<Auth />} />
                  <Route path="/auth/signup" element={<Auth />} />
                  <Route path="/auth/register" element={<Auth />} />
                  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                  <Route path="/auth/reset-password" element={<ResetPassword />} />
                  <Route path="/auth/verify" element={<Verify />} />
                  
                  {/* Protected routes */}
                  <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/interview" element={<ProtectedRoute><Interview /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/settings/contact" element={<ProtectedRoute><ContactUsForm /></ProtectedRoute>} />
                  
                  {/* Admin routes - require admin role */}
                  <Route path="/admin" element={<RequireAdminRole><AdminLayout /></RequireAdminRole>}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="home-page" element={<HomePageContentManagement />} />
                    <Route path="users" element={<EnhancedUserManagement />} />
                    <Route path="skills" element={<SkillsManagement />} />
                    <Route path="personas" element={<PersonasManagement />} />
                    <Route path="prompts" element={<PromptsManagement />} />
                    <Route path="roles" element={<RoleManagement />} />
                    <Route path="usage" element={<UsageAnalytics />} />
                    <Route path="phrases" element={<PhrasesManagement />} />
                    <Route path="session-limits" element={<SessionLimitsManagement />} />
                    <Route path="test-stories" element={<TestStoriesManagement />} />
                  </Route>
                  
                  {/* 404 catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
