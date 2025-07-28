import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useOcrJob } from '@/hooks/useOcrJob';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Trash2, CheckCircle, Loader2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { isDebugEnabled } from '@/lib/env';

interface StoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'pdf' | 'text';
  mode?: 'create' | 'edit';
  source?: 'dashboard' | 'profile';
  // For edit mode - pass the existing story text
  existingText?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CHARS = 10000; // Character limit for text
const OCR_TIMEOUT_MS = 90000; // 90 seconds

// Unified state flow
type StoryModalState = 'idle' | 'uploading' | 'ocr_processing' | 'preview_ready' | 'saving' | 'saved' | 'error';

// Query key function for consistent cache invalidation
const getStoryQueryKey = (userId: string | undefined) => ['active-story', String(userId)];

export const StoryModal = ({
  isOpen,
  onOpenChange,
  defaultTab = 'pdf',
  mode = 'create',
  source = 'dashboard',
  existingText = ''
}: StoryModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'pdf' | 'text'>(defaultTab);
  const [textContent, setTextContent] = useState(existingText);
  const [modalState, setModalState] = useState<StoryModalState>('idle');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentFileName, setCurrentFileName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { job: ocrJob } = useOcrJob(currentJobId);

  // Debug logging
  const logStateTransition = (from: StoryModalState, to: StoryModalState, extra?: any) => {
    if (isDebugEnabled('DEBUG_STORY')) {
      console.log(`[DEBUG_STORY] State: ${from} → ${to}`, extra || '');
    }
  };

  // Initialize modal state
  useEffect(() => {
    if (isOpen) {
      setModalState('idle');
      setErrorMessage('');
      setCurrentJobId(null);
      setOcrText('');
      
      if (mode === 'edit') {
        setTextContent(existingText);
      } else {
        setTextContent('');
        // Clear cache immediately for create mode
        queryClient.setQueryData(getStoryQueryKey(user?.id), null);
      }
    }
  }, [isOpen, mode, existingText, user?.id, queryClient]);

  // OCR timeout handler
  useEffect(() => {
    if (modalState === 'ocr_processing') {
      ocrTimeoutRef.current = setTimeout(() => {
        logStateTransition('ocr_processing', 'error', 'timeout');
        setModalState('error');
        setErrorMessage(t('story.processing_timeout'));
        setCurrentJobId(null);
      }, OCR_TIMEOUT_MS);
    } else {
      if (ocrTimeoutRef.current) {
        clearTimeout(ocrTimeoutRef.current);
        ocrTimeoutRef.current = null;
      }
    }

    return () => {
      if (ocrTimeoutRef.current) {
        clearTimeout(ocrTimeoutRef.current);
      }
    };
  }, [modalState, t]);

  // Handle OCR completion async function
  const handleOcrCompletion = async (storyId: string) => {
    try {
      if (isDebugEnabled('DEBUG_STORY')) {
        console.log(`[DEBUG_STORY] OCR completed, fetching story ${storyId}`);
      }
      
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .select('story_text')
        .eq('id', storyId)
        .single();
        
      if (storyError || !story) {
        console.error('Error fetching OCR story:', storyError);
        throw new Error('Failed to fetch OCR story');
      }
      
      const extractedText = story.story_text || '';
      
      logStateTransition('ocr_processing', 'preview_ready', `chars=${extractedText.length}`);
      
      setOcrText(extractedText);
      setModalState('preview_ready');
      // Don't clear currentJobId until after state transition
      setTimeout(() => setCurrentJobId(null), 100);
      
      // Auto-focus the preview editor
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 200);

      // Check for empty/poor OCR results
      if (extractedText.trim().length < 50) {
        toast({
          title: t('story.ocr_warning'),
          description: t('story.ocr_poor_quality'),
          variant: 'default'
        });
      }
      
      if (isDebugEnabled('DEBUG_STORY')) {
        console.log(`[DEBUG_STORY] ocr_done(chars=${extractedText.length})`);
      }
      
    } catch (error) {
      console.error('Error processing OCR completion:', error);
      logStateTransition('ocr_processing', 'error', 'Failed to fetch story');
      setModalState('error');
      setErrorMessage(t('story.ocr_failed_desc'));
      setCurrentJobId(null);
    }
  };

  // Handle OCR job updates - fixed dependency array to prevent clearing currentJobId too early
  useEffect(() => {
    console.log(`[STORY_MODAL] OCR useEffect triggered - currentJobId: ${currentJobId}, ocrJob:`, ocrJob);
    
    if (!currentJobId || !ocrJob) {
      console.log(`[STORY_MODAL] Skipping OCR processing - missing currentJobId or ocrJob`);
      return;
    }

    if (isDebugEnabled('DEBUG_STORY')) {
      console.log(`[DEBUG_STORY] OCR update: jobId=${currentJobId}, status=${ocrJob.status}, progress=${ocrJob.progress}`);
    }

    if (ocrJob.status === 'completed' && ocrJob.result?.story_id) {
      // OCR completed - fetch the created story from the database
      const storyId = ocrJob.result.story_id;
      handleOcrCompletion(storyId);
      
    } else if (ocrJob.status === 'failed') {
      logStateTransition('ocr_processing', 'error', ocrJob.error_message);
      setModalState('error');
      setErrorMessage(ocrJob.error_message || t('story.processing_failed'));
      setCurrentJobId(null);
      
      if (isDebugEnabled('DEBUG_STORY')) {
        console.log(`[DEBUG_STORY] ocr_failed: ${ocrJob.error_message}`);
      }
    }
  }, [ocrJob?.status, ocrJob?.result, currentJobId, t]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: t('common.error'),
        description: t('story.file_too_large'),
        variant: 'destructive'
      });
      return;
    }

    if (file.type !== 'application/pdf') {
      toast({
        title: t('common.error'),
        description: t('story.invalid_file_type'),
        variant: 'destructive'
      });
      return;
    }

    if (isDebugEnabled('DEBUG_STORY')) {
      console.log(`[DEBUG_STORY] upload_start → file=${file.name}, size=${file.size}`);
    }
    
    logStateTransition('idle', 'uploading', `file=${file.name}`);
    setModalState('uploading');
    setCurrentFileName(file.name);

    try {
      // Get signed URL for S3 upload
      const { data: signedUrlData, error: signedUrlError } = await supabase.functions.invoke('get-signed-url', {
        body: {
          fileName: file.name,
          contentType: file.type
        }
      });

      if (signedUrlError) throw signedUrlError;

      // Upload to S3
      const uploadResponse = await fetch(signedUrlData.signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload file');

      if (isDebugEnabled('DEBUG_STORY')) {
        console.log(`[DEBUG_STORY] upload_done(fileId=${signedUrlData.filePath})`);
      }

      logStateTransition('uploading', 'ocr_processing');
      setModalState('ocr_processing');

      // Start OCR processing
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('ocr-pdf', {
        body: {
          filePath: signedUrlData.filePath,
          fileName: file.name
        }
      });

      if (ocrError) throw ocrError;

      if (isDebugEnabled('DEBUG_STORY')) {
        console.log(`[DEBUG_STORY] ocr_start(jobId=${ocrData.jobId})`);
      }

      setCurrentJobId(ocrData.jobId);

    } catch (error) {
      console.error('Upload error:', error);
      logStateTransition(modalState, 'error', error);
      setModalState('error');
      setErrorMessage(t('story.upload_failed_desc'));
    } finally {
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveStory = async (textToSave: string) => {
    if (!user || !textToSave.trim()) {
      toast({
        title: t('common.error'),
        description: t('story.text_required'),
        variant: 'destructive',
      });
      return;
    }

    if (textToSave.length > MAX_CHARS) {
      toast({
        title: t('common.error'),
        description: t('story.text_too_long', { max: MAX_CHARS }),
        variant: 'destructive',
      });
      return;
    }

    const queryKey = getStoryQueryKey(user.id);
    
    if (isDebugEnabled('DEBUG_STORY')) {
      console.log(`[DEBUG_STORY] save_start → userId=${user.id}, queryKey=${JSON.stringify(queryKey)}, mode=${mode}, modalState=${modalState}`);
    }

    logStateTransition(modalState, 'saving');
    setModalState('saving');

    try {
      // Cancel any in-flight queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey });
      
      if (mode === 'edit') {
        // Update existing active story
        const { error } = await supabase
          .from('stories')
          .update({ 
            story_text: textToSave,
            source_type: modalState === 'preview_ready' ? 'pdf' : 'text',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (error) throw error;
      } else {
        // For create mode, check if user already has an active story
        const { data: existingStory } = await supabase
          .from('stories')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        const storyData = {
          story_text: textToSave,
          source_type: modalState === 'preview_ready' ? 'pdf' : 'text',
          title: modalState === 'preview_ready' ? `OCR Story - ${currentFileName}` : `Story ${new Date().toLocaleDateString()}`,
          updated_at: new Date().toISOString()
        };

        if (existingStory) {
          // Update existing story
          const { error } = await supabase
            .from('stories')
            .update(storyData)
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (error) throw error;
        } else {
          // Create new story
          const { error } = await supabase
            .from('stories')
            .insert({
              user_id: user.id,
              is_active: true,
              ...storyData
            });

          if (error) throw error;
        }
      }

      // Immediate cache update for instant UI response
      queryClient.setQueryData(queryKey, { 
        story_text: textToSave,
        source_type: modalState === 'preview_ready' ? 'pdf' : 'text',
        file_path: modalState === 'preview_ready' ? `stories/${Date.now()}-${currentFileName}` : null
      });
      
      // Invalidate and refetch to ensure consistency
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.refetchQueries({ queryKey });
      
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('storyChanged'));
      
      logStateTransition('saving', 'saved');
      setModalState('saved');

      if (isDebugEnabled('DEBUG_STORY')) {
        console.log(`[DEBUG_STORY] save_success → userId=${user.id}, queryKey=${JSON.stringify(queryKey)}`);
      }

      toast({
        title: t('story.story_saved'),
      });

      // Close modal after brief delay
      setTimeout(() => {
        onOpenChange(false);
      }, 500);
      
    } catch (error) {
      console.error('Error saving story:', error);
      logStateTransition('saving', 'error', error);
      setModalState('error');
      setErrorMessage(t('story.save_failed'));
    }
  };

  const handleDeleteStory = async () => {
    if (!user) return;
    
    logStateTransition(modalState, 'saving', 'delete');
    setModalState('saving');
    
    try {
      // Cancel any in-flight queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: getStoryQueryKey(user.id) });
      
      const { error } = await supabase
        .from('stories')
        .update({ 
          story_text: '',
          file_path: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      // Clear cache immediately
      queryClient.setQueryData(getStoryQueryKey(user.id), null);
      
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: getStoryQueryKey(user.id) });
      await queryClient.refetchQueries({ queryKey: getStoryQueryKey(user.id) });
      window.dispatchEvent(new CustomEvent('storyChanged'));
      
      toast({
        title: t('story.story_deleted'),
      });
      
      onOpenChange(false);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting story:', error);
      setModalState('error');
      setErrorMessage(t('story.delete_failed'));
    }
  };

  const retryOcr = () => {
    logStateTransition(modalState, 'idle', 'retry');
    setModalState('idle');
    setErrorMessage('');
    setCurrentJobId(null);
    setOcrText('');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const switchToPasteText = () => {
    setActiveTab('text');
    if (ocrText) {
      setTextContent(ocrText);
    }
    setModalState('idle');
    setErrorMessage('');
    setCurrentJobId(null);
    setOcrText('');
  };

  const resetModal = () => {
    setModalState('idle');
    setErrorMessage('');
    setCurrentJobId(null);
    setOcrText('');
  };

  // Computed states
  const charCount = modalState === 'preview_ready' ? ocrText.length : textContent.length;
  const currentText = modalState === 'preview_ready' ? ocrText : textContent;
  const isProcessing = modalState === 'uploading' || modalState === 'ocr_processing';
  const isSaving = modalState === 'saving';
  const isError = modalState === 'error';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === 'edit' ? t('story.edit_story') : t('story.add_story')}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pdf' | 'text')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pdf" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {t('story.upload_pdf')}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {t('story.recommended')}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t('story.paste_text')}
              </TabsTrigger>
            </TabsList>

            {/* PDF Upload Tab */}
            <TabsContent value="pdf" className="space-y-4 mt-4">
              {/* Idle State - File Upload */}
              {modalState === 'idle' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t('story.pdf_helper')}
                  </p>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      size="lg"
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      {t('story.choose_pdf')}
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('story.pdf_size_limit')}
                    </p>
                  </div>
                </div>
              )}

              {/* Uploading State */}
              {modalState === 'uploading' && (
                <div className="space-y-4 p-4 border rounded-lg" role="status" aria-live="polite">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <h4 className="font-medium">{t('story.uploading')}</h4>
                  </div>
                  <Progress value={50} className="w-full" />
                </div>
              )}

              {/* OCR Processing State */}
              {modalState === 'ocr_processing' && (
                <div className="space-y-4 p-4 border rounded-lg" role="status" aria-live="polite">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <h4 className="font-medium">{t('story.processing_with_ocr')}</h4>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('story.processing')}</span>
                      <span>{ocrJob?.progress || 0}%</span>
                    </div>
                    <Progress value={ocrJob?.progress || 0} className="w-full" />
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('story.processing_background')}</span>
                  </div>
                </div>
              )}

              {/* Preview Ready State */}
              {modalState === 'preview_ready' && (
                <div className="space-y-4" role="region" aria-live="polite">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium">{t('story.preview_edit')}</h4>
                  </div>
                  
                  <div className="space-y-2">
                    <Textarea
                      ref={textareaRef}
                      value={ocrText}
                      onChange={(e) => setOcrText(e.target.value)}
                      className="min-h-[320px] max-h-[480px] md:max-h-[60vh] resize-none overflow-y-auto"
                      placeholder={t('story.extracted_text_placeholder')}
                      aria-label={t('story.preview_edit')}
                    />
                    
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{ocrText.length} / {MAX_CHARS} {t('story.characters')}</span>
                      {ocrText.length > MAX_CHARS && (
                        <span className="text-destructive">{t('story.text_too_long_inline')}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={() => handleSaveStory(ocrText)}
                      disabled={isSaving || ocrText.length > MAX_CHARS || !ocrText.trim()}
                      className="min-h-[44px]"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      {t('story.accept_save')}
                    </Button>
                    <Button onClick={retryOcr} variant="outline" className="min-h-[44px]">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('story.retry_ocr')}
                    </Button>
                    <Button onClick={switchToPasteText} variant="outline" className="min-h-[44px]">
                      <FileText className="w-4 h-4 mr-2" />
                      {t('story.switch_to_text')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Error State */}
              {isError && (
                <div className="space-y-4 p-4 border border-destructive/20 rounded-lg" role="alert" aria-live="assertive">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    <h4 className="font-medium">{t('story.error_occurred')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{errorMessage}</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={retryOcr} variant="outline" className="min-h-[44px]">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('story.retry_ocr')}
                    </Button>
                    <Button onClick={switchToPasteText} variant="outline" className="min-h-[44px]">
                      <FileText className="w-4 h-4 mr-2" />
                      {t('story.switch_to_text')}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Text Tab */}
            <TabsContent value="text" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                {t('story.text_helper')}
              </p>
              
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={t('story.text_placeholder')}
                className="min-h-[320px] max-h-[480px] md:max-h-[60vh] resize-none overflow-y-auto"
                aria-label={t('story.asylum_story_text_label')}
              />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {charCount} / {MAX_CHARS} {t('story.characters')}
                </span>
                {charCount > MAX_CHARS && (
                  <span className="text-destructive">
                    {t('story.text_too_long_inline')}
                  </span>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => handleSaveStory(textContent)}
                  disabled={isSaving || charCount > MAX_CHARS || !textContent.trim()}
                  className="min-h-[44px]"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  {t('story.save')}
                </Button>
                
                {mode === 'edit' && textContent.trim() && (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isSaving}
                    className="min-h-[44px]"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('story.delete')}
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('story.delete_story_confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('story.delete_story_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('story.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteStory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('story.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};