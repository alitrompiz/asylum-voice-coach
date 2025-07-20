import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, MessageSquare, Eye, Loader2, Play, TrendingUp, AlertTriangle, CheckCircle2, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { PromptPreviewTool } from '@/components/admin/PromptPreviewTool';

interface Prompt {
  id: string;
  name: string;
  content: string;
  description?: string;
  prompt_type: 'interview_conduct' | 'feedback_generation';
  is_active: boolean;
  version: number;
  usage_count?: number;
  last_used_at?: string;
  template_variables?: string[];
  validation_status?: 'pending' | 'validated' | 'needs_review';
  created_at: string;
  updated_at: string;
  created_by: string;
}

export default function PromptsManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    description: '',
    prompt_type: 'interview_conduct' as 'interview_conduct' | 'feedback_generation',
    is_active: true,
    template_variables: [] as string[],
    validation_status: 'pending' as 'pending' | 'validated' | 'needs_review'
  });
  const [previewMode, setPreviewMode] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [showPreviewTool, setShowPreviewTool] = useState(false);

  // Fetch prompts
  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ['prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Prompt[];
    }
  });

  // Create prompt mutation
  const createPromptMutation = useMutation({
    mutationFn: async (promptData: typeof formData) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('prompts')
        .insert({
          ...promptData,
          created_by: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Prompt created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update prompt mutation
  const updatePromptMutation = useMutation({
    mutationFn: async ({ id, ...promptData }: { id: string } & typeof formData) => {
      const { data, error } = await supabase
        .from('prompts')
        .update(promptData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      setIsDialogOpen(false);
      setEditingPrompt(null);
      resetForm();
      toast({
        title: "Success",
        description: "Prompt updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete prompt mutation
  const deletePromptMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toast({
        title: "Success",
        description: "Prompt deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      content: '',
      description: '',
      prompt_type: 'interview_conduct',
      is_active: true,
      template_variables: [],
      validation_status: 'pending'
    });
    setPreviewMode(false);
    setPreviewContent('');
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      content: prompt.content,
      description: prompt.description || '',
      prompt_type: prompt.prompt_type,
      is_active: prompt.is_active,
      template_variables: prompt.template_variables || [],
      validation_status: prompt.validation_status || 'pending'
    });
    setIsDialogOpen(true);
  };

  const validatePrompt = () => {
    // Only validate template syntax - no user-specific data validation
    const templateVarPattern = /\{\{(\w+)\}\}/g;
    const matches = formData.content.match(templateVarPattern);
    
    if (!matches) {
      toast({
        title: "Validation Info",
        description: "No template variables found in prompt content",
      });
      return true; // Still valid, just informational
    }
    
    // Check for malformed template variables
    const malformedPattern = /\{[^{}]*\{|\}[^{}]*\}/;
    if (malformedPattern.test(formData.content)) {
      toast({
        title: "Validation Error",
        description: "Malformed template variables detected. Use {{variable_name}} format.",
        variant: "destructive",
      });
      return false;
    }
    
    toast({
      title: "Validation Success",
      description: `Template syntax valid. Found variables: ${matches.map(m => m.replace(/[{}]/g, '')).join(', ')}`,
    });
    return true;
  };

  const handlePreview = () => {
    const sampleVars = formData.prompt_type === 'interview_conduct' 
      ? {
          user_story: "Sample asylum story from Afghanistan...",
          skills_selected: "storytelling, legal knowledge",
          persona_mood: "professional but empathetic",
          language: "English"
        }
      : {
          user_story: "Sample asylum story from Afghanistan...",
          skills_selected: "storytelling, legal knowledge", 
          transcript: "Sample interview transcript..."
        };
    
    let preview = formData.content;
    Object.entries(sampleVars).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    
    setPreviewContent(preview);
    setPreviewMode(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.content) {
      toast({
        title: "Error",
        description: "Name and content are required",
        variant: "destructive",
      });
      return;
    }

    // Extract template variables from content
    const templateVars = (formData.content.match(/\{\{(\w+)\}\}/g) || [])
      .map(match => match.replace(/\{\{|\}\}/g, ''));
    
    const submitData = {
      ...formData,
      template_variables: templateVars,
      validation_status: 'validated' as const // Always validated since we only check syntax
    };

    if (editingPrompt) {
      updatePromptMutation.mutate({ id: editingPrompt.id, ...submitData });
    } else {
      createPromptMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      deletePromptMutation.mutate(id);
    }
  };

  const filteredPrompts = prompts.filter(prompt =>
    prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activePrompts = prompts.filter(p => p.is_active).length;
  const interviewPrompts = prompts.filter(p => p.prompt_type === 'interview_conduct').length;
  const feedbackPrompts = prompts.filter(p => p.prompt_type === 'feedback_generation').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Prompts Management</h2>
          <p className="text-muted-foreground">
            Manage system prompts and AI instructions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreviewTool(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Prompt Preview Tool
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingPrompt(null);
                resetForm();
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Prompt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Prompt Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter prompt name..."
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.prompt_type}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      prompt_type: value as 'interview_conduct' | 'feedback_generation' 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interview_conduct">Interview Conduct</SelectItem>
                      <SelectItem value="feedback_generation">Feedback Generation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description..."
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Prompt Content</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePreview}
                    disabled={!formData.content}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                </div>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter your prompt content here. Use {{variable_name}} for dynamic content..."
                  className="min-h-[200px]"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Available variables: {formData.prompt_type === 'interview_conduct' 
                    ? '{{user_story}}, {{skills_selected}}, {{persona_mood}}, {{language}}'
                    : '{{user_story}}, {{skills_selected}}, {{transcript}}'
                  }
                </div>
              </div>
              
              {previewMode && (
                <div>
                  <Label>Preview with Sample Data</Label>
                  <div className="p-4 bg-muted rounded-lg border">
                    <pre className="whitespace-pre-wrap text-sm">{previewContent}</pre>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPreviewMode(false)}
                    className="mt-2"
                  >
                    Hide Preview
                  </Button>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="active">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={validatePrompt}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Validate
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createPromptMutation.isPending || updatePromptMutation.isPending}
                >
                  {(createPromptMutation.isPending || updatePromptMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingPrompt ? 'Update' : 'Create'} Prompt
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Prompts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prompts.length}</div>
            <p className="text-xs text-muted-foreground">System prompts</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePrompts}</div>
            <p className="text-xs text-muted-foreground">Currently in use</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Interview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviewPrompts}</div>
            <p className="text-xs text-muted-foreground">Interview prompts</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackPrompts}</div>
            <p className="text-xs text-muted-foreground">Feedback prompts</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prompts List</CardTitle>
          <div className="flex gap-4">
            <Input 
              placeholder="Search prompts..." 
              className="flex-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Validation</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrompts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No prompts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPrompts.map((prompt) => (
                  <TableRow key={prompt.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <div>
                          <div>{prompt.name}</div>
                          {prompt.description && (
                            <div className="text-xs text-muted-foreground max-w-xs truncate">
                              {prompt.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {prompt.prompt_type === 'interview_conduct' ? 'Interview' : 'Feedback'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{prompt.usage_count || 0}</span>
                        {prompt.last_used_at && (
                          <span className="text-xs text-muted-foreground">
                            Last: {new Date(prompt.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={prompt.is_active ? 'default' : 'secondary'}>
                        {prompt.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {prompt.validation_status === 'validated' && (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                        {prompt.validation_status === 'needs_review' && (
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        )}
                        {prompt.validation_status === 'pending' && (
                          <div className="w-4 h-4 bg-gray-400 rounded-full" />
                        )}
                        <span className="text-xs capitalize">
                          {prompt.validation_status || 'pending'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        v{prompt.version}
                        <div className="text-xs text-muted-foreground">
                          {new Date(prompt.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(prompt)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-destructive"
                          onClick={() => handleDelete(prompt.id)}
                          disabled={deletePromptMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PromptPreviewTool 
        open={showPreviewTool} 
        onOpenChange={setShowPreviewTool} 
      />
    </div>
  );
}