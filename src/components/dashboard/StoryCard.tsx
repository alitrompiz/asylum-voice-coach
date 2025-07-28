import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export const StoryCard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: activeStory, isLoading } = useQuery({
    queryKey: ['active-story', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('stories')
        .select('id, title, story_text')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const hasStory = !!activeStory?.story_text?.trim();

  const handleStoryAction = () => {
    navigate('/profile#asylum-story');
  };

  if (isLoading) {
    return (
      <Card className="h-20 bg-dashboard-blue border border-focus-border">
        <CardContent className="p-3 h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-focus-text"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-20 bg-dashboard-blue border border-focus-border">
      <CardContent className="p-3 h-full flex flex-col justify-between">
        <div className="text-sm font-medium text-focus-text text-center">
          {hasStory ? t('dashboard.asylum_story_ready') : t('dashboard.to_improve_interview')}
        </div>
        
        <Button 
          onClick={handleStoryAction}
          size="sm"
          variant="outline"
          className="w-full h-6 text-xs"
          aria-label={hasStory ? 'Edit asylum story' : 'Add asylum story'}
        >
          {hasStory ? t('dashboard.edit') : t('dashboard.add_asylum_story')}
        </Button>
      </CardContent>
    </Card>
  );
};