
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequireAdminRole } from "@/components/RequireAdminRole";
import { LanguageProvider } from "@/components/LanguageProvider";
import '@/lib/i18n';
import { Suspense, lazy, Component, ErrorInfo, ReactNode, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MixpanelProvider } from "@/lib/mixpanel";
import { initializeMonitoring } from "@/lib/monitoring";

// Lazy load wrapper with automatic retry for chunk load errors
const lazyWithRetry = (componentImport: () => Promise<any>) => {
  return lazy(() =>
    componentImport().catch((error) => {
      // Check if it's a chunk load error
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch dynamically imported module')) {
        // Check if we've already tried to reload
        const hasReloaded = sessionStorage.getItem('chunk-reload-attempted');
        
        if (!hasReloaded) {
          // Store flag and purge SW/caches before reload
          sessionStorage.setItem('chunk-reload-attempted', 'true');
          (async () => {
            try {
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(r => r.unregister()));
              }
              if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
              }
            } catch (e) {
              console.error('[lazyWithRetry] Failed to purge SW/caches:', e);
            } finally {
              window.location.reload();
            }
          })();
          // Return a never-resolving promise to prevent rendering
          return new Promise(() => {});
        } else {
          // Clear flag and show error
          sessionStorage.removeItem('chunk-reload-attempted');
        }
      }
      throw error;
    })
  );
};

// Import pages (lazy-loaded with retry)
const Index = lazyWithRetry(() => import("./pages/Index"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

// Auth pages
const Auth = lazyWithRetry(() => import("./pages/auth/Auth"));
const ForgotPassword = lazyWithRetry(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/auth/ResetPassword"));
const Verify = lazyWithRetry(() => import("./pages/auth/Verify"));

// Main app pages
const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Interview = lazyWithRetry(() => import("./pages/Interview"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const ContactUsForm = lazyWithRetry(() => import("./components/ContactUsForm"));

// Admin pages
const AdminLayout = lazyWithRetry(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/AdminDashboard"));
const HomePageContentManagement = lazyWithRetry(() => import("./pages/admin/HomePageContentManagement"));
const EnhancedUserManagement = lazyWithRetry(() => import("./pages/admin/EnhancedUserManagement"));
const GuestSessionsManagement = lazyWithRetry(() => import("./pages/admin/GuestSessionsManagement"));
const SkillsManagement = lazyWithRetry(() => import("./pages/admin/SkillsManagement"));
const PersonasManagement = lazyWithRetry(() => import("./pages/admin/PersonasManagement"));
const PromptsManagement = lazyWithRetry(() => import("./pages/admin/PromptsManagement"));
const RoleManagement = lazyWithRetry(() => import("./pages/admin/RoleManagement"));
const UsageAnalytics = lazyWithRetry(() => import("./pages/admin/UsageAnalytics"));
const PhrasesManagement = lazyWithRetry(() => import("./pages/admin/PhrasesManagement"));
const SessionLimitsManagement = lazyWithRetry(() => import("./pages/admin/SessionLimitsManagement"));
const TestStoriesManagement = lazyWithRetry(() => import("./pages/admin/TestStoriesManagement"));

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
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="space-y-6 w-full max-w-4xl">
      <div className="text-center space-y-4">
        <Skeleton className="h-12 w-3/4 mx-auto bg-muted" />
        <Skeleton className="h-6 w-1/2 mx-auto bg-muted" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <Skeleton className="h-64 w-full bg-muted" />
        <Skeleton className="h-64 w-full bg-muted" />
        <Skeleton className="h-64 w-full bg-muted" />
      </div>
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
      const isChunkError = this.state.error?.message?.includes('Failed to fetch dynamically imported module');
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 space-y-4">
            <h1 className="text-2xl font-bold text-destructive">
              {isChunkError ? 'Update Required' : 'Something went wrong'}
            </h1>
            <p className="text-muted-foreground">
              {isChunkError 
                ? 'The application has been updated. Please reload the page to get the latest version.'
                : 'The application encountered an error. Please try refreshing the page.'
              }
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

// Use HashRouter on staging (*.lovable.app) or when explicitly configured
const shouldUseHash =
  import.meta.env?.VITE_USE_HASH_ROUTER === 'true' ||
  (typeof window !== 'undefined' && window.location.hostname.endsWith('.lovable.app'));

const RouterImpl = shouldUseHash ? HashRouter : BrowserRouter;

console.log('[App.tsx] Using router:', shouldUseHash ? 'HashRouter' : 'BrowserRouter', 
  '(hostname:', typeof window !== 'undefined' ? window.location.hostname : 'SSR', ')');

const App = () => {
  // Initialize monitoring after React is available
  useEffect(() => {
    console.log('[App] Initializing monitoring');
    initializeMonitoring().catch((error) => {
      console.error('[App] Failed to initialize monitoring:', error);
    });
  }, []);

  return (
    <ErrorBoundary>
      <MixpanelProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <RouterImpl>
              <AuthProvider>
                <LanguageProvider>
                  <Suspense fallback={<LandingSkeleton />}>
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
                      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                      <Route path="/interview" element={<ProtectedRoute><Interview /></ProtectedRoute>} />
                      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                      <Route path="/settings/contact" element={<ProtectedRoute><ContactUsForm /></ProtectedRoute>} />
                      
                      {/* Admin routes - require admin role */}
                      <Route path="/admin" element={<RequireAdminRole><AdminLayout /></RequireAdminRole>}>
                        <Route index element={<AdminDashboard />} />
                        <Route path="home-page" element={<HomePageContentManagement />} />
                        <Route path="users" element={<EnhancedUserManagement />} />
                        <Route path="guest-sessions" element={<GuestSessionsManagement />} />
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
            </RouterImpl>
          </TooltipProvider>
        </QueryClientProvider>
      </MixpanelProvider>
    </ErrorBoundary>
  );
};

export default App;
