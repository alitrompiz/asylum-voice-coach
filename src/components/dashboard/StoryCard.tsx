import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, Edit3, CheckCircle } from 'lucide-react';
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
    navigate('/onboarding?step=story');
  };

  if (isLoading) {
    return (
      <Card className="h-20 bg-gray-900 border border-gray-600">
        <CardContent className="p-3 h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-20 bg-gray-900 border border-gray-600">
      <CardContent className="p-3 h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-300" />
          <div>
            <div className="text-sm font-medium text-gray-300">
              {hasStory ? 'Story Ready' : 'Add Asylum Story'}
            </div>
            <div className="text-xs text-gray-300">
              {hasStory 
                ? 'Ready for practice'
                : 'Add asylum story to improve your interview practice'
              }
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleStoryAction}
          className="p-1 hover:bg-gray-700 rounded"
          aria-label={hasStory ? 'Edit asylum story' : 'Add asylum story'}
        >
          {hasStory ? (
            <Edit3 className="h-4 w-4 text-gray-300" />
          ) : (
            <Plus className="h-4 w-4 text-gray-300" />
          )}
        </button>
      </CardContent>
    </Card>
  );
};