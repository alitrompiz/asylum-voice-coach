
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
import { Suspense, lazy } from "react";
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
const EnhancedUserManagement = lazy(() => import("./pages/admin/EnhancedUserManagement"));
const SkillsManagement = lazy(() => import("./pages/admin/SkillsManagement"));
const PersonasManagement = lazy(() => import("./pages/admin/PersonasManagement"));
const PromptsManagement = lazy(() => import("./pages/admin/PromptsManagement"));
const RoleManagement = lazy(() => import("./pages/admin/RoleManagement"));
const UsageAnalytics = lazy(() => import("./pages/admin/UsageAnalytics"));
const PhrasesManagement = lazy(() => import("./pages/admin/PhrasesManagement"));
const SessionLimitsManagement = lazy(() => import("./pages/admin/SessionLimitsManagement"));

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* Public routes without AuthProvider to avoid Supabase init on landing */}
        <Suspense fallback={<LandingSkeleton />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>

        {/* Routes that require auth/i18n providers */}
        <AuthProvider>
          <LanguageProvider>
            <Routes>
              {/* Auth routes */}
              <Route path="/auth" element={<Suspense fallback={<PageSkeleton />}><Auth /></Suspense>} />
              <Route path="/auth/login" element={<Suspense fallback={<PageSkeleton />}><Auth /></Suspense>} />
              <Route path="/auth/signup" element={<Suspense fallback={<PageSkeleton />}><Auth /></Suspense>} />
              <Route path="/auth/register" element={<Suspense fallback={<PageSkeleton />}><Auth /></Suspense>} />
              <Route path="/auth/forgot-password" element={<Suspense fallback={<PageSkeleton />}><ForgotPassword /></Suspense>} />
              <Route path="/auth/reset-password" element={<Suspense fallback={<PageSkeleton />}><ResetPassword /></Suspense>} />
              <Route path="/auth/verify" element={<Suspense fallback={<PageSkeleton />}><Verify /></Suspense>} />
              
              {/* Protected routes */}
              <Route path="/onboarding" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Onboarding /></Suspense></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Dashboard /></Suspense></ProtectedRoute>} />
              <Route path="/interview" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Interview /></Suspense></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Profile /></Suspense></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Settings /></Suspense></ProtectedRoute>} />
              <Route path="/settings/contact" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><ContactUsForm /></Suspense></ProtectedRoute>} />
              
              {/* Admin routes - require admin role */}
              <Route path="/admin" element={<RequireAdminRole><Suspense fallback={<PageSkeleton />}><AdminLayout /></Suspense></RequireAdminRole>}>
                <Route index element={<Suspense fallback={<PageSkeleton />}><AdminDashboard /></Suspense>} />
                <Route path="users" element={<Suspense fallback={<PageSkeleton />}><EnhancedUserManagement /></Suspense>} />
                <Route path="skills" element={<Suspense fallback={<PageSkeleton />}><SkillsManagement /></Suspense>} />
                <Route path="personas" element={<Suspense fallback={<PageSkeleton />}><PersonasManagement /></Suspense>} />
                <Route path="prompts" element={<Suspense fallback={<PageSkeleton />}><PromptsManagement /></Suspense>} />
                <Route path="roles" element={<Suspense fallback={<PageSkeleton />}><RoleManagement /></Suspense>} />
                <Route path="usage" element={<Suspense fallback={<PageSkeleton />}><UsageAnalytics /></Suspense>} />
                <Route path="phrases" element={<Suspense fallback={<PageSkeleton />}><PhrasesManagement /></Suspense>} />
                <Route path="session-limits" element={<Suspense fallback={<PageSkeleton />}><SessionLimitsManagement /></Suspense>} />
              </Route>
            </Routes>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
