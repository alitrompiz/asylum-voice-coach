
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Upload, Plus } from 'lucide-react';
import { PersonaCard } from '@/components/admin/PersonaCard';

interface Persona {
  id: string;
  name: string;
  image_url: string;
  alt_text: string;
  mood: string;
  position: number;
  is_visible: boolean;
  tts_voice: string;
  created_at: string;
  updated_at: string;
}

export default function PersonasManagement() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: personas, isLoading } = useQuery({
    queryKey: ['admin-personas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .order('position', { ascending: true })
        .order('id', { ascending: true });
      
      if (error) throw error;
      return data as Persona[];
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
      const { error } = await supabase
        .from('personas')
        .update({ is_visible: isVisible })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-personas'] });
      toast({ title: 'Officer visibility updated' });
    },
    onError: () => {
      toast({ title: 'Error updating officer visibility', variant: 'destructive' });
    }
  });

  const deletePersonaMutation = useMutation({
    mutationFn: async (personaId: string) => {
      const { error } = await supabase
        .from('personas')
        .delete()
        .eq('id', personaId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-personas'] });
      toast({ title: 'Officer deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error deleting officer', variant: 'destructive' });
    }
  });

  const uploadPersonasMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploadedPersonas = [];
      
      // Get the highest position to add new personas at the end
      const maxPosition = personas?.reduce((max, p) => Math.max(max, p.position), 0) || 0;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Upload to Supabase Storage
        const fileName = `${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('persona-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('persona-images')
          .getPublicUrl(fileName);

        // Extract name from filename (remove extension)
        const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        
        // Insert into database
        const { data: personaData, error: insertError } = await supabase
          .from('personas')
          .insert({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            image_url: urlData.publicUrl,
            alt_text: `${name} profile picture`,
            mood: 'Professional',
            position: maxPosition + i + 1,
            is_visible: true,
            tts_voice: 'alloy' // Default voice
          })
          .select()
          .single();

        if (insertError) throw insertError;
        uploadedPersonas.push(personaData);
      }
      
      return uploadedPersonas;
    },
    onSuccess: (personas) => {
      queryClient.invalidateQueries({ queryKey: ['admin-personas'] });
      setIsUploadModalOpen(false);
      setUploadedFiles([]);
      toast({ title: `${personas.length} officers uploaded successfully` });
    },
    onError: () => {
      toast({ title: 'Error uploading officers', variant: 'destructive' });
    }
  });

  const handleDelete = (personaId: string) => {
    deletePersonaMutation.mutate(personaId);
  };

  const handleToggleVisibility = (personaId: string, isVisible: boolean) => {
    toggleVisibilityMutation.mutate({ id: personaId, isVisible });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(files);
  };

  const handleUpload = () => {
    if (uploadedFiles.length === 0) return;
    uploadPersonasMutation.mutate(uploadedFiles);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Officers Management</h1>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Officers
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {personas?.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            onDelete={handleDelete}
            onToggleVisibility={handleToggleVisibility}
          />
        ))}
      </div>

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Officers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="mb-2">Select officer images to upload</p>
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="max-w-xs mx-auto"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Supports PNG, JPG, JPEG, WebP
              </p>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Selected Files:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      {file.name} ({Math.round(file.size / 1024)}KB)
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={handleUpload}
                disabled={uploadedFiles.length === 0 || uploadPersonasMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload {uploadedFiles.length} Officer{uploadedFiles.length !== 1 ? 's' : ''}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadedFiles([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
