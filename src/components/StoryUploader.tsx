import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Trash2, Edit3, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
}

export const StoryUploader: React.FC<StoryUploaderProps> = ({
  onStoryAdded,
  onStoryUpdated,
  onStoryDeleted,
  activeMode = 'upload'
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

      // Process with OCR
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('ocr-pdf', {
        body: {
          filePath: signedUrlData.filePath,
          fileName: file.name
        }
      });

      if (ocrError) throw ocrError;

      // Save to database
      if (!userId) throw new Error('User not authenticated');

      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .insert({
          title: file.name.replace('.pdf', ''),
          story_text: ocrData.text,
          detected_sections: ocrData.sections,
          source_type: 'pdf',
          file_path: signedUrlData.filePath,
          user_id: userId,
          is_active: false // New stories are not active by default
        })
        .select()
        .single();

      if (storyError) throw storyError;

      toast({
        title: "Success",
        description: "PDF uploaded and processed successfully",
      });

      onStoryAdded?.({ ...storyData, source_type: storyData.source_type as 'pdf' | 'text' });
      loadExistingStories();

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload and process PDF",
        variant: "destructive"
      });
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

      setTextContent('');
      loadExistingStories();

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save failed",
        description: "Failed to save story",
        variant: "destructive"
      });
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
