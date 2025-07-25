import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle, Eye, Edit, Trash2, Plus, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Phrase {
  id: string;
  phrase_text: string;
  phrase_type: 'good' | 'cut_short';
  is_active: boolean;
  created_at: string;
}

export function PhraseManager() {
  const [goodPhrases, setGoodPhrases] = useState<Phrase[]>([]);
  const [cutShortPhrases, setCutShortPhrases] = useState<Phrase[]>([]);
  const [newGoodPhrasesText, setNewGoodPhrasesText] = useState('');
  const [newCutShortPhrasesText, setNewCutShortPhrasesText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewPhrase, setPreviewPhrase] = useState<string | null>(null);
  const [editingPhrase, setEditingPhrase] = useState<Phrase | null>(null);
  const [editText, setEditText] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchPhrases();
  }, []);

  const fetchPhrases = async () => {
    try {
      const { data, error } = await supabase
        .from('session_phrases')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const good = (data?.filter(p => p.phrase_type === 'good') || []) as Phrase[];
      const cutShort = (data?.filter(p => p.phrase_type === 'cut_short') || []) as Phrase[];
      
      setGoodPhrases(good);
      setCutShortPhrases(cutShort);
    } catch (error: any) {
      console.error('Error fetching phrases:', error);
      toast({
        title: "Error",
        description: "Failed to fetch phrases",
        variant: "destructive"
      });
    }
  };

  const getCharCount = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.reduce((total, line) => total + line.length, 0);
  };

  const getLineCount = (text: string) => {
    return text.split('\n').filter(line => line.trim()).length;
  };

  const savePhrases = async (type: 'good' | 'cut_short', text: string) => {
    if (!text.trim()) return;

    setIsLoading(true);
    try {
      const lines = text.split('\n').filter(line => line.trim());
      const user = await supabase.auth.getUser();
      const phrases = lines.map(line => ({
        phrase_type: type,
        phrase_text: line.trim(),
        created_by: user.data.user?.id
      }));

      const { error } = await supabase
        .from('session_phrases')
        .insert(phrases);

      if (error) throw error;

      if (type === 'good') {
        setNewGoodPhrasesText('');
      } else {
        setNewCutShortPhrasesText('');
      }

      await fetchPhrases();
      
      toast({
        title: "Success",
        description: `Added ${phrases.length} ${type} phrase${phrases.length === 1 ? '' : 's'}`,
      });
    } catch (error: any) {
      console.error('Error saving phrases:', error);
      toast({
        title: "Error",
        description: "Failed to save phrases",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deletePhrase = async (id: string) => {
    try {
      const { error } = await supabase
        .from('session_phrases')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      await fetchPhrases();
      
      toast({
        title: "Success",
        description: "Phrase deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting phrase:', error);
      toast({
        title: "Error",
        description: "Failed to delete phrase",
        variant: "destructive"
      });
    }
  };

  const updatePhrase = async () => {
    if (!editingPhrase || !editText.trim()) return;

    try {
      const { error } = await supabase
        .from('session_phrases')
        .update({ phrase_text: editText.trim() })
        .eq('id', editingPhrase.id);

      if (error) throw error;

      setEditingPhrase(null);
      setEditText('');
      await fetchPhrases();
      
      toast({
        title: "Success",
        description: "Phrase updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating phrase:', error);
      toast({
        title: "Error",
        description: "Failed to update phrase",
        variant: "destructive"
      });
    }
  };

  const startEditing = (phrase: Phrase) => {
    setEditingPhrase(phrase);
    setEditText(phrase.phrase_text);
  };

  const PhraseTable = ({ phrases, type }: { phrases: Phrase[], type: 'good' | 'cut_short' }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Phrase</TableHead>
          <TableHead className="w-24">Length</TableHead>
          <TableHead className="w-32">Created</TableHead>
          <TableHead className="w-32">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {phrases.map((phrase) => (
          <TableRow key={phrase.id}>
            <TableCell className="max-w-md">
              <div className="truncate">{phrase.phrase_text}</div>
              {phrase.phrase_text.length > 150 && (
                <Badge variant="destructive" className="mt-1">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Too long
                </Badge>
              )}
            </TableCell>
            <TableCell>{phrase.phrase_text.length}</TableCell>
            <TableCell>{new Date(phrase.created_at).toLocaleDateString()}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewPhrase(phrase.phrase_text)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditing(phrase)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deletePhrase(phrase.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {phrases.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No phrases found. Add some phrases above.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const PhraseInput = ({ 
    value, 
    onChange, 
    type, 
    onSave 
  }: { 
    value: string, 
    onChange: (value: string) => void, 
    type: 'good' | 'cut_short',
    onSave: () => void 
  }) => {
    const charCount = getCharCount(value);
    const lineCount = getLineCount(value);
    const hasLongPhrases = value.split('\n').some(line => line.trim().length > 150);

    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor={`${type}-phrases`}>
            Add {type === 'good' ? 'Good' : 'Cut-short'} Phrases (one per line)
          </Label>
          <Textarea
            id={`${type}-phrases`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${type === 'good' ? 'good' : 'cut-short'} phrases, one per line...`}
            className="min-h-32 mt-2"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{lineCount} phrase{lineCount === 1 ? '' : 's'}</span>
            <span className={charCount > 1000 ? 'text-orange-500' : ''}>
              {charCount} total characters
            </span>
            {hasLongPhrases && (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                Some phrases over 150 chars
              </Badge>
            )}
          </div>
          
          <Button 
            onClick={onSave}
            disabled={!value.trim() || isLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Phrases
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Phrase Manager</h2>
        <p className="text-muted-foreground">
          Manage phrases shown to users when sessions end
        </p>
      </div>

      <Tabs defaultValue="good" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="good">Good Phrases ({goodPhrases.length})</TabsTrigger>
          <TabsTrigger value="cut_short">Cut-short Phrases ({cutShortPhrases.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="good" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Good Phrases</CardTitle>
              <CardDescription>
                Phrases shown when users complete a full session (above threshold)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PhraseInput
                value={newGoodPhrasesText}
                onChange={setNewGoodPhrasesText}
                type="good"
                onSave={() => savePhrases('good', newGoodPhrasesText)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Good Phrases</CardTitle>
            </CardHeader>
            <CardContent>
              <PhraseTable phrases={goodPhrases} type="good" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cut_short" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Cut-short Phrases</CardTitle>
              <CardDescription>
                Phrases shown when users end sessions early (below threshold)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PhraseInput
                value={newCutShortPhrasesText}
                onChange={setNewCutShortPhrasesText}
                type="cut_short"
                onSave={() => savePhrases('cut_short', newCutShortPhrasesText)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Cut-short Phrases</CardTitle>
            </CardHeader>
            <CardContent>
              <PhraseTable phrases={cutShortPhrases} type="cut_short" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewPhrase} onOpenChange={() => setPreviewPhrase(null)}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Session End Preview</DialogTitle>
            <DialogDescription className="text-gray-300">
              How this phrase will appear to users
            </DialogDescription>
          </DialogHeader>
          <div className="text-center space-y-6 py-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                {previewPhrase}
              </h2>
              <p className="text-gray-300 text-sm">
                Session Duration: 2m 15s
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPhrase} onOpenChange={() => setEditingPhrase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Phrase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-phrase">Phrase Text</Label>
              <Textarea
                id="edit-phrase"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-20"
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>{editText.length} characters</span>
                {editText.length > 150 && (
                  <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Over 150 characters
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={updatePhrase} disabled={!editText.trim()}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditingPhrase(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}