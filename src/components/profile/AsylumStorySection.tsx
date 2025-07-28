import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StoryModal } from '@/components/story/StoryModal';
import { isDev, isDebugEnabled } from '@/lib/env';

interface AsylumStorySectionProps {
  activeStory: any;
  onStoryChange: () => void;
}

export const AsylumStorySection = ({ activeStory, onStoryChange }: AsylumStorySectionProps) => {
  const { t } = useTranslation();
  const [showStoryModal, setShowStoryModal] = useState(false);

  // Debug logging
  useEffect(() => {
    if (isDebugEnabled('DEBUG_STORY')) {
      console.log('[DEBUG_STORY] AsylumStorySection:', { 
        hasText: activeStory?.story_text?.length > 0,
        hasPdf: !!activeStory?.file_path,
        computedHasStory: (activeStory?.story_text?.trim()?.length > 0) || !!activeStory?.file_path
      });
    }
  }, [activeStory]);

  const handleModalChange = () => {
    onStoryChange();
  };

  // Compute if we have story content
  const hasText = activeStory?.story_text?.trim()?.length > 0;
  const hasPdf = !!activeStory?.file_path;
  const hasStory = hasText || hasPdf;

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