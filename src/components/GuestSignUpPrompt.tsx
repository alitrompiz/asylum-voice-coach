import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const guestSignUpSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
  confirmPassword: z.string()
    .min(6, 'Password must be at least 6 characters')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type GuestSignUpFormData = z.infer<typeof guestSignUpSchema>;

interface GuestSignUpPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionDuration: number; // in seconds
}

export function GuestSignUpPrompt({ 
  open, 
  onOpenChange, 
  sessionDuration 
}: GuestSignUpPromptProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<GuestSignUpFormData>({
    resolver: zodResolver(guestSignUpSchema),
  });

  const onSubmit = async (data: GuestSignUpFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('This email is already registered. Try logging in instead.');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      setSuccess(true);
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
    } catch (err) {
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaybeLater = () => {
    onOpenChange(false);
    navigate('/');
  };

  const handleGoToDashboard = () => {
    onOpenChange(false);
    navigate('/dashboard');
  };

  const minutes = Math.floor(sessionDuration / 60);
  const seconds = sessionDuration % 60;

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <div className="text-center space-y-6 py-6">
            <div className="flex items-center justify-center mb-4">
              <Mail className="h-16 w-16 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                Check your email
              </h2>
              <p className="text-gray-300 text-sm">
                We've sent you a verification link. Please check your email to complete registration.
              </p>
            </div>
            <Button 
              onClick={handleGoToDashboard}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Go to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <div className="space-y-6 py-6">
          {/* Header with session info */}
          <div className="text-center space-y-2">
            <p className="text-lg text-gray-300">🎉 Great practice session!</p>
            <p className="text-sm text-gray-400">
              Session Duration: {minutes}m {seconds}s
            </p>
          </div>

          {/* Main heading */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white leading-tight">
              Create an account to unlock more officers and areas of focus for your practice
            </h2>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Sign-up form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guest-email" className="text-gray-200">Email</Label>
              <Input
                id="guest-email"
                type="email"
                placeholder="Enter your email"
                {...form.register('email')}
                disabled={isLoading}
                className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-password" className="text-gray-200">Password</Label>
              <Input
                id="guest-password"
                type="password"
                placeholder="Enter your password (min 6 characters)"
                {...form.register('password')}
                disabled={isLoading}
                className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-confirm-password" className="text-gray-200">Confirm Password</Label>
              <Input
                id="guest-confirm-password"
                type="password"
                placeholder="Re-enter your password"
                {...form.register('confirmPassword')}
                disabled={isLoading}
                className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-3 pt-2">
              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6 text-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              <Button 
                type="button"
                variant="ghost"
                onClick={handleMaybeLater}
                disabled={isLoading}
                className="w-full text-gray-300 hover:text-white hover:bg-gray-700"
              >
                Maybe Later
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
