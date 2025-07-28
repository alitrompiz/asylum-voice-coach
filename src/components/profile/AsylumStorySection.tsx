import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { StoryUploader } from '@/components/StoryUploader';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface AsylumStorySectionProps {
  activeStory: any;
  onStoryChange: () => void;
}

export const AsylumStorySection = ({ activeStory, onStoryChange }: AsylumStorySectionProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteStory = async () => {
    if (!user || !activeStory) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', activeStory.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: t('profile.story_deleted'),
      });
      
      // Emit story change event for dashboard cache invalidation
      window.dispatchEvent(new CustomEvent('storyChanged'));
      onStoryChange();
    } catch (error) {
      console.error('Error deleting story:', error);
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card id="asylum-story">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">{t('profile.asylum_story_title')}</CardTitle>
        {activeStory && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">{t('profile.delete_story')}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('profile.delete_story_confirm')}</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your asylum story.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('profile.cancel')}</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteStory}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('profile.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>
      <CardContent>
        <StoryUploader 
          onStoryAdded={onStoryChange}
          onStoryUpdated={onStoryChange}
          onStoryDeleted={onStoryChange}
        />
      </CardContent>
    </Card>
  );
};