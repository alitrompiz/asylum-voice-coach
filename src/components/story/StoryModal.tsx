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
import { Upload, FileText, Trash2, CheckCircle, Loader2, Clock, AlertCircle } from 'lucide-react';

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

// Query key constant for cache invalidation
const STORY_QUERY_KEY = 'active-story';

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
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [showOcrPreview, setShowOcrPreview] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { job: ocrJob } = useOcrJob(currentJobId);

  // Initialize text content when modal opens in edit mode
  useEffect(() => {
    if (isOpen && mode === 'edit') {
      setTextContent(existingText);
    } else if (isOpen && mode === 'create') {
      setTextContent('');
      setOcrText('');
      setShowOcrPreview(false);
    }
  }, [isOpen, mode, existingText]);

  // Handle OCR completion
  useEffect(() => {
    if (ocrJob?.status === 'completed' && ocrJob.result) {
      handleOcrCompletion(ocrJob);
    } else if (ocrJob?.status === 'failed') {
      handleOcrFailure(ocrJob);
    }
  }, [ocrJob?.status]);

  const handleOcrCompletion = async (job: any) => {
    try {
      if (!job.result?.extracted_text) {
        console.error('No extracted text in OCR job result');
        return;
      }

      setOcrText(job.result.extracted_text);
      setShowOcrPreview(true);
      setCurrentJobId(null);

      toast({
        title: t('story.ocr_success'),
        description: t('story.ocr_success_desc'),
      });
    } catch (error) {
      console.error('Error handling OCR completion:', error);
      handleOcrFailure(job);
    }
  };

  const handleOcrFailure = (job: any) => {
    toast({
      title: t('story.ocr_failed'),
      description: job?.error_message || t('story.ocr_failed_desc'),
      variant: 'destructive'
    });
    setCurrentJobId(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

    setIsUploading(true);

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

      // Start OCR processing
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('ocr-pdf', {
        body: {
          filePath: signedUrlData.filePath,
          fileName: file.name
        }
      });

      if (ocrError) throw ocrError;

      setCurrentJobId(ocrData.jobId);

      toast({
        title: t('story.uploading'),
        description: t('story.processing_background'),
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: t('story.upload_failed'),
        description: t('story.upload_failed_desc'),
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveText = async (textToSave: string = textContent) => {
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

    setIsSaving(true);
    try {
      if (mode === 'edit') {
        // Update existing active story
        const { error } = await supabase
          .from('stories')
          .update({ 
            story_text: textToSave,
            source_type: 'text',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (error) throw error;
      } else {
        // Create new story
        const { error } = await supabase
          .from('stories')
          .insert({
            user_id: user.id,
            title: `Story ${new Date().toLocaleDateString()}`,
            story_text: textToSave,
            source_type: 'text',
            is_active: true
          });

        if (error) throw error;
      }

      toast({
        title: t('story.story_saved'),
      });

      // Invalidate story query to update dashboard and profile immediately
      queryClient.invalidateQueries({ queryKey: [STORY_QUERY_KEY] });
      window.dispatchEvent(new CustomEvent('storyChanged'));
      
      onOpenChange(false);
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

  const handleAcceptOcrText = () => {
    // Save the OCR text and close modal
    handleSaveText(ocrText);
  };

  const handleDeleteStory = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('stories')
        .update({ 
          story_text: '',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      toast({
        title: t('story.story_deleted'),
      });
      
      // Invalidate story query to update dashboard and profile immediately
      queryClient.invalidateQueries({ queryKey: [STORY_QUERY_KEY] });
      window.dispatchEvent(new CustomEvent('storyChanged'));
      
      onOpenChange(false);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting story:', error);
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const retryOcr = () => {
    setCurrentJobId(null);
    setOcrText('');
    setShowOcrPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const switchToPasteText = () => {
    setActiveTab('text');
    setCurrentJobId(null);
    setOcrText('');
    setShowOcrPreview(false);
  };

  const charCount = textContent.length;

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
                {/* "Recommended" badge on PDF tab */}
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
              {!showOcrPreview && !currentJobId && (
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
                      disabled={isUploading}
                      size="lg"
                    >
                      {isUploading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5 mr-2" />
                      )}
                      {isUploading ? t('story.processing') : t('story.choose_pdf')}
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('story.pdf_size_limit')}
                    </p>
                  </div>
                </div>
              )}

              {/* OCR Progress */}
              {ocrJob && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <h4 className="font-medium">{t('story.processing_pdf', { fileName: ocrJob.file_name })}</h4>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{ocrJob.status.replace('_', ' ')}</span>
                      <span>{ocrJob.progress}%</span>
                    </div>
                    <Progress value={ocrJob.progress} className="w-full" />
                  </div>
                  
                  {ocrJob.status === 'processing' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('story.processing_with_ocr')}</span>
                    </div>
                  )}
                  
                  {ocrJob.status === 'failed' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        <span>{ocrJob.error_message || t('story.processing_failed')}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={retryOcr} variant="outline" size="sm">
                          {t('story.retry_ocr')}
                        </Button>
                        <Button onClick={switchToPasteText} variant="outline" size="sm">
                          {t('story.switch_to_text')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* OCR Preview */}
              {showOcrPreview && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium">{t('story.preview_edit')}</h4>
                  </div>
                  
                  <Textarea
                    value={ocrText}
                    onChange={(e) => setOcrText(e.target.value)}
                    className="min-h-[300px] resize-none"
                    placeholder={t('story.extracted_text_placeholder')}
                  />
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{ocrText.length} / {MAX_CHARS} {t('story.characters')}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAcceptOcrText}
                      disabled={isSaving || ocrText.length > MAX_CHARS || !ocrText.trim()}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      {t('story.accept_save')}
                    </Button>
                    <Button onClick={retryOcr} variant="outline">
                      {t('story.retry_ocr')}
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
                className="min-h-[300px] resize-none"
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
              
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSaveText()}
                  disabled={isSaving || charCount > MAX_CHARS || !textContent.trim()}
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