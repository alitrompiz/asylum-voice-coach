import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Trash2, Edit3, AlertCircle, CheckCircle, Loader2, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOcrJob } from '@/hooks/useOcrJob';

interface Story {
  id: string;
  title: string;
  story_text: string;
  detected_sections?: any;
  source_type: 'pdf' | 'text';
  file_path?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface StoryUploaderProps {
  onStoryAdded?: (story: Story) => void;
  onStoryUpdated?: (story: Story) => void;
  onStoryDeleted?: (storyId: string) => void;
  activeMode?: 'upload' | 'text';
  onError?: (errorMessage: string) => void;
}

export const StoryUploader: React.FC<StoryUploaderProps> = ({
  onStoryAdded,
  onStoryUpdated,
  onStoryDeleted,
  activeMode = 'upload',
  onError
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [textContent, setTextContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingStories, setExistingStories] = useState<Story[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  
  const { job: ocrJob } = useOcrJob(currentJobId);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_WORDS = 2000;

  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
    loadExistingStories();
  }, []);

  // Handle OCR job completion
  React.useEffect(() => {
    if (ocrJob?.status === 'completed' && ocrJob.result) {
      handleOcrCompletion(ocrJob);
    } else if (ocrJob?.status === 'failed') {
      handleOcrFailure(ocrJob);
    }
  }, [ocrJob?.status]);

  const handleOcrCompletion = async (job: any) => {
    try {
      // Handle authenticated user (story_id in result)
      if (job.result?.story_id) {
        // The story was already created by the OCR function, just fetch it
        const { data: storyData, error: storyError } = await supabase
          .from('stories')
          .select('*')
          .eq('id', job.result.story_id)
          .single();

        if (storyError) {
          console.error('Error fetching completed story:', storyError);
          throw storyError;
        }

        toast({
          title: "Success",
          description: `PDF processed successfully! Extracted ${job.result.pages_processed || 'multiple'} pages.`,
        });

        onStoryAdded?.({ ...storyData, source_type: storyData.source_type as 'pdf' | 'text' });
        // Emit story change event for dashboard cache invalidation
        window.dispatchEvent(new CustomEvent('storyChanged'));
        loadExistingStories();
        setCurrentJobId(null);
      } 
      // Handle guest user (text in result)
      else if (job.result?.text) {
        console.log('Guest OCR completion - using text from result');
        
        const guestStory: Story = {
          id: 'guest-local',
          title: `OCR Story - ${job.file_name}`,
          story_text: job.result.text,
          source_type: 'pdf',
          file_path: undefined,
          user_id: 'guest',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        toast({
          title: "Success",
          description: `PDF processed successfully! Extracted ${job.result.pages_processed || 'multiple'} pages.`,
        });

        onStoryAdded?.(guestStory);
        setCurrentJobId(null);
      } else {
        console.error('Invalid OCR job result:', job.result);
        throw new Error('Invalid OCR result format');
      }
    } catch (error) {
      console.error('Error handling OCR completion:', error);
      toast({
        title: "Error",
        description: "OCR completed but failed to load the story",
        variant: "destructive"
      });
    }
  };

  const handleOcrFailure = (job: any) => {
    toast({
      title: "OCR processing failed",
      description: job.error_message || "Failed to process PDF",
      variant: "destructive"
    });
    setCurrentJobId(null);
  };

  const loadExistingStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingStories((data || []).map(story => ({
        ...story,
        source_type: story.source_type as 'pdf' | 'text'
      })));
    } catch (error) {
      console.error('Error loading stories:', error);
      toast({
        title: "Error",
        description: "Failed to load existing stories",
        variant: "destructive"
      });
    }
  };

  const wordCount = textContent.trim().split(/\s+/).filter(word => word.length > 0).length;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file",
        variant: "destructive"
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

      // Set the job ID to start tracking progress
      setCurrentJobId(ocrData.jobId);

      toast({
        title: "Upload successful",
        description: "PDF uploaded. Processing will continue in the background.",
      });

    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = "Failed to upload and process PDF";
      toast({
        title: "Upload failed",
        description: errorMsg,
        variant: "destructive"
      });
      onError?.(errorMsg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTextSave = async () => {
    if (!textContent.trim()) {
      toast({
        title: "Empty content",
        description: "Please enter some text before saving",
        variant: "destructive"
      });
      return;
    }

    if (wordCount > MAX_WORDS) {
      toast({
        title: "Text too long",
        description: `Please limit your text to ${MAX_WORDS} words`,
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const storyData = {
        title: editingStory?.title || `Story ${new Date().toLocaleDateString()}`,
        story_text: textContent,
        source_type: 'text' as const,
        detected_sections: null
      };

      if (editingStory) {
        // Update existing story
        const { data, error } = await supabase
          .from('stories')
          .update(storyData)
          .eq('id', editingStory.id)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Success",
          description: "Story updated successfully",
        });

        onStoryUpdated?.({ ...data, source_type: data.source_type as 'pdf' | 'text' });
        // Emit story change event for dashboard cache invalidation
        window.dispatchEvent(new CustomEvent('storyChanged'));
        setEditingStory(null);
      } else {
        // Create new story
        if (!userId) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
          .from('stories')
          .insert({ ...storyData, user_id: userId, is_active: false })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Success",
          description: "Story saved successfully",
        });

        onStoryAdded?.({ ...data, source_type: data.source_type as 'pdf' | 'text' });
      }

      // Emit story change event for dashboard cache invalidation
      window.dispatchEvent(new CustomEvent('storyChanged'));
      setTextContent('');
      loadExistingStories();

    } catch (error) {
      console.error('Save error:', error);
      const errorMsg = "Failed to save story";
      toast({
        title: "Save failed",
        description: errorMsg,
        variant: "destructive"
      });
      onError?.(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Story deleted successfully",
      });

      onStoryDeleted?.(storyId);
      loadExistingStories();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete story",
        variant: "destructive"
      });
    }
  };

  const confirmDelete = (storyId: string) => {
    setStoryToDelete(storyId);
    setDeleteDialogOpen(true);
  };

  const handleEdit = (story: Story) => {
    setEditingStory(story);
    setTextContent(story.story_text);
    // Mode switching is handled by parent component
  };

  const cancelEdit = () => {
    setEditingStory(null);
    setTextContent('');
  };

  return (
    <div className="space-y-6">{/* Mode Selection is now handled by the parent component */}

      {/* Upload Mode */}
      {activeMode === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload I-589 PDF
            </CardTitle>
            <CardDescription>
              Upload your completed I-589 form (max 10MB). We'll extract the text using OCR.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                {isUploading ? 'Processing...' : 'Choose PDF File'}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Supported: PDF files up to 10MB
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* OCR Progress Tracking */}
      {ocrJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Processing {ocrJob.file_name}
            </CardTitle>
            <CardDescription>
              Advanced OCR processing for complex forms with tables and checkboxes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <span>
                  {ocrJob.progress < 30 ? 'Downloading file...' :
                   ocrJob.progress < 60 ? 'Analyzing document structure...' :
                   ocrJob.progress < 90 ? 'Extracting text and form data...' :
                   'Finalizing results...'}
                </span>
              </div>
            )}
            
            {ocrJob.status === 'completed' && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>Processing complete! Creating your story...</span>
              </div>
            )}
            
            {ocrJob.status === 'failed' && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>{ocrJob.error_message || 'Processing failed'}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Text Mode */}
      {activeMode === 'text' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {editingStory ? 'Edit Story' : 'Paste Your Story'}
            </CardTitle>
            <CardDescription>
              {editingStory ? 'Update your story content' : 'Paste your asylum story text directly (max 2,000 words)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste your story here..."
                className="min-h-[300px] resize-none"
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {wordCount} / {MAX_WORDS} words
                </span>
                {wordCount > MAX_WORDS && (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Too many words
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleTextSave}
                disabled={isSaving || wordCount > MAX_WORDS || !textContent.trim()}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {editingStory ? 'Update Story' : 'Save Story'}
              </Button>
              {editingStory && (
                <Button variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Story</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this story? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (storyToDelete) {
                  handleDeleteStory(storyToDelete);
                  setDeleteDialogOpen(false);
                  setStoryToDelete(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
