import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Upload, Eye, EyeOff, Edit, Trash2, Plus } from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  image_url: string;
  alt_text: string;
  mood: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export default function PersonasManagement() {
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [personaName, setPersonaName] = useState('');
  const [personaMood, setPersonaMood] = useState('');
  const [altText, setAltText] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: personas, isLoading } = useQuery({
    queryKey: ['admin-personas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .order('created_at', { ascending: false });
      
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
      toast({ title: 'Persona visibility updated' });
    },
    onError: () => {
      toast({ title: 'Error updating persona visibility', variant: 'destructive' });
    }
  });

  const savePersonaMutation = useMutation({
    mutationFn: async ({ 
      id, 
      name, 
      mood, 
      alt_text, 
      is_visible 
    }: { 
      id?: string; 
      name: string; 
      mood: string; 
      alt_text: string; 
      is_visible: boolean; 
    }) => {
      if (id) {
        // Update existing persona
        const { error } = await supabase
          .from('personas')
          .update({
            name,
            mood,
            alt_text,
            is_visible
          })
          .eq('id', id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-personas'] });
      setIsEditModalOpen(false);
      resetForm();
      toast({ title: 'Persona updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error updating persona', variant: 'destructive' });
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
      toast({ title: 'Persona deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error deleting persona', variant: 'destructive' });
    }
  });

  const uploadPersonasMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploadedPersonas = [];
      
      for (const file of files) {
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
            is_visible: true
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
      toast({ title: `${personas.length} personas uploaded successfully` });
    },
    onError: () => {
      toast({ title: 'Error uploading personas', variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setPersonaName('');
    setPersonaMood('');
    setAltText('');
    setIsVisible(true);
    setSelectedPersona(null);
  };

  const handleEdit = (persona: Persona) => {
    setSelectedPersona(persona);
    setPersonaName(persona.name);
    setPersonaMood(persona.mood);
    setAltText(persona.alt_text);
    setIsVisible(persona.is_visible);
    setIsEditModalOpen(true);
  };

  const handleSave = () => {
    if (!selectedPersona || !personaName.trim() || !personaMood.trim()) return;
    
    savePersonaMutation.mutate({
      id: selectedPersona.id,
      name: personaName,
      mood: personaMood,
      alt_text: altText,
      is_visible: isVisible
    });
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
        <h1 className="text-3xl font-bold">Personas Management</h1>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Personas
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {personas?.map((persona) => (
          <Card key={persona.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{persona.name}</CardTitle>
                <Badge variant={persona.is_visible ? 'default' : 'secondary'}>
                  {persona.is_visible ? 'Visible' : 'Hidden'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <img
                  src={persona.image_url}
                  alt={persona.alt_text}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Mood:</strong> {persona.mood}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(persona.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleVisibilityMutation.mutate({
                      id: persona.id,
                      isVisible: !persona.is_visible
                    })}
                    disabled={toggleVisibilityMutation.isPending}
                  >
                    {persona.is_visible ? (
                      <><EyeOff className="w-4 h-4 mr-1" /> Hide</>
                    ) : (
                      <><Eye className="w-4 h-4 mr-1" /> Show</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(persona)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deletePersonaMutation.mutate(persona.id)}
                    disabled={deletePersonaMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Persona</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder="Enter persona name"
              />
            </div>
            <div>
              <Label htmlFor="mood">Mood</Label>
              <Input
                id="mood"
                value={personaMood}
                onChange={(e) => setPersonaMood(e.target.value)}
                placeholder="e.g., Professional, Friendly, Formal"
              />
            </div>
            <div>
              <Label htmlFor="alt">Alt Text</Label>
              <Textarea
                id="alt"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe the image for accessibility"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="visible"
                checked={isVisible}
                onCheckedChange={setIsVisible}
              />
              <Label htmlFor="visible">Visible to users</Label>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSave}
                disabled={savePersonaMutation.isPending}
              >
                Save Changes
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Personas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="mb-2">Select persona images to upload</p>
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
                Upload {uploadedFiles.length} Persona{uploadedFiles.length !== 1 ? 's' : ''}
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