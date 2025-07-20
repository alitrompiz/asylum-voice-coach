import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Eye, RefreshCw } from 'lucide-react';

interface PromptPreviewToolProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PromptPreviewTool = ({ open, onOpenChange }: PromptPreviewToolProps) => {
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [previewContent, setPreviewContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Fetch base prompts
  const { data: prompts = [] } = useQuery({
    queryKey: ['base-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('is_base_template', true)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  // Fetch officers (personas)
  const { data: officers = [] } = useQuery({
    queryKey: ['officers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('is_visible', true)
        .order('position');
      
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  // Fetch focus areas (skills)
  const { data: focusAreas = [] } = useQuery({
    queryKey: ['focus-areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('is_active', true)
        .order('group_name', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const generatePreview = () => {
    const prompt = prompts.find(p => p.id === selectedPrompt);
    const officer = officers.find(o => o.id === selectedOfficer);
    const selectedAreas = focusAreas.filter(fa => selectedFocusAreas.includes(fa.id));
    
    if (!prompt) return;

    // Sample user story
    const sampleUserStory = `I fled Afghanistan in August 2021 when the Taliban took control. As a woman who worked for the government, I feared for my safety. The Taliban had been threatening women in government positions, and several of my colleagues had already been targeted. I managed to escape with my family through Pakistan and eventually reached the United States.`;

    // Officer instructions
    const officerInstructions = officer?.ai_instructions || 'You are a professional USCIS asylum officer.';

    // Focus areas instructions
    const focusAreasText = selectedAreas.length > 0 
      ? selectedAreas.map(area => area.ai_instructions || `Ask questions about ${area.name}`).join('\n\n')
      : 'General asylum interview questions.';

    // Replace placeholders in the base prompt
    let preview = prompt.content;
    preview = preview.replace(/\{officer_instructions\}/g, officerInstructions);
    preview = preview.replace(/\{user_story\}/g, sampleUserStory);
    preview = preview.replace(/\{focus_areas\}/g, focusAreasText);

    setPreviewContent(preview);
    setShowPreview(true);
  };

  const handleFocusAreaToggle = (focusAreaId: string) => {
    setSelectedFocusAreas(prev => 
      prev.includes(focusAreaId) 
        ? prev.filter(id => id !== focusAreaId)
        : [...prev, focusAreaId]
    );
  };

  const reset = () => {
    setSelectedPrompt('');
    setSelectedOfficer('');
    setSelectedFocusAreas([]);
    setPreviewContent('');
    setShowPreview(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prompt Preview Tool</DialogTitle>
          <p className="text-muted-foreground">
            Preview how your final assembled prompt will look with sample data
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Base Prompt Template</Label>
              <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a base prompt..." />
                </SelectTrigger>
                <SelectContent>
                  {prompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      {prompt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Officer Personality</Label>
              <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an officer..." />
                </SelectTrigger>
                <SelectContent>
                  {officers.map((officer) => (
                    <SelectItem key={officer.id} value={officer.id}>
                      {officer.name} - {officer.mood}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Focus Areas</Label>
            <div className="grid gap-2 md:grid-cols-3 mt-2">
              {focusAreas.map((area) => (
                <div key={area.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={area.id}
                    checked={selectedFocusAreas.includes(area.id)}
                    onChange={() => handleFocusAreaToggle(area.id)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={area.id} className="text-sm">
                    {area.name}
                    <Badge variant="outline" className="ml-1 text-xs">
                      {area.group_name}
                    </Badge>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={generatePreview}
              disabled={!selectedPrompt}
            >
              <Eye className="w-4 h-4 mr-2" />
              Generate Preview
            </Button>
            <Button variant="outline" onClick={reset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          {showPreview && (
            <div className="space-y-2">
              <Label>Final Assembled Prompt</Label>
              <div className="p-4 bg-muted rounded-lg border max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm">{previewContent}</pre>
              </div>
              <div className="text-xs text-muted-foreground">
                This preview uses sample data. The actual prompt will use real user story and selected options.
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};