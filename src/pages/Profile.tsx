import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, FileText, LogOut, Save, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const profileSchema = z.object({
  display_name: z.string().optional(),
  legal_name: z.string().optional(),
  preferred_name: z.string().optional(),
  country_of_feared_persecution: z.string().optional(),
  asylum_office_filed: z.string().optional(),
  date_filed: z.string().optional(),
  interview_date: z.string().optional(),
  language_preference: z.string().optional(),
});

const storySchema = z.object({
  title: z.string().optional(),
  story_text: z.string().min(1, 'Story text is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type StoryFormData = z.infer<typeof storySchema>;

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [isEditingStory, setIsEditingStory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const {
    register: registerStory,
    handleSubmit: handleSubmitStory,
    setValue: setStoryValue,
    reset: resetStory,
    formState: { errors: storyErrors },
  } = useForm<StoryFormData>({
    resolver: zodResolver(storySchema),
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
      setStories(data || []);
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

  const onSubmitStory = async (data: StoryFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      if (isEditingStory) {
        const { error } = await supabase
          .from('stories')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', isEditingStory);

        if (error) throw error;
        toast.success('Story updated successfully!');
      } else {
        const { error } = await supabase
          .from('stories')
          .insert({
            user_id: user?.id!,
            title: data.title,
            story_text: data.story_text,
            source_type: 'manual',
          });

        if (error) throw error;
        toast.success('Story added successfully!');
      }

      resetStory();
      setIsEditingStory(null);
      fetchStories();
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to save story');
    } finally {
      setIsLoading(false);
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

  const editStory = (story: any) => {
    setIsEditingStory(story.id);
    setStoryValue('story_text', story.story_text);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/login');
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

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile Information
            </TabsTrigger>
            <TabsTrigger value="stories">
              <FileText className="w-4 h-4 mr-2" />
              Asylum Stories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your profile information and asylum case details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        {...register('display_name')}
                        disabled={isLoading}
                      />
                      {errors.display_name && (
                        <p className="text-sm text-destructive">{errors.display_name.message}</p>
                      )}
                    </div>

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

                  <Button type="submit" disabled={isLoading}>
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Profile'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stories">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Story</CardTitle>
                  <CardDescription>
                    {isEditingStory ? 'Edit your asylum story' : 'Add a new asylum story to your profile'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitStory(onSubmitStory)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="story_text">Story</Label>
                      <Textarea
                        id="story_text"
                        {...registerStory('story_text')}
                        disabled={isLoading}
                        rows={10}
                        placeholder="Tell your story in detail..."
                      />
                      {storyErrors.story_text && (
                        <p className="text-sm text-destructive">{storyErrors.story_text.message}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button type="submit" disabled={isLoading}>
                        <Save className="w-4 h-4 mr-2" />
                        {isLoading ? 'Saving...' : isEditingStory ? 'Update Story' : 'Add Story'}
                      </Button>
                      {isEditingStory && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setIsEditingStory(null);
                            resetStory();
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your Stories</CardTitle>
                  <CardDescription>
                    Manage your asylum stories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stories.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No stories added yet. Add your first story above.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {stories.map((story) => (
                        <div key={story.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">{story.title || 'Asylum Story'}</h3>
                              <p className="text-sm text-muted-foreground">
                                Created: {new Date(story.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{story.source_type}</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editStory(story)}
                              >
                                <Edit className="w-4 h-4" />
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
                          <p className="text-sm line-clamp-3">{story.story_text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}