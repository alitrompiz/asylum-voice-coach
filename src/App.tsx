
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <Suspense fallback={null}>
              <Routes>
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
                <Route path="users" element={<EnhancedUserManagement />} />
                <Route path="skills" element={<SkillsManagement />} />
                <Route path="personas" element={<PersonasManagement />} />
                <Route path="prompts" element={<PromptsManagement />} />
                <Route path="roles" element={<RoleManagement />} />
                <Route path="usage" element={<UsageAnalytics />} />
                <Route path="phrases" element={<PhrasesManagement />} />
                <Route path="session-limits" element={<SessionLimitsManagement />} />
              </Route>
              
              {/* 404 catch-all route */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
