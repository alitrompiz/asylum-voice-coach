import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { User, FileText, LogOut, Save, Plus, Trash2, Upload, CheckCircle, MessageSquare, Clock, Calendar, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { StoryUploader } from '@/components/StoryUploader';
import { AttorneySelector } from '@/components/profile/AttorneySelector';
import { AsylumStorySection } from '@/components/profile/AsylumStorySection';

const profileSchema = z.object({
  legal_name: z.string().optional(),
  preferred_name: z.string().optional(),
  country_of_feared_persecution: z.string().optional(),
  asylum_office_filed: z.string().optional(),
  date_filed: z.date().optional(),
  interview_date: z.date().optional(),
  language_preference: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const feedbackSectionRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [activeStory, setActiveStory] = useState<any>(null);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [storyMode, setStoryMode] = useState<'upload' | 'text'>('upload');
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [storyViewDialogOpen, setStoryViewDialogOpen] = useState(false);
  const [selectedSessionFeedback, setSelectedSessionFeedback] = useState<any>(null);
  const [sessionFeedbackDialogOpen, setSessionFeedbackDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStories();
      fetchFeedback();
    }
  }, [user]);

  // Handle scrolling to feedback section when navigating from hamburger menu
  useEffect(() => {
    if (location.state?.scrollToFeedback && feedbackSectionRef.current) {
      setTimeout(() => {
        feedbackSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [location.state]);

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
            if (key === 'date_filed' || key === 'interview_date') {
              // Convert date string to Date object for date fields
              setValue(key as keyof ProfileFormData, data[key] ? new Date(data[key]) : undefined);
            } else {
              setValue(key as keyof ProfileFormData, data[key] || '');
            }
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

  const fetchFeedback = async () => {
    try {
      // Get both sessions with feedback and sessions without feedback
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('interview_sessions')
        .select(`
          *,
          feedback(*)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      setFeedback(sessionsData || []);
    } catch (err: any) {
      console.error('Error fetching feedback:', err);
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
          date_filed: data.date_filed?.toISOString().split('T')[0],
          interview_date: data.interview_date?.toISOString().split('T')[0],
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

  const openFeedbackViewer = (feedbackItem: any) => {
    setSelectedFeedback(feedbackItem);
    setFeedbackDialogOpen(true);
  };

  const openSessionFeedbackViewer = (session: any) => {
    if (session.feedback && session.feedback.length > 0) {
      setSelectedSessionFeedback(session.feedback[0]);
      setSessionFeedbackDialogOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Profile</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Manage your personal information and asylum stories
              </p>
            </div>
            {/* Mobile: Stack buttons vertically */}
            <div className="sm:hidden space-y-2">
              <Button variant="outline" onClick={() => navigate('/dashboard')} size="sm" className="w-full">
                Back to Dashboard
              </Button>
              <Button variant="destructive" onClick={handleLogout} size="sm" className="w-full">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>

            {/* Desktop: Horizontal layout */}
            <div className="hidden sm:flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate('/dashboard')} size="sm">
                Back to Dashboard
              </Button>
              <Button variant="destructive" onClick={handleLogout} size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date Filed</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !watch('date_filed') && 'text-muted-foreground'
                        )}
                        disabled={isLoading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {watch('date_filed') ? (
                          format(watch('date_filed'), 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={watch('date_filed')}
                        onSelect={(date) => setValue('date_filed', date)}
                        className={cn("p-3 pointer-events-auto")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.date_filed && (
                    <p className="text-sm text-destructive">{errors.date_filed.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Interview Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !watch('interview_date') && 'text-muted-foreground'
                        )}
                        disabled={isLoading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {watch('interview_date') ? (
                          format(watch('interview_date'), 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={watch('interview_date')}
                        onSelect={(date) => setValue('interview_date', date)}
                        className={cn("p-3 pointer-events-auto")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.interview_date && (
                    <p className="text-sm text-destructive">{errors.interview_date.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Attorney Selector */}
              <AttorneySelector />

              <Button type="submit" disabled={isLoading}>
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Asylum Story Section - Now uses React Query internally */}
        <div className="mt-6">
          <AsylumStorySection 
            onStoryChange={fetchStories}
          />
        </div>

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

        {/* Feedback Received Section */}
        {feedback.length > 0 && (
          <Card className="mt-6" ref={feedbackSectionRef}>
            <CardHeader>
              <CardTitle>
                <MessageSquare className="w-5 h-5 mr-2 inline" />
                Feedback Received
              </CardTitle>
              <CardDescription>
                Your interview sessions, newest first. Click "View Feedback" to see AI analysis when available.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {feedback.map((session) => {
                  const hasFeedback = session.feedback && session.feedback.length > 0;
                  const feedbackData = hasFeedback ? session.feedback[0] : null;
                  const sessionDate = new Date(session.created_at);
                  const durationMinutes = Math.floor((session.session_duration_seconds || 0) / 60);
                  const durationSeconds = (session.session_duration_seconds || 0) % 60;
                  
                  return (
                    <div 
                      key={session.id} 
                      className="border rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {sessionDate.toLocaleDateString()}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              at {sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {durationMinutes}m {durationSeconds}s
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasFeedback ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
                              Feedback Available
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                              No Feedback
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {hasFeedback && feedbackData?.score && (
                            <span className="text-sm text-muted-foreground">
                              Score: {feedbackData.score}/100
                            </span>
                          )}
                          {hasFeedback && feedbackData?.improvements && (
                            <span className="text-sm text-muted-foreground">
                              • {feedbackData.improvements.length} improvement{feedbackData.improvements.length === 1 ? '' : 's'} suggested
                            </span>
                          )}
                        </div>
                        <Button
                          variant={hasFeedback ? "default" : "secondary"}
                          size="sm"
                          disabled={!hasFeedback}
                          onClick={() => hasFeedback && openSessionFeedbackViewer(session)}
                          className={!hasFeedback ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          View Feedback
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session Feedback Viewer Dialog */}
        <Dialog open={sessionFeedbackDialogOpen} onOpenChange={setSessionFeedbackDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Session Feedback
                {selectedSessionFeedback?.score && (
                  <Badge variant="outline">{selectedSessionFeedback.score}/100</Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedSessionFeedback ? (
                  <>
                    {new Date(selectedSessionFeedback.created_at).toLocaleDateString()} at {new Date(selectedSessionFeedback.created_at).toLocaleTimeString()}
                  </>
                ) : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              <div className="space-y-6">
                {/* Strengths */}
                {selectedSessionFeedback?.strengths && selectedSessionFeedback.strengths.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-green-600 mb-3">Strengths</h3>
                    <ul className="space-y-2">
                      {selectedSessionFeedback.strengths.map((strength: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {selectedSessionFeedback?.improvements && selectedSessionFeedback.improvements.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-blue-600 mb-3">Areas for Improvement</h3>
                    <ul className="space-y-2">
                      {selectedSessionFeedback.improvements.map((improvement: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-4 h-4 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mt-0.5 flex-shrink-0">
                            {index + 1}
                          </div>
                          <span className="text-sm">{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Overall Score */}
                {selectedSessionFeedback?.score && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Overall Score</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 rounded-full border-4 border-primary flex items-center justify-center">
                        <span className="text-2xl font-bold">{selectedSessionFeedback.score}</span>
                      </div>
                      <div className="flex-1">
                        <div className="w-full bg-muted rounded-full h-3">
                          <div 
                            className="bg-primary h-3 rounded-full transition-all duration-300" 
                            style={{ width: `${selectedSessionFeedback.score}%` }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Score out of 100
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}