import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
      <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
        <CardContent className="p-3 flex items-center justify-center h-16">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
      <CardContent className="p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-medium text-white">
              {hasStory ? 'Story Ready' : 'Add Story'}
            </span>
          </div>
          {hasStory && <CheckCircle className="h-3.5 w-3.5 text-green-400" />}
        </div>
        
        <div className="text-xs text-gray-300 leading-relaxed">
          {hasStory 
            ? 'Your asylum story is ready for interview practice'
            : 'Add your story to improve practice sessions'
          }
        </div>
        
        <Button 
          variant={hasStory ? "outline" : "default"}
          size="sm" 
          className="w-full h-7 text-xs"
          onClick={handleStoryAction}
        >
          {hasStory ? (
            <>
              <Edit3 className="mr-1 h-3 w-3" />
              Edit
            </>
          ) : (
            <>
              <Plus className="mr-1 h-3 w-3" />
              Add Story
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};