
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Trash2, Check, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface Persona {
  id: string;
  name: string;
  image_url: string;
  alt_text: string;
  mood: string;
  position: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

interface PersonaCardProps {
  persona: Persona;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
}

export const PersonaCard = ({ persona, onDelete, onToggleVisibility }: PersonaCardProps) => {
  const [editingFields, setEditingFields] = useState<Record<string, any>>({});
  const [saveStates, setSaveStates] = useState<Record<string, 'saving' | 'success' | 'error'>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updatePersonaMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Persona> }) => {
      const { error } = await supabase
        .from('personas')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-personas'] });
      const field = Object.keys(variables.updates)[0];
      setSaveStates(prev => ({ ...prev, [field]: 'success' }));
      setTimeout(() => {
        setSaveStates(prev => ({ ...prev, [field]: undefined }));
      }, 2000);
    },
    onError: (_, variables) => {
      const field = Object.keys(variables.updates)[0];
      setSaveStates(prev => ({ ...prev, [field]: 'error' }));
      toast({ 
        title: 'Error updating persona', 
        variant: 'destructive' 
      });
      setTimeout(() => {
        setSaveStates(prev => ({ ...prev, [field]: undefined }));
      }, 2000);
    }
  });

  const debouncedSave = useDebounce((field: string, value: any) => {
    setSaveStates(prev => ({ ...prev, [field]: 'saving' }));
    updatePersonaMutation.mutate({ 
      id: persona.id, 
      updates: { [field]: value }
    });
  }, 500);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setEditingFields(prev => ({ ...prev, [field]: value }));
    debouncedSave(field, value);
  }, [debouncedSave]);

  const getCurrentValue = (field: string) => {
    return editingFields[field] !== undefined ? editingFields[field] : persona[field];
  };

  const getSaveIcon = (field: string) => {
    const state = saveStates[field];
    if (state === 'saving') return <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" data-testid="saving-indicator" />;
    if (state === 'success') return <Check className="w-4 h-4 text-green-500" data-testid="success-indicator" />;
    if (state === 'error') return <X className="w-4 h-4 text-red-500" data-testid="error-indicator" />;
    return null;
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="relative">
        <img
          src={persona.image_url}
          alt={persona.alt_text}
          className="aspect-square w-[40rem] object-cover rounded-lg"
        />
        <div className="absolute top-2 right-2">
          <Badge variant={persona.is_visible ? 'default' : 'secondary'}>
            {persona.is_visible ? 'Visible' : 'Hidden'}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Label htmlFor={`name-${persona.id}`} className="text-sm font-medium">
              Name
            </Label>
            {getSaveIcon('name')}
          </div>
          <Input
            id={`name-${persona.id}`}
            value={getCurrentValue('name')}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            className="h-8"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Label htmlFor={`mood-${persona.id}`} className="text-sm font-medium">
              Mood
            </Label>
            {getSaveIcon('mood')}
          </div>
          <Input
            id={`mood-${persona.id}`}
            value={getCurrentValue('mood')}
            onChange={(e) => handleFieldChange('mood', e.target.value)}
            className="h-8"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Label htmlFor={`position-${persona.id}`} className="text-sm font-medium">
              Position
            </Label>
            {getSaveIcon('position')}
          </div>
          <Input
            id={`position-${persona.id}`}
            type="number"
            min="1"
            value={getCurrentValue('position')}
            onChange={(e) => handleFieldChange('position', parseInt(e.target.value) || 1)}
            className="h-8"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id={`visible-${persona.id}`}
            checked={persona.is_visible}
            onCheckedChange={(checked) => onToggleVisibility(persona.id, checked)}
          />
          <Label htmlFor={`visible-${persona.id}`} className="text-sm">
            Visible to users
          </Label>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleVisibility(persona.id, !persona.is_visible)}
            className="flex-1"
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
            onClick={() => onDelete(persona.id)}
            className="flex-1"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Created: {new Date(persona.created_at).toLocaleDateString()}
      </div>
    </div>
  );
};
