import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, Edit3 } from 'lucide-react';
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
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error;
      }

      return data;
    },
    enabled: !!user,
  });

  const hasStory = !!activeStory?.story_text?.trim();

  const handleStoryAction = () => {
    // Navigate to story management (you may need to create this route)
    navigate('/onboarding?step=story');
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          <span className="font-medium text-sm">
            {hasStory ? 'Asylum Story' : 'Add Your Story'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasStory ? (
          <>
            <div className="text-sm text-muted-foreground">
              {activeStory.title || 'Your asylum story is ready for practice'}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={handleStoryAction}
            >
              <Edit3 className="mr-2 h-4 w-4" />
              {t('dashboard.editStory')}
            </Button>
          </>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              {t('dashboard.addStoryDescription')}
            </div>
            <Button 
              size="sm" 
              className="w-full"
              onClick={handleStoryAction}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Asylum Story
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};