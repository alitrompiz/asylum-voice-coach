import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { StoryUploader } from '@/components/StoryUploader';
import { Trash2, FileText, Upload, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface AsylumStorySectionProps {
  activeStory: any;
  onStoryChange: () => void;
}

const MAX_CHARS = 10000;

export const AsylumStorySection = ({ activeStory, onStoryChange }: AsylumStorySectionProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'pdf'>('text');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Handle URL tab parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'text' || tabParam === 'pdf') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_STORY === 'on') {
      console.log('[DEBUG_STORY] AsylumStorySection:', { 
        hasText: activeStory?.story_text?.length > 0,
        hasPdf: !!activeStory?.file_path,
        computedHasStory: (activeStory?.story_text?.trim()?.length > 0) || !!activeStory?.file_path
      });
    }
  }, [activeStory]);

  const handleSaveText = async () => {
    if (!user || !textContent.trim()) {
      toast({
        title: t('common.error'),
        description: t('profile.text_required'),
        variant: 'destructive',
      });
      return;
    }

    if (textContent.length > MAX_CHARS) {
      toast({
        title: t('common.error'),
        description: t('profile.text_too_long', { max: MAX_CHARS }),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (activeStory) {
        // Update existing story
        const { error } = await supabase
          .from('stories')
          .update({ 
            story_text: textContent,
            source_type: 'text',
            updated_at: new Date().toISOString()
          })
          .eq('id', activeStory.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new story
        const { error } = await supabase
          .from('stories')
          .insert({
            user_id: user.id,
            title: `Story ${new Date().toLocaleDateString()}`,
            story_text: textContent,
            source_type: 'text',
            is_active: true
          });

        if (error) throw error;
      }

      toast({
        title: t('profile.story_saved'),
      });

      // Invalidate queries and emit change event
      queryClient.invalidateQueries({ queryKey: ['active-story'] });
      window.dispatchEvent(new CustomEvent('storyChanged'));
      onStoryChange();
      setTextContent('');
    } catch (error) {
      console.error('Error saving story:', error);
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteText = async () => {
    if (!user || !activeStory) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('stories')
        .update({ 
          story_text: '',
          updated_at: new Date().toISOString()
        })
        .eq('id', activeStory.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: t('profile.story_deleted'),
      });
      
      // Invalidate queries and emit change event
      queryClient.invalidateQueries({ queryKey: ['active-story'] });
      window.dispatchEvent(new CustomEvent('storyChanged'));
      onStoryChange();
      setTextContent('');
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting story text:', error);
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStoryUploaderChange = () => {
    // Invalidate queries and emit change event
    queryClient.invalidateQueries({ queryKey: ['active-story'] });
    window.dispatchEvent(new CustomEvent('storyChanged'));
    onStoryChange();
  };

  // Compute if we have story content
  const hasText = activeStory?.story_text?.trim()?.length > 0;
  const hasPdf = !!activeStory?.file_path;
  const hasStory = hasText || hasPdf;

  // Initialize text content when editing
  useEffect(() => {
    if (hasText && !textContent) {
      setTextContent(activeStory.story_text);
    }
  }, [hasText, activeStory?.story_text, textContent]);

  const charCount = textContent.length;

  return (
    <Card id="asylum-story">
      <CardHeader>
        <CardTitle className="text-lg">{t('profile.asylum_story_title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'text' | 'pdf')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('profile.text_tab')}
            </TabsTrigger>
            <TabsTrigger value="pdf" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {t('profile.pdf_tab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 mt-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('profile.text_helper')}
              </p>
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={t('profile.text_placeholder')}
                className="min-h-[200px] resize-none"
                aria-label={t('profile.asylum_story_text_label')}
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {charCount} / {MAX_CHARS} {t('profile.characters')}
                </span>
                {charCount > MAX_CHARS && (
                  <span className="text-destructive">
                    {t('profile.text_too_long_inline')}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleSaveText}
                disabled={isSaving || charCount > MAX_CHARS || !textContent.trim()}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {t('profile.save')}
              </Button>
              
              {hasText && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('profile.delete')}
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pdf" className="mt-4">
            <StoryUploader 
              activeMode="upload"
              onStoryAdded={handleStoryUploaderChange}
              onStoryUpdated={handleStoryUploaderChange}
              onStoryDeleted={handleStoryUploaderChange}
            />
          </TabsContent>
        </Tabs>

        {/* Delete Text Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('profile.delete_text_confirm')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('profile.delete_text_description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('profile.cancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteText}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('profile.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};