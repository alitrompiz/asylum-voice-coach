import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface HomePageContent {
  hero_h1: string;
  hero_p1: string;
  officer_picker_title: string;
}

const fallbackContent: HomePageContent = {
  hero_h1: 'Prepare for Your Asylum Interview',
  hero_p1: 'Practice with AI-powered voice coaching to build confidence and improve your asylum interview skills',
  officer_picker_title: 'Who do you want to practice with today?'
};

export const useHomePageContent = () => {
  return useQuery({
    queryKey: ['home-page-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_page_content')
        .select('*');
      
      if (error) throw error;
      
      // Transform array to object for easy access
      const content = data.reduce((acc, item) => ({
        ...acc,
        [item.section_key]: item.content
      }), {} as Record<string, string>);
      
      return { ...fallbackContent, ...content } as HomePageContent;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: fallbackContent,
  });
};
