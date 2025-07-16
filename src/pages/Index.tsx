import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Shield, Globe, Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

const Index = () => {
  const navigate = useNavigate();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    // Check for error parameters in URL hash (from failed verification)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    
    if (error) {
      if (error === 'access_denied' && errorDescription?.includes('expired')) {
        toast.error('Email verification link has expired. Please request a new one.');
      } else {
        toast.error(errorDescription || 'Email verification failed');
      }
      // Clean up the URL hash
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // If user is authenticated after email verification, redirect to dashboard
    if (isInitialized && user) {
      toast.success('Email verified successfully! Welcome to AsylumPrep.');
      navigate('/dashboard');
    }
  }, [user, isInitialized, navigate]);
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Prepare for Your 
            <span className="text-primary"> Asylum Interview</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Practice with AI-powered voice coaching to build confidence and improve your asylum interview skills
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth/register">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose AsylumPrep?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <Mic className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Voice Practice</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Practice speaking with AI-powered voice recognition and feedback
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Shield className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Secure & Private</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Your personal information and practice sessions are completely secure
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Globe className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Multi-Language</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Practice in multiple languages with native-level AI coaching
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Clock className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Flexible Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Practice anytime, anywhere with our mobile-friendly platform
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Practicing?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of asylum seekers who have improved their confidence with AsylumPrep
          </p>
          <Button size="lg" asChild>
            <Link to="/auth/register">Start Free Trial</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
