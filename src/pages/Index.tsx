
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
  const { user, createGuestSession } = useAuth();
  const { setSelectedPersona } = usePersonaStore();
  const { data: content } = useHomePageContent();
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
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white">
            {content?.hero_h1}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            {content?.hero_p1}
          </p>
        </section>

        {/* Officer Picker Section */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-white">
            {content?.officer_picker_title}
          </h2>
          <PersonaCarousel onSelect={handleOfficerSelect} />
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-white/10 text-center">
          <p className="text-sm text-gray-400">
            © 2024 AsylumPrep. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
