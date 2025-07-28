import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { StoryModal } from '@/components/story/StoryModal';
import { isDev, isDebugEnabled } from '@/lib/env';

export const StoryCard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showStoryModal, setShowStoryModal] = useState(false);

  const { data: activeStory, isLoading, error } = useQuery({
    queryKey: ['active-story', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('stories')
        .select('id, title, story_text, file_path')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 0, // Always refetch to ensure fresh data
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  // Compute story state: text first, then PDF - normalized for whitespace
  const hasText = typeof activeStory?.story_text === 'string' && activeStory.story_text.trim().length > 0;
  const hasPdf = !!activeStory?.file_path;
  const hasStory = hasText || hasPdf;

  // Debug logging when enabled
  useEffect(() => {
    if (isDebugEnabled('DEBUG_STORY')) {
      console.log('[DEBUG_STORY] Dashboard StoryCard:', { 
        userId: user?.id,
        hasText,
        hasPdf,
        hasStory, 
        storyLen: activeStory?.story_text?.length ?? null,
        trimmed: activeStory?.story_text?.trim().length ?? null,
        queryKey: ['active-story', user?.id]
      });
    }
  }, [hasText, hasPdf, hasStory, activeStory, user?.id]);

  // Listen for story changes from other components and invalidate cache
  useEffect(() => {
    const handleStoryChange = () => {
      if (isDebugEnabled('DEBUG_STORY')) {
        console.log('[DEBUG_STORY] Dashboard received storyChanged event, invalidating cache');
      }
      queryClient.invalidateQueries({ queryKey: ['active-story', user?.id] });
    };

    window.addEventListener('storyChanged', handleStoryChange);

    return () => {
      window.removeEventListener('storyChanged', handleStoryChange);
    };
  }, [queryClient, user?.id]);

  const handleStoryAction = () => {
    setShowStoryModal(true);
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

  // Error fallback - non-blocking
  if (error) {
    return (
      <Card className="h-20 bg-dashboard-blue border border-focus-border">
        <CardContent className="p-3 h-full flex flex-col justify-center items-center">
          <div className="text-xs text-red-400 text-center mb-2">Error loading story</div>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['active-story', user?.id] })}
            size="sm"
            variant="outline"
            className="h-6 text-xs"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-20 bg-dashboard-blue border border-focus-border">
        <CardContent className="p-3 h-full flex flex-col justify-between">
          <div className="text-sm font-medium text-focus-text text-center">
            {hasStory ? t('dashboard.asylum_story_ready') : t('dashboard.add_story_text')}
          </div>
          
          <Button 
            onClick={handleStoryAction}
            size="sm"
            variant="outline"
            className="w-full h-6 text-xs"
            aria-label={hasStory ? 'Edit asylum story' : 'Add asylum story'}
          >
            {hasStory ? t('dashboard.edit') : t('dashboard.add_story')}
          </Button>
        </CardContent>
      </Card>

      {/* Shared Story Modal - opens with PDF (recommended) for empty, text for existing */}
      <StoryModal
        isOpen={showStoryModal}
        onOpenChange={setShowStoryModal}
        defaultTab={hasText ? 'text' : 'pdf'}
        mode={hasStory ? 'edit' : 'create'}
        source="dashboard"
        existingText={activeStory?.story_text || ''}
      />
    </>
  );
};