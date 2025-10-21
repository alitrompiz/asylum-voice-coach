import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Pencil, Trash2, Plus } from 'lucide-react';

interface TestStory {
  id: string;
  title: string;
  category: string;
  country_origin: string;
  summary: string;
  full_story_text: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  'political',
  'race',
  'religion',
  'gender',
  'nationality',
  'social_group',
];

export default function TestStoriesManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<TestStory | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'political',
    country_origin: '',
    summary: '',
    full_story_text: '',
    display_order: 0,
  });

  const { data: testStories, isLoading } = useQuery({
    queryKey: ['admin-test-stories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_stories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as TestStory[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('test_stories').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-test-stories'] });
      toast.success(t('test_stories.story_saved', 'Test story saved successfully'));
      setEditDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create test story: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TestStory> }) => {
      const { error } = await supabase.from('test_stories').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-test-stories'] });
      toast.success(t('test_stories.story_saved', 'Test story saved successfully'));
      setEditDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update test story: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('test_stories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-test-stories'] });
      toast.success(t('test_stories.story_deleted', 'Test story deleted successfully'));
      setDeleteDialogOpen(false);
      setSelectedStory(null);
    },
    onError: (error) => {
      toast.error('Failed to delete test story: ' + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('test_stories').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-test-stories'] });
    },
    onError: (error) => {
      toast.error('Failed to update story status: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'political',
      country_origin: '',
      summary: '',
      full_story_text: '',
      display_order: 0,
    });
    setSelectedStory(null);
  };

  const handleCreate = () => {
    resetForm();
    setEditDialogOpen(true);
  };

  const handleEdit = (story: TestStory) => {
    setSelectedStory(story);
    setFormData({
      title: story.title,
      category: story.category,
      country_origin: story.country_origin,
      summary: story.summary,
      full_story_text: story.full_story_text,
      display_order: story.display_order,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (story: TestStory) => {
    setSelectedStory(story);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedStory) {
      updateMutation.mutate({ id: selectedStory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const wordCount = formData.full_story_text.trim().split(/\s+/).filter(Boolean).length;
  const summaryCharCount = formData.summary.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t('test_stories.admin_title', 'Test Stories Management')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('test_stories.admin_subtitle', 'Manage practice stories for guest users')}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('test_stories.create_story', 'Create Test Story')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Stories</CardTitle>
          <CardDescription>
            Manage the sample asylum stories available to guest users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testStories?.map((story) => (
                  <TableRow key={story.id}>
                    <TableCell>{story.display_order}</TableCell>
                    <TableCell className="font-medium">{story.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{story.category}</Badge>
                    </TableCell>
                    <TableCell>{story.country_origin}</TableCell>
                    <TableCell>
                      <Switch
                        checked={story.is_active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: story.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(story)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(story)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStory
                ? t('test_stories.edit_story', 'Edit Test Story')
                : t('test_stories.create_story', 'Create Test Story')}
            </DialogTitle>
            <DialogDescription>
              Fill in the details for the test asylum story
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Venezuelan Political Activist"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country of Origin</Label>
                <Input
                  id="country"
                  value={formData.country_origin}
                  onChange={(e) =>
                    setFormData({ ...formData, country_origin: e.target.value })
                  }
                  placeholder="e.g., Venezuela"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">
                Summary <span className="text-xs text-muted-foreground">({summaryCharCount}/500)</span>
              </Label>
              <Textarea
                id="summary"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Brief summary of the case..."
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_story">
                Full Story Text <span className="text-xs text-muted-foreground">({wordCount} words)</span>
              </Label>
              <Textarea
                id="full_story"
                value={formData.full_story_text}
                onChange={(e) =>
                  setFormData({ ...formData, full_story_text: e.target.value })
                }
                placeholder="Detailed asylum story..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {selectedStory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Story</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'test_stories.delete_confirm',
                'Are you sure you want to delete this test story?'
              )}{' '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedStory && deleteMutation.mutate(selectedStory.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
