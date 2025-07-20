import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User, FileText, LogOut, Save, Plus, Trash2, Upload, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { StoryUploader } from '@/components/StoryUploader';

const profileSchema = z.object({
  legal_name: z.string().optional(),
  preferred_name: z.string().optional(),
  country_of_feared_persecution: z.string().optional(),
  asylum_office_filed: z.string().optional(),
  date_filed: z.string().optional().transform(val => val === '' ? null : val),
  interview_date: z.string().optional().transform(val => val === '' ? null : val),
  language_preference: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [activeStory, setActiveStory] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [storyMode, setStoryMode] = useState<'upload' | 'text'>('upload');
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [storyViewDialogOpen, setStoryViewDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStories();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        // Set form values
        Object.keys(data).forEach((key) => {
          if (key !== 'id' && key !== 'user_id' && key !== 'created_at' && key !== 'updated_at') {
            setValue(key as keyof ProfileFormData, data[key] || '');
          }
        });
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message);
    }
  };

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const storiesData = data || [];
      setStories(storiesData);
      setActiveStory(storiesData.find(story => story.is_active));
    } catch (err: any) {
      console.error('Error fetching stories:', err);
      setError(err.message);
    }
  };

  const onSubmitProfile = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          ...data,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Profile updated successfully!');
      fetchProfile();
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const setAsActiveStory = async (storyId: string) => {
    try {
      const { error } = await supabase.rpc('set_active_story', {
        story_id: storyId,
        user_id_param: user?.id
      });

      if (error) throw error;
      toast.success('Story set as active!');
      fetchStories();
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to set story as active');
    }
  };

  const deleteStory = async (storyId: string) => {
    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;
      toast.success('Story deleted successfully!');
      fetchStories();
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to delete story');
    }
  };

  const handleStoryAdded = (story: any) => {
    // When a new story is added, automatically set it as active
    setAsActiveStory(story.id);
    setStoryDialogOpen(false);
  };

  const handleStoryUpdated = (story: any) => {
    fetchStories();
    setStoryDialogOpen(false);
  };

  const handleStoryDeleted = (storyId: string) => {
    fetchStories();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const openStoryViewer = (story: any) => {
    setSelectedStory(story);
    setStoryViewDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Profile</h1>
            <p className="text-muted-foreground">
              Manage your personal information and asylum stories
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              <User className="w-5 h-5 mr-2 inline" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and asylum case details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferred_name">Preferred Name</Label>
                  <Input
                    id="preferred_name"
                    {...register('preferred_name')}
                    disabled={isLoading}
                  />
                  {errors.preferred_name && (
                    <p className="text-sm text-destructive">{errors.preferred_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal_name">Legal Name</Label>
                  <Input
                    id="legal_name"
                    {...register('legal_name')}
                    disabled={isLoading}
                  />
                  {errors.legal_name && (
                    <p className="text-sm text-destructive">{errors.legal_name.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="country_of_feared_persecution">Country of Feared Persecution</Label>
                <Input
                  id="country_of_feared_persecution"
                  {...register('country_of_feared_persecution')}
                  disabled={isLoading}
                />
                {errors.country_of_feared_persecution && (
                  <p className="text-sm text-destructive">{errors.country_of_feared_persecution.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="asylum_office_filed">Asylum Office Filed</Label>
                  <Input
                    id="asylum_office_filed"
                    {...register('asylum_office_filed')}
                    disabled={isLoading}
                  />
                  {errors.asylum_office_filed && (
                    <p className="text-sm text-destructive">{errors.asylum_office_filed.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language_preference">Language Preference</Label>
                  <Input
                    id="language_preference"
                    {...register('language_preference')}
                    disabled={isLoading}
                    placeholder="e.g., English, Spanish, French"
                  />
                  {errors.language_preference && (
                    <p className="text-sm text-destructive">{errors.language_preference.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_filed">Date Filed</Label>
                  <Input
                    id="date_filed"
                    type="date"
                    {...register('date_filed')}
                    disabled={isLoading}
                  />
                  {errors.date_filed && (
                    <p className="text-sm text-destructive">{errors.date_filed.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interview_date">Interview Date</Label>
                  <Input
                    id="interview_date"
                    type="date"
                    {...register('interview_date')}
                    disabled={isLoading}
                  />
                  {errors.interview_date && (
                    <p className="text-sm text-destructive">{errors.interview_date.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Asylum Story Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Asylum Story
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Add your asylum story to help prepare for interviews
                    </p>
                  </div>
                  
                  <Dialog open={storyDialogOpen} onOpenChange={setStoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Asylum Story
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Add Your Asylum Story</DialogTitle>
                        <DialogDescription>
                          Choose how you'd like to add your asylum story
                        </DialogDescription>
                      </DialogHeader>
                      
                      {/* Story Mode Selection */}
                      <div className="flex gap-2 my-4">
                        <Button
                          variant={storyMode === 'upload' ? 'default' : 'outline'}
                          onClick={() => setStoryMode('upload')}
                          className="flex-1 h-auto py-4 px-6"
                          size="lg"
                        >
                          <Upload className="w-5 h-5 mr-2" />
                          <div>
                            <div className="font-semibold">Upload Complete Form I-589</div>
                            <div className="text-xs opacity-75">(Recommended)</div>
                          </div>
                        </Button>
                        <Button
                          variant={storyMode === 'text' ? 'default' : 'outline'}
                          onClick={() => setStoryMode('text')}
                          className="flex-1 h-auto py-4 px-6"
                          size="lg"
                        >
                          <FileText className="w-5 h-5 mr-2" />
                          <div>
                            <div className="font-semibold">Paste Story as Text</div>
                            <div className="text-xs opacity-75">Manual entry</div>
                          </div>
                        </Button>
                      </div>

                      {/* StoryUploader Component */}
                      <div className="flex-1 overflow-auto">
                        <StoryUploader
                          activeMode={storyMode}
                          onStoryAdded={handleStoryAdded}
                          onStoryUpdated={handleStoryUpdated}
                          onStoryDeleted={handleStoryDeleted}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Active Story Display */}
                {activeStory && (
                  <div 
                    className="border rounded-lg p-4 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => openStoryViewer(activeStory)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <h4 className="font-medium">Active Story (Click to read)</h4>
                        <Badge variant="secondary">{activeStory.source_type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(activeStory.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activeStory.story_text.substring(0, 200)}...
                    </p>
                  </div>
                )}

                {!activeStory && (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No active asylum story. Add your story to get started with interview practice.
                    </p>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={isLoading}>
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Previous Stories Section */}
        {stories.filter(story => !story.is_active).length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Previous Stories</CardTitle>
              <CardDescription>
                Stories you've uploaded previously. You can set any of these as your active story.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stories.filter(story => !story.is_active).map((story) => (
                  <div key={story.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div 
                        className="flex-1 cursor-pointer hover:bg-muted/50 -m-2 p-2 rounded transition-colors"
                        onClick={() => openStoryViewer(story)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {story.source_type === 'pdf' ? (
                            <Upload className="w-4 h-4 text-blue-500" />
                          ) : (
                            <FileText className="w-4 h-4 text-green-500" />
                          )}
                          <h4 className="font-medium">{story.title || 'Asylum Story'}</h4>
                          <Badge variant="outline">{story.source_type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Created: {new Date(story.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm line-clamp-2 text-blue-600 hover:text-blue-800">
                          Click to read full story...
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAsActiveStory(story.id)}
                        >
                          Set as Active
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteStory(story.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Story Viewer Dialog */}
        <Dialog open={storyViewDialogOpen} onOpenChange={setStoryViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {selectedStory?.title || 'Asylum Story'}
                <Badge variant="outline">{selectedStory?.source_type}</Badge>
              </DialogTitle>
              <DialogDescription>
                Created: {selectedStory ? new Date(selectedStory.created_at).toLocaleDateString() : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedStory?.story_text}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}