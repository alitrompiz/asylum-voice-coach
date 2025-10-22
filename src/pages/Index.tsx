import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useHomePageContent } from '@/hooks/useHomePageContent';
import { PersonaCarousel } from '@/components/PersonaCarousel';
import { useAuth } from '@/hooks/useAuth';
import { usePersonaStore } from '@/stores/personaStore';
const Index = () => {
  const navigate = useNavigate();
  const {
    user,
    createGuestSession
  } = useAuth();
  const {
    setSelectedPersona
  } = usePersonaStore();
  const {
    data: content
  } = useHomePageContent();
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
      } catch (e) {
        // ignore
      }
    };
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(startCheck);
    } else {
      setTimeout(startCheck, 0);
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
  return <main className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-gray-900/95 border-b border-gray-700/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center gap-2">
              <span className="text-2xl font-display font-bold text-white">
                AsylumPrep
              </span>
            </div>
            
            {/* Login Button */}
            <Button variant="outline" onClick={() => navigate('/auth')} className="border-white text-gray-900 hover:bg-white hover:text-gray-900">
              Login
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Gradient Background */}
      <div className="relative overflow-hidden pt-20">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-brand opacity-100" style={{
        backgroundSize: '200% 200%'
      }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        </div>
        
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]" />
        
        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center max-w-5xl mx-auto">
            {/* Main Headline */}
            <h1 className="font-display text-4xl sm:text-4xl md:text-5xl font-extrabold mb-6 leading-tight lg:text-7xl">
              <span className="bg-gradient-to-r from-white via-blue-50 to-white bg-clip-text text-transparent drop-shadow-lg">
                {content?.hero_h1 || 'Welcome to AsylumPrep'}
              </span>
            </h1>
            
            {/* Subheadline with bullet points */}
            <ul className="text-sm sm:text-sm md:text-base text-blue-50 max-w-3xl mx-auto mb-10 leading-relaxed font-medium drop-shadow-md list-disc list-inside space-y-2 text-left rounded-sm">
              <li>Simulate real USCIS interviews</li>
              <li>Answer authentic questions tailored to your I-589 story</li>
              <li>Get AI-powered feedback trained by attorneys and asylum officers</li>
              <li>Find inconsistencies before they do</li>
              <li>Build the confidence you need to tell your story — and get your asylum granted</li>
            </ul>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button size="xl" variant="brand" className="bg-white text-primary hover:bg-blue-50 hover:text-primary-hover shadow-2xl group" onClick={() => {
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
      <div id="persona-carousel" className="bg-background py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">
              {content?.officer_picker_title || 'Choose Your Interview Officer'}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select an AI officer to practice with and get personalized feedback on your performance
            </p>
          </div>
          <PersonaCarousel onSelect={handleOfficerSelect} />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-surface py-12 border-t">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">© 2024 AsylumPrep. All rights reserved.</p>
        </div>
      </footer>
    </main>;
};
export default Index;