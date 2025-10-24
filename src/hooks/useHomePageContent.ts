import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface HomePageContent {
  hero_h1: string;
  hero_p1: string;
  officer_picker_title: string;
}

const fallbackContent: HomePageContent = {
  hero_h1: 'Turn Your Asylum Story Into a Winning Interview',
  hero_p1: '- Simulate real USCIS interviews.\n- Answer authentic questions tailored to your I-589 story.\n- Get AI-powered feedback trained by attorneys and asylum officers.\n- Find inconsistencies before they do.\n- Build the confidence you need to tell your story — and get your asylum granted.',
  officer_picker_title: 'Which officer do you want to practice with today?'
};

export const useHomePageContent = () => {
  return useQuery({
    queryKey: ['home-page-content'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('home_page_content')
          .select('*');
        
        if (error) {
          console.error('[useHomePageContent] Supabase error:', error);
          // Return fallback content on error
          return fallbackContent;
        }
        
        // Transform array to object for easy access
        const content = data.reduce((acc, item) => ({
          ...acc,
          [item.section_key]: item.content
        }), {} as Record<string, string>);
        
        return { ...fallbackContent, ...content } as HomePageContent;
      } catch (error) {
        console.error('[useHomePageContent] Unexpected error:', error);
        // Always return fallback content to prevent blank screens
        return fallbackContent;
      }
    },
    staleTime: 30 * 1000, // 30 seconds - allows quick reflection of admin changes
    gcTime: 5 * 60 * 1000, // 5 minutes - cache for longer
    placeholderData: fallbackContent,
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};
