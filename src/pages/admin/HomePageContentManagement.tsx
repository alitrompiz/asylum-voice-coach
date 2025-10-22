import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ContentItem {
  id: string;
  section_key: string;
  content: string;
  updated_at: string;
}

const sectionLabels: Record<string, { label: string; description: string }> = {
  hero_h1: {
    label: 'Hero Heading (H1)',
    description: 'Main headline on the landing page'
  },
  hero_p1: {
    label: 'Hero Description (P1)',
    description: 'Subtext below the main headline'
  },
  officer_picker_title: {
    label: 'Officer Picker Title',
    description: 'Heading above the officer selection carousel'
  }
};

export default function HomePageContentManagement() {
  const queryClient = useQueryClient();
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const { data: content, isLoading } = useQuery({
    queryKey: ['home-page-content-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_page_content')
        .select('*')
        .order('section_key');
      
      if (error) throw error;
      return data as ContentItem[];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ sectionKey, content }: { sectionKey: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('home_page_content')
        .update({ 
          content,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('section_key', sectionKey);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-page-content-admin'] });
      queryClient.invalidateQueries({ queryKey: ['home-page-content'] });
      toast.success('Content updated successfully');
      setEditingKey(null);
      setEditedContent({});
    },
    onError: (error) => {
      toast.error('Failed to update content');
      console.error('Update error:', error);
    }
  });

  const handleEdit = (key: string, currentContent: string) => {
    setEditingKey(key);
    setEditedContent({ ...editedContent, [key]: currentContent });
  };

  const handleSave = (key: string) => {
    const newContent = editedContent[key];
    if (newContent && newContent.trim()) {
      updateMutation.mutate({ sectionKey: key, content: newContent });
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditedContent({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Home Page Content</h1>
        <p className="text-muted-foreground mt-2">
          Edit the text displayed on the landing page
        </p>
      </div>

      <div className="grid gap-6">
        {content?.map((item) => {
          const info = sectionLabels[item.section_key];
          const isEditing = editingKey === item.section_key;
          const currentValue = isEditing 
            ? (editedContent[item.section_key] ?? item.content)
            : item.content;

          return (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{info?.label || item.section_key}</CardTitle>
                <CardDescription>{info?.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={item.section_key}>Content</Label>
                  <Textarea
                    id={item.section_key}
                    value={currentValue}
                    onChange={(e) => setEditedContent({
                      ...editedContent,
                      [item.section_key]: e.target.value
                    })}
                    disabled={!isEditing}
                    rows={item.section_key === 'hero_h1' ? 2 : 4}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(item.updated_at).toLocaleString()}
                  </p>
                  
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancel}
                          disabled={updateMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSave(item.section_key)}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save'
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleEdit(item.section_key, item.content)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
