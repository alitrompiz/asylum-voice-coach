
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Trash2, Check, X, Volume2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

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

interface PersonaCardProps {
  persona: Persona;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
}

const TTS_VOICES = [
  { value: 'alloy', label: 'Alloy' },
  { value: 'echo', label: 'Echo' },
  { value: 'fable', label: 'Fable' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'nova', label: 'Nova' },
  { value: 'shimmer', label: 'Shimmer' },
];

export const PersonaCard = ({ persona, onDelete, onToggleVisibility }: PersonaCardProps) => {
  const [editingFields, setEditingFields] = useState<Record<string, any>>({});
  const [saveStates, setSaveStates] = useState<Record<string, 'saving' | 'success' | 'error'>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { speak, stop, isPlaying, isLoading } = useTextToSpeech();

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
        title: 'Error updating officer', 
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

  const handleVoiceTest = () => {
    const voice = getCurrentValue('tts_voice');
    speak(`Hello, I'm ${persona.name}. This is how I sound.`, { 
      voice,
      onError: (error) => {
        toast({
          title: 'Voice test failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="w-full min-w-0">
      <div className="bg-card border rounded-lg p-3 space-y-3">
        <div className="relative">
          <img
            src={persona.image_url}
            alt={persona.alt_text}
            className="w-full h-64 object-cover rounded-lg"
          />
          <div className="absolute top-2 right-2">
            <Badge variant={persona.is_visible ? 'default' : 'secondary'}>
              {persona.is_visible ? 'Visible' : 'Hidden'}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
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
              className="h-7"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor={`mood-${persona.id}`} className="text-sm font-medium">
               Personality
              </Label>
              {getSaveIcon('mood')}
            </div>
            <Input
              id={`mood-${persona.id}`}
              value={getCurrentValue('mood')}
              onChange={(e) => handleFieldChange('mood', e.target.value)}
              className="h-7"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor={`voice-${persona.id}`} className="text-sm font-medium">
                Voice
              </Label>
              {getSaveIcon('tts_voice')}
            </div>
            <Select
              value={getCurrentValue('tts_voice')}
              onValueChange={(value) => handleFieldChange('tts_voice', value)}
            >
              <SelectTrigger className="h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TTS_VOICES.map((voice) => (
                  <SelectItem key={voice.value} value={voice.value}>
                    {voice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleVoiceTest}
              disabled={isLoading || isPlaying}
              className="flex-1"
            >
              <Volume2 className="w-3 h-3 mr-1" />
              {isLoading ? 'Loading...' : isPlaying ? 'Playing...' : 'Test'}
            </Button>
            {isPlaying && (
              <Button
                variant="outline"
                size="sm"
                onClick={stop}
                className="px-2"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
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
              className="h-7"
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

          <div className="flex gap-2 pt-1">
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
          Modified: {new Date(persona.updated_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};
