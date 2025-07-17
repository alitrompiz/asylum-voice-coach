import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Upload, GripVertical, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Papa from 'papaparse';
import { trackEvent } from '@/lib/tracking';

const skillSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  group_name: z.string().min(1, 'Group is required'),
});

type SkillFormData = z.infer<typeof skillSchema>;

interface Skill {
  id: string;
  name: string;
  group_name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const SKILL_GROUPS = [
  'Credibility',
  'Details',
  'Communication',
  'Legal Knowledge',
  'Cultural Awareness',
  'Documentation',
  'Emotional Intelligence',
  'Advocacy',
  'Case Strength',
  'Clarity',
  'Consistency'
];

export default function SkillsManagement() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<Skill | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<SkillFormData>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      name: '',
      group_name: '',
    },
  });

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('group_name', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setSkills(data || []);
    } catch (error) {
      console.error('Error loading skills:', error);
      toast({
        title: 'Error',
        description: 'Failed to load skills',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await loadSkills();
    toast({
      title: 'Success',
      description: 'Skills refreshed successfully',
    });
  };

  const handleSubmit = async (data: SkillFormData) => {
    try {
      if (editingSkill) {
        const { error } = await supabase
          .from('skills')
          .update(data)
          .eq('id', editingSkill.id);

        if (error) throw error;
        
        trackEvent('skill_edit', {
          skill_id: editingSkill.id,
          skill_name: data.name,
          group_name: data.group_name,
        });
        
        toast({
          title: 'Success',
          description: 'Skill updated successfully',
        });
      } else {
        const maxOrder = Math.max(...skills.filter(s => s.group_name === data.group_name).map(s => s.sort_order), -1);
        
        const { error } = await supabase
          .from('skills')
          .insert({
            name: data.name,
            group_name: data.group_name,
            sort_order: maxOrder + 1,
          });

        if (error) throw error;
        
        trackEvent('skill_add', {
          skill_name: data.name,
          group_name: data.group_name,
        });
        
        toast({
          title: 'Success',
          description: 'Skill added successfully',
        });
      }

      form.reset();
      setIsAddModalOpen(false);
      setEditingSkill(null);
      loadSkills();
    } catch (error) {
      console.error('Error saving skill:', error);
      toast({
        title: 'Error',
        description: 'Failed to save skill',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (skill: Skill) => {
    try {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', skill.id);

      if (error) throw error;
      
      trackEvent('skill_delete', {
        skill_id: skill.id,
        skill_name: skill.name,
        group_name: skill.group_name,
      });
      
      toast({
        title: 'Success',
        description: 'Skill deleted successfully',
      });
      
      setDeletingSkill(null);
      loadSkills();
    } catch (error) {
      console.error('Error deleting skill:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete skill',
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(skills);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update sort_order values
    const updatedItems = items.map((item, index) => ({
      ...item,
      sort_order: index,
    }));

    setSkills(updatedItems);

    // Update database
    try {
      const updates = updatedItems.map((item, index) => ({
        id: item.id,
        sort_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('skills')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Error updating sort order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order',
        variant: 'destructive',
      });
      loadSkills(); // Reload on error
    }
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          const skillsToImport = results.data.filter((row: any) => row.name && row.group_name);
          
          for (const skillData of skillsToImport) {
            const { name, group_name } = skillData as any;
            
            // Check if skill already exists
            const { data: existingSkill } = await supabase
              .from('skills')
              .select('id')
              .eq('name', name)
              .maybeSingle();

            if (existingSkill) {
              // Update existing skill
              await supabase
                .from('skills')
                .update({ group_name })
                .eq('id', existingSkill.id);
            } else {
              // Insert new skill
              const maxOrder = Math.max(...skills.filter(s => s.group_name === group_name).map(s => s.sort_order), -1);
              await supabase
                .from('skills')
                .insert({
                  name,
                  group_name,
                  sort_order: maxOrder + 1,
                });
            }
          }
          
          toast({
            title: 'Success',
            description: `Imported ${skillsToImport.length} skills`,
          });
          
          loadSkills();
        } catch (error) {
          console.error('Error importing CSV:', error);
          toast({
            title: 'Error',
            description: 'Failed to import CSV',
            variant: 'destructive',
          });
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast({
          title: 'Error',
          description: 'Failed to parse CSV file',
          variant: 'destructive',
        });
      },
    });
  };

  const openEditModal = (skill: Skill) => {
    setEditingSkill(skill);
    form.reset({
      name: skill.name,
      group_name: skill.group_name,
    });
    setIsAddModalOpen(true);
  };

  const filteredSkills = skills.filter(skill =>
    skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    skill.group_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedSkills = SKILL_GROUPS.reduce((acc, group) => {
    acc[group] = filteredSkills.filter(skill => skill.group_name === group);
    return acc;
  }, {} as Record<string, Skill[]>);

  const totalSkills = skills.length;
  const totalGroups = new Set(skills.map(s => s.group_name)).size;

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Skills Management</h2>
          <p className="text-muted-foreground">
            Manage interview skills and categories
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Skill
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleCSVImport}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSkills}</div>
            <p className="text-xs text-muted-foreground">Active skills</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGroups}</div>
            <p className="text-xs text-muted-foreground">Active groups</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Most Popular Group</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.entries(groupedSkills).reduce((a, b) => a[1].length > b[1].length ? a : b)[0] || 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.max(...Object.values(groupedSkills).map(g => g.length), 0)} skills
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Skills List</CardTitle>
          <div className="flex gap-4">
            <Input
              placeholder="Search skills..."
              className="flex-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="skills">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Skill Name</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSkills.map((skill, index) => (
                        <Draggable key={skill.id} draggableId={skill.id} index={index}>
                          {(provided) => (
                            <TableRow
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                            >
                              <TableCell {...provided.dragHandleProps}>
                                <GripVertical className="w-4 h-4 text-muted-foreground" />
                              </TableCell>
                              <TableCell className="font-medium">{skill.name}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{skill.group_name}</Badge>
                              </TableCell>
                              <TableCell>{skill.sort_order}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditModal(skill)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() => setDeletingSkill(skill)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSkill ? 'Edit Skill' : 'Add New Skill'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skill Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter skill name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="group_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a group" />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_GROUPS.map((group) => (
                            <SelectItem key={group} value={group}>
                              {group}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingSkill(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSkill ? 'Update' : 'Add'} Skill
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSkill} onOpenChange={() => setDeletingSkill(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the skill "{deletingSkill?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSkill && handleDelete(deletingSkill)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
