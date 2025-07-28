import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StoryModal } from '@/components/story/StoryModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { isDev, isDebugEnabled } from '@/lib/env';

interface AsylumStorySectionProps {
  onStoryChange?: () => void; // Made optional since we'll use React Query invalidation
}

export const AsylumStorySection = ({ onStoryChange }: AsylumStorySectionProps) => {
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
    refetchOnMount: 'always', // Always refetch on mount
  });

  // Debug logging
  useEffect(() => {
    if (isDebugEnabled('DEBUG_STORY')) {
      console.log('[DEBUG_STORY] AsylumStorySection (Profile):', { 
        userId: user?.id,
        hasText: activeStory?.story_text?.trim()?.length > 0,
        hasPdf: !!activeStory?.file_path,
        storyLen: activeStory?.story_text?.length ?? null,
        trimmed: activeStory?.story_text?.trim().length ?? null,
        queryKey: ['active-story', user?.id]
      });
    }
  }, [activeStory, user?.id]);

  const handleModalChange = () => {
    // Call optional callback if provided (for Profile.tsx compatibility)
    onStoryChange?.();
  };

  // Compute if we have story content - text OR PDF determines "loaded" status
  const hasText = typeof activeStory?.story_text === 'string' && activeStory.story_text.trim().length > 0;
  const hasPdf = !!activeStory?.file_path;
  const hasStory = hasText || hasPdf; // Either text OR PDF shows "loaded"

  if (isLoading) {
    return (
      <Card id="asylum-story">
        <CardHeader>
          <CardTitle className="text-lg">{t('profile.asylum_story_title')}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-focus-text"></div>
        </CardContent>
      </Card>
    );
  }

  // Error fallback - non-blocking
  if (error) {
    return (
      <Card id="asylum-story">
        <CardHeader>
          <CardTitle className="text-lg">{t('profile.asylum_story_title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-xs text-red-400 text-center mb-2">Error loading story</div>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['active-story', user?.id] })}
            size="sm"
            variant="outline"
            className="w-full"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card id="asylum-story">
        <CardHeader>
          <CardTitle className="text-lg">{t('profile.asylum_story_title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {hasStory 
              ? t('dashboard.asylum_story_ready') 
              : t('dashboard.add_story_text')
            }
          </div>
          
          <Button 
            onClick={() => setShowStoryModal(true)}
            className="w-full"
          >
            {hasStory ? t('dashboard.edit') : t('dashboard.add_story')}
          </Button>
        </CardContent>
      </Card>

      {/* Shared Story Modal - replace in-page editor with modal */}
      <StoryModal
        isOpen={showStoryModal}
        onOpenChange={(open) => {
          setShowStoryModal(open);
          if (!open) handleModalChange();
        }}
        defaultTab={hasText ? 'text' : 'pdf'}
        mode={hasStory ? 'edit' : 'create'}
        source="profile"
        existingText={activeStory?.story_text || ''}
      />
    </>
  );
};