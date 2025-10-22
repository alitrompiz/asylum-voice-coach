import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, signupSchema, LoginFormData, SignupFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

type AuthMode = 'login' | 'signup';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, createGuestSession } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await signIn(data.email, data.password);

      if (signInError) {
        if (signInError.message === 'Invalid login credentials') {
          setError('Invalid email or password. Please try again.');
        } else if (signInError.message === 'Email not confirmed') {
          setError('Please verify your email address before signing in.');
        } else {
          setError(signInError.message);
        }
        return;
      }

      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onSignupSubmit = async (data: SignupFormData) => {
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
        setError(signUpError.message);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = () => {
    createGuestSession('Guest User');
    navigate('/dashboard');
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
        <Card className="w-full max-w-md bg-gray-900/50 border-gray-800">
          <CardContent className="pt-6">
            <p className="text-gray-200 text-center mb-4">
              Check your email for the verification link.
            </p>
            <Button
              onClick={() => {
                setSuccess(false);
                setMode('login');
              }}
              className="w-full"
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-900/50 border-gray-800">
        <CardContent className="pt-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={mode === 'login' ? loginForm.handleSubmit(onLoginSubmit) : signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-200">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                {...(mode === 'login' ? loginForm.register('email') : signupForm.register('email'))}
                disabled={isLoading}
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
              />
              {(mode === 'login' ? loginForm.formState.errors.email : signupForm.formState.errors.email) && (
                <p className="text-sm text-destructive">
                  {(mode === 'login' ? loginForm.formState.errors.email : signupForm.formState.errors.email)?.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-200">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                {...(mode === 'login' ? loginForm.register('password') : signupForm.register('password'))}
                disabled={isLoading}
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
              />
              {(mode === 'login' ? loginForm.formState.errors.password : signupForm.formState.errors.password) && (
                <p className="text-sm text-destructive">
                  {(mode === 'login' ? loginForm.formState.errors.password : signupForm.formState.errors.password)?.message}
                </p>
              )}
            </div>

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-200">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm Password"
                  {...signupForm.register('confirmPassword')}
                  disabled={isLoading}
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                />
                {signupForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {signupForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ...
                </>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </Button>

            {mode === 'login' && (
              <div className="text-center">
                <Link 
                  to="/auth/forgot-password" 
                  className="text-sm text-gray-400 hover:text-gray-200"
                >
                  Forgot password?
                </Link>
              </div>
            )}
          </form>

          <div className="mt-6 text-center text-sm">
            <Button
              variant="link"
              className="p-0 h-auto font-normal text-gray-400 hover:text-gray-200"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
