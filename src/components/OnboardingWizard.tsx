import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { useSkillsStore } from '@/stores/personaStore';
import { useGuestSession } from '@/hooks/useGuestSession';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LanguageSelector } from '@/components/LanguageSelector';
import { SkillsScroller } from '@/components/SkillsScroller';
import { GuestTestStorySelector } from '@/components/story/GuestTestStorySelector';
import { StoryUploader } from '@/components/StoryUploader';
import { Upload, FileText, BookOpen, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type StoryOption = 'upload' | 'paste' | 'mock' | null;

interface OnboardingWizardProps {
  onComplete?: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { languageCode } = useLanguagePreference();
  const { skillsSelected } = useSkillsStore();
  const guestSession = useGuestSession();

  const [currentStep, setCurrentStep] = useState(1);
  const [storyOption, setStoryOption] = useState<StoryOption>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [storyText, setStoryText] = useState('');
  const [selectedTestStoryId, setSelectedTestStoryId] = useState<string | null>(null);
  const [hasStoryData, setHasStoryData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const progressPercentage = (currentStep / 3) * 100;

  // Check if user already has story data
  useEffect(() => {
    const checkExistingStory = async () => {
      if (!user || isGuest) return;

      const { data: stories } = await supabase
        .from('stories')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (stories && stories.length > 0) {
        setHasStoryData(true);
      }
    };

    checkExistingStory();
  }, [user, isGuest]);

  const handleStoryOptionSelect = (option: StoryOption) => {
    // Clear previous option's data to prevent confusion when switching
    setFirstName('');
    setLastName('');
    setStoryText('');
    setSelectedTestStoryId(null);
    setUploadError(null);
    
    setStoryOption(option);
  };

  const handlePasteStorySave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(t('onboarding.validation.first_name_required'));
      return;
    }

    if (storyText.length < 100) {
      toast.error(t('onboarding.validation.story_too_short'));
      return;
    }

    if (storyText.length > 10000) {
      toast.error(t('onboarding.validation.story_too_long'));
      return;
    }

    setIsLoading(true);
    try {
      if (isGuest) {
        // For guests: Store in localStorage
        guestSession.setStoryData(storyText, firstName, lastName, 'paste');
        setHasStoryData(true);
        toast.success('Story saved locally');
        setCurrentStep(2);
      } else {
        // For authenticated users: Save to database
        const { error } = await supabase
          .from('stories')
          .insert({
            user_id: user?.id,
            story_text: storyText,
            source_type: 'text',
            is_active: true,
            metadata: { first_name: firstName, last_name: lastName }
          });

        if (error) throw error;

        setHasStoryData(true);
        toast.success('Story saved successfully');
        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Error saving story:', error);
      toast.error('Failed to save story');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestStorySelect = async (story: any) => {
    setSelectedTestStoryId(story.id);
    setHasStoryData(true);

    if (user && !isGuest) {
      try {
        await supabase
          .from('profiles')
          .update({ active_test_story_id: story.id })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error saving test story selection:', error);
      }
    }

    toast.success('Mock story selected');
    setCurrentStep(2);
  };

  const handleStoryUploadComplete = (story: any) => {
    setHasStoryData(true);
    setUploadError(null);
    
    // For guests, also store in localStorage
    if (isGuest && story.story_text) {
      guestSession.setStoryData(story.story_text, '', '', 'upload');
    }
    
    toast.success('Story uploaded successfully');
    setCurrentStep(2);
  };

  const handleUploadError = (errorMessage: string) => {
    setUploadError(errorMessage);
  };

  const canProceedFromStep1 = () => {
    if (storyOption === 'upload') return hasStoryData;
    if (storyOption === 'paste') return firstName.trim() && lastName.trim() && storyText.trim().length >= 100;
    if (storyOption === 'mock') return hasStoryData;
    return hasStoryData; // Allow proceeding if already has story from before
  };

  const canProceedFromStep2 = () => {
    return skillsSelected.length > 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && canProceedFromStep1()) {
      if (storyOption === 'paste') {
        handlePasteStorySave();
      } else {
        setCurrentStep(2);
      }
    } else if (currentStep === 2 && canProceedFromStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      
      // Reset story option when going back to step 1
      if (currentStep === 2) {
        setStoryOption(null);
      }
    }
  };

  const handleStartInterview = () => {
    if (hasStoryData && skillsSelected.length > 0) {
      navigate('/interview');
      onComplete?.();
    } else {
      toast.error(t('onboarding.validation.complete_all_steps'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">
              {t('onboarding.progress', { current: currentStep, total: 3 })}
            </span>
            <span className="text-sm text-gray-400">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Story</span>
            <span>Skills</span>
            <span>Language</span>
          </div>
        </div>

        {/* Step Content */}
        <Card className="bg-gray-800/50 border-gray-700 p-6 md:p-8">
          {/* Step 1: Story Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Asylum Story
                </h2>
                <p className="text-gray-300">
                  {t('onboarding.step1_subtitle')}
                </p>
              </div>

              {!storyOption && (
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Upload I-589 Option */}
                  <Card
                    className="bg-primary/10 border-primary/50 p-6 cursor-pointer hover:bg-primary/20 transition-colors min-h-[180px] flex flex-col justify-center"
                    onClick={() => handleStoryOptionSelect('upload')}
                  >
                    <Upload className="w-12 h-12 text-primary mb-4 mx-auto" />
                    <h3 className="text-lg font-semibold text-white text-center">
                      {t('onboarding.upload_i589')}
                    </h3>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      {t('onboarding.upload_i589_quality')}
                    </p>
                    <div className="text-center mt-2">
                      <span className="text-xs bg-primary text-white px-2 py-1 rounded">
                        Recommended
                      </span>
                    </div>
                  </Card>

                  {/* Paste Story Option */}
                  <Card
                    className="bg-gray-700/30 border-gray-600 p-6 cursor-pointer hover:bg-gray-700/50 transition-colors min-h-[180px] flex flex-col justify-center"
                    onClick={() => handleStoryOptionSelect('paste')}
                  >
                    <FileText className="w-12 h-12 text-primary mb-4 mx-auto" />
                    <h3 className="text-lg font-semibold text-white text-center">
                      {t('onboarding.paste_story')}
                    </h3>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      {t('onboarding.paste_story_quality')}
                    </p>
                  </Card>

                  {/* Mock Story Option */}
                  <Card
                    className="bg-gray-700/30 border-gray-600 p-6 cursor-pointer hover:bg-gray-700/50 transition-colors min-h-[180px] flex flex-col justify-center"
                    onClick={() => handleStoryOptionSelect('mock')}
                  >
                    <BookOpen className="w-12 h-12 text-primary mb-4 mx-auto" />
                    <h3 className="text-lg font-semibold text-white text-center">
                      {t('onboarding.select_mock')}
                    </h3>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      {t('onboarding.select_mock_quality')}
                    </p>
                  </Card>
                </div>
              )}

              {/* Upload Story UI */}
              {storyOption === 'upload' && (
                <div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStoryOption(null);
                      setUploadError(null);
                    }}
                    className="mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to options
                  </Button>
                  
                  {uploadError && (
                    <Card className="bg-red-900/20 border-red-700 p-4 mb-4">
                      <div className="flex items-center gap-2 text-red-400 mb-3">
                        <AlertCircle className="w-5 h-5" />
                        <span>{uploadError}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setUploadError(null)}
                        >
                          Try Again
                        </Button>
                        <Button 
                          onClick={() => {
                            setUploadError(null);
                            setStoryOption('paste');
                          }}
                        >
                          Paste Story Instead
                        </Button>
                      </div>
                    </Card>
                  )}
                  
                  <StoryUploader
                    activeMode="upload"
                    onStoryAdded={handleStoryUploadComplete}
                    onError={handleUploadError}
                  />
                </div>
              )}

              {/* Paste Story UI */}
              {storyOption === 'paste' && (
                <div>
                  <Button
                    variant="ghost"
                    onClick={() => setStoryOption(null)}
                    className="mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to options
                  </Button>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName" className="text-white">First Name</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Enter your first name"
                          className="bg-gray-700/50 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-white">Last Name</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Enter your last name"
                          className="bg-gray-700/50 border-gray-600 text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="storyText" className="text-white">Your Story</Label>
                      <Textarea
                        id="storyText"
                        value={storyText}
                        onChange={(e) => setStoryText(e.target.value)}
                        placeholder="Paste or write your asylum story here..."
                        className="bg-gray-700/50 border-gray-600 text-white min-h-[300px]"
                        maxLength={10000}
                      />
                      <p className="text-sm text-gray-400 mt-2">
                        {storyText.length} / 10,000 characters
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mock Story Selector */}
              {storyOption === 'mock' && (
                <div>
                  <Button
                    variant="ghost"
                    onClick={() => setStoryOption(null)}
                    className="mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to options
                  </Button>
                  <GuestTestStorySelector
                    isOpen={true}
                    onOpenChange={() => setStoryOption(null)}
                    onStorySelect={handleTestStorySelect}
                  />
                </div>
              )}

            </div>
          )}

          {/* Step 2: Skills Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  {t('onboarding.step2_title')}
                </h2>
                <p className="text-gray-300">
                  {t('onboarding.step2_subtitle')}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {skillsSelected.length} {skillsSelected.length === 1 ? 'area' : 'areas'} selected
                </p>
              </div>

              <SkillsScroller />
            </div>
          )}

          {/* Step 3: Language & Start */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  {t('onboarding.step3_title')}
                </h2>
                <p className="text-gray-300 max-w-2xl mx-auto">
                  {t('onboarding.step3_message')}
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-6">
                <LanguageSelector />

                <Button
                  size="lg"
                  onClick={handleStartInterview}
                  className="w-full"
                  disabled={!hasStoryData || skillsSelected.length === 0}
                >
                  {t('onboarding.start_interview')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Navigation Buttons */}
        {currentStep < 3 && (
          <div className="flex justify-between mt-6">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="text-gray-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('onboarding.back')}
            </Button>

            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !canProceedFromStep1()) ||
                (currentStep === 2 && !canProceedFromStep2()) ||
                isLoading
              }
            >
              {isLoading ? 'Saving...' : t('onboarding.next')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
