import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Verify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Check for error parameters in URL hash (from failed verification)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        
        if (error) {
          setVerificationStatus('error');
          setError(errorDescription || 'Email verification failed');
          return;
        }

        // Check if user is already authenticated (verification was successful)
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setVerificationStatus('success');
          toast.success('Email verified successfully!');
          setTimeout(() => navigate('/dashboard'), 2000);
          return;
        }

        // If no user and no error, check for OTP verification parameters
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        
        if (token && type === 'signup') {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          });

          if (error) {
            setVerificationStatus('error');
            setError(error.message);
          } else {
            setVerificationStatus('success');
            toast.success('Email verified successfully!');
            setTimeout(() => navigate('/dashboard'), 2000);
          }
        } else {
          // No verification parameters and no user - show waiting state
          setVerificationStatus('error');
          setError('Please check your email and click the verification link');
        }
      } catch (err: any) {
        setVerificationStatus('error');
        setError(err.message || 'Verification failed');
      }
    };

    handleEmailVerification();
  }, [searchParams, navigate]);

  const handleResendVerification = async () => {
    const email = searchParams.get('email');
    if (!email) {
      toast.error('Email not found in URL');
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Verification email sent!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend verification');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-900/50 border-gray-800">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            {verificationStatus === 'loading' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-gray-200 text-center">Verifying...</p>
              </>
            )}
            {verificationStatus === 'success' && (
              <>
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-gray-200 text-center">Verified</p>
                <Button onClick={() => navigate('/dashboard')} className="w-full">
                  Go to Dashboard
                </Button>
              </>
            )}
            {verificationStatus === 'error' && (
              <>
                <XCircle className="h-12 w-12 text-red-500" />
                <p className="text-gray-200 text-center mb-2">{error}</p>
                <div className="flex flex-col space-y-2 w-full">
                  <Button onClick={handleResendVerification} className="w-full">
                    Resend
                  </Button>
                  <Button onClick={() => navigate('/auth/login')} variant="outline" className="w-full">
                    Back to Login
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}