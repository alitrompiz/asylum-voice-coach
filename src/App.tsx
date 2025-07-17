import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { RequireAdminCode } from "@/components/RequireAdminCode";
import '@/lib/i18n';

// Import pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminCodePage from "./pages/AdminCodePage";

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Verify from "./pages/auth/Verify";

// Main app pages
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Interview from "./pages/Interview";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import ContactUsForm from "./components/ContactUsForm";

// Admin pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import SkillsManagement from "./pages/admin/SkillsManagement";
import PersonasManagement from "./pages/admin/PersonasManagement";
import PromptsManagement from "./pages/admin/PromptsManagement";
import RoleManagement from "./pages/admin/RoleManagement";
import UsageAnalytics from "./pages/admin/UsageAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            
            {/* Auth routes */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/signup" element={<Register />} />
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
            
            {/* Admin access route */}
            <Route path="/admin-login" element={<AdminCodePage />} />
            
            {/* Admin routes */}
            <Route path="/admin" element={<RequireAdminCode><AdminLayout /></RequireAdminCode>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="skills" element={<SkillsManagement />} />
              <Route path="personas" element={<PersonasManagement />} />
              <Route path="prompts" element={<PromptsManagement />} />
              <Route path="roles" element={<RoleManagement />} />
              <Route path="usage" element={<UsageAnalytics />} />
            </Route>
            
            {/* 404 catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
