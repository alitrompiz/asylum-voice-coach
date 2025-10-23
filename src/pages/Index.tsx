import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useHomePageContent } from '@/hooks/useHomePageContent';
import { PersonaCarousel } from '@/components/PersonaCarousel';
import { useAuth } from '@/hooks/useAuth';
import { usePersonaStore } from '@/stores/personaStore';
import { Skeleton } from '@/components/ui/skeleton';
const Index = () => {
  const navigate = useNavigate();
  const {
    user,
    createGuestSession,
    loading: authLoading
  } = useAuth();
  const {
    setSelectedPersona
  } = usePersonaStore();
  const {
    data: content,
    isLoading: contentLoading,
    error: contentError
  } = useHomePageContent();
  const [carouselError, setCarouselError] = useState<Error | null>(null);

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-2xl px-4">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
          <div className="grid grid-cols-3 gap-4 mt-8">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Log content errors for debugging
  if (contentError) {
    console.error('[Index] Failed to load home page content:', contentError);
  }
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

    // Defer auth check to avoid blocking initial paint
    const startCheck = async () => {
      try {
        const {
          supabase
        } = await import('@/integrations/supabase/client');
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        if (session?.user) {
          toast.success('Welcome back!');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('[Index] Auth check failed:', error);
        // Silently fail - don't block the page from loading
      }
    };
    
    // Browser-compatible idle callback
    try {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(startCheck);
      } else {
        setTimeout(startCheck, 0);
      }
    } catch (error) {
      console.error('[Index] Failed to schedule auth check:', error);
    }
  }, [navigate]);
  const handleOfficerSelect = (personaId: string) => {
    setSelectedPersona(personaId);
    if (user) {
      navigate('/onboarding');
    } else {
      // Guest flow: create session and navigate
      createGuestSession();
      navigate('/onboarding');
    }
  };
  return <main className="min-h-screen bg-[hsl(var(--dashboard-blue))]">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-[hsl(var(--dashboard-blue))]/95 border-b border-blue-800/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center gap-2">
              <span className="text-2xl font-display font-bold text-white">
                AsylumPrep
              </span>
            </div>
            
            {/* Login Button */}
            <Button variant="outline" onClick={() => navigate('/auth')} className="border-white/30 text-white hover:bg-white/10 hover:text-white hover:border-white/50">
              Login
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-20">
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]" />
        
        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          <div className="text-center max-w-5xl mx-auto">
            {/* Main Headline */}
            <h1 className="font-display text-4xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-tight lg:text-7xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {content?.hero_h1 || 'Practice your asylum interview.'}
            </h1>
            
            {/* Subheadline with bullet points */}
            <ul className="text-sm sm:text-sm md:text-base text-blue-50 max-w-3xl mx-auto mb-6 leading-snug font-medium drop-shadow-md list-disc list-inside space-y-0.5 text-left rounded-sm">
              <li>Simulate real USCIS asylum interviews tailored to your story</li>
              <li>Practice describing your past harm, relocation, and fear of future persecution</li>
              <li>Get feedback to improve your asylum interviewing skills</li>
              <li>Build the confidence you need to tell your story — and get your asylum granted</li>
            </ul>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="xl" variant="brand" className="bg-white text-primary hover:bg-blue-50 hover:text-primary-hover shadow-2xl group focus-visible:ring-4 focus-visible:ring-white/50" onClick={() => {
              const carousel = document.getElementById('persona-carousel');
              carousel?.scrollIntoView({
                behavior: 'smooth'
              });
            }}>
                <span className="font-bold">Start Practicing Free</span>
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-sm sm:text-base text-blue-50/90">
              <div className="flex items-center gap-2 backdrop-blur-sm bg-white/10 px-4 py-2 rounded-full">
                <svg className="w-5 h-5 fill-yellow-300 text-yellow-300" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-semibold">4.9/5 Rating</span>
              </div>
              <div className="flex items-center gap-2 backdrop-blur-sm bg-white/10 px-4 py-2 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold">95% Success Rate</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Officer Selection Section */}
      <div id="persona-carousel" className="bg-[hsl(var(--dashboard-blue))] py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-3">
            <h2 className="font-display text-base sm:text-lg md:text-xl font-bold text-white">
              Which officer do you want to practice with today?
            </h2>
          </div>
          {carouselError ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">Failed to load interview officers</p>
              <Button onClick={() => {
                setCarouselError(null);
                window.location.reload();
              }}>
                Retry
              </Button>
            </div>
          ) : (
            <PersonaCarousel 
              onSelect={handleOfficerSelect}
              onError={(error) => {
                console.error('[Index] PersonaCarousel error:', error);
                setCarouselError(error);
              }}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[hsl(var(--dashboard-blue))] py-12 border-t border-blue-800/30">
        <div className="container mx-auto px-4 text-center">
          <p className="text-blue-100">© 2024 AsylumPrep. All rights reserved.</p>
        </div>
      </footer>
    </main>;
};
export default Index;