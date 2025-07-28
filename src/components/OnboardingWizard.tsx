import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, ChevronLeft, ChevronRight, Globe, Bell, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const COUNTRIES = [
  'afghanistan', 'albania', 'algeria', 'angola', 'argentina', 'armenia', 'australia', 'austria', 'azerbaijan',
  'bahrain', 'bangladesh', 'belarus', 'belgium', 'bolivia', 'bosnia_herzegovina', 'brazil', 'bulgaria', 'burma',
  'cameroon', 'canada', 'chile', 'china', 'colombia', 'congo', 'cuba', 'czech_republic', 'denmark', 'ecuador',
  'egypt', 'el_salvador', 'eritrea', 'estonia', 'ethiopia', 'france', 'georgia', 'germany', 'ghana', 'greece',
  'guatemala', 'guinea', 'haiti', 'honduras', 'hungary', 'india', 'indonesia', 'iran', 'iraq', 'italy',
  'ivory_coast', 'jamaica', 'jordan', 'kazakhstan', 'kenya', 'kosovo', 'kyrgyzstan', 'laos', 'latvia',
  'lebanon', 'liberia', 'libya', 'lithuania', 'mexico', 'moldova', 'morocco', 'nepal', 'nicaragua',
  'nigeria', 'north_korea', 'pakistan', 'palestine', 'peru', 'philippines', 'poland', 'romania', 'russia',
  'rwanda', 'senegal', 'serbia', 'sierra_leone', 'somalia', 'south_africa', 'south_korea', 'sri_lanka',
  'sudan', 'syria', 'tajikistan', 'thailand', 'turkey', 'turkmenistan', 'ukraine', 'uzbekistan',
  'venezuela', 'vietnam', 'yemen', 'zimbabwe'
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'ht', name: 'Kreyòl Ayisyen' },
  { code: 'uk', name: 'Українська' },
  { code: 'zh', name: '中文' },
];

const onboardingSchema = z.object({
  legalName: z.string().min(1, 'validation.required'),
  preferredName: z.string().optional(),
  countryOfFearedPersecution: z.string().min(1, 'validation.required'),
  asylumOfficeFiled: z.string().min(1, 'validation.required'),
  dateFiled: z.date({ required_error: 'validation.required' }),
  interviewDate: z.date().optional(),
  notificationsOptedIn: z.boolean().default(false),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function OnboardingWizard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 6;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
  });

  const watchedValues = watch();

  // Language switcher
  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  // Navigation handlers
  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isStepValid = await trigger(fieldsToValidate);
    
    if (isStepValid) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const skipOnboarding = async () => {
    await saveOnboardingData('skipped');
    navigate('/dashboard');
  };

  const getFieldsForStep = (step: number): (keyof OnboardingFormData)[] => {
    switch (step) {
      case 1: return ['legalName'];
      case 2: return ['countryOfFearedPersecution'];
      case 3: return ['asylumOfficeFiled'];
      case 4: return ['dateFiled'];
      case 5: return [];
      case 6: return [];
      default: return [];
    }
  };

  const saveOnboardingData = async (status: 'completed' | 'skipped' | 'in_progress') => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          legal_name: watchedValues.legalName,
          preferred_name: watchedValues.preferredName,
          country_of_feared_persecution: watchedValues.countryOfFearedPersecution,
          asylum_office_filed: watchedValues.asylumOfficeFiled,
          date_filed: watchedValues.dateFiled?.toISOString().split('T')[0],
          interview_date: watchedValues.interviewDate?.toISOString().split('T')[0],
          notifications_opted_in: watchedValues.notificationsOptedIn,
          onboarding_status: status,
          language_preference: i18n.language,
        });

      if (error) throw error;

      toast.success(
        status === 'completed' ? 'Onboarding completed successfully!' : 'Progress saved!'
      );
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to save onboarding data');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: OnboardingFormData) => {
    await saveOnboardingData('completed');
    navigate('/dashboard');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">{t('onboarding.legal_name.title')}</h2>
              <p className="text-muted-foreground mt-2">{t('onboarding.legal_name.subtitle')}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="legalName">{t('onboarding.legal_name.legal_name_label')}</Label>
                <Input
                  id="legalName"
                  {...register('legalName')}
                  placeholder={t('onboarding.legal_name.legal_name_placeholder')}
                  className="mt-1"
                />
                {errors.legalName && (
                  <p className="text-sm text-destructive mt-1">{t(errors.legalName.message!)}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="preferredName">{t('onboarding.legal_name.preferred_name_label')}</Label>
                <Input
                  id="preferredName"
                  {...register('preferredName')}
                  placeholder={t('onboarding.legal_name.preferred_name_placeholder')}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">{t('onboarding.country.title')}</h2>
              <p className="text-muted-foreground mt-2">{t('onboarding.country.subtitle')}</p>
            </div>
            
            <div>
              <Label>{t('onboarding.country.country_label')}</Label>
              <Select
                value={watchedValues.countryOfFearedPersecution}
                onValueChange={(value) => setValue('countryOfFearedPersecution', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('onboarding.country.country_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {t(`countries.${country}`, country)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.countryOfFearedPersecution && (
                <p className="text-sm text-destructive mt-1">{t(errors.countryOfFearedPersecution.message!)}</p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">{t('onboarding.asylum_office.title')}</h2>
              <p className="text-muted-foreground mt-2">{t('onboarding.asylum_office.subtitle')}</p>
            </div>
            
            <div>
              <Label htmlFor="asylumOfficeFiled">{t('onboarding.asylum_office.office_label')}</Label>
              <Input
                id="asylumOfficeFiled"
                {...register('asylumOfficeFiled')}
                placeholder={t('onboarding.asylum_office.office_placeholder')}
                className="mt-1"
              />
              {errors.asylumOfficeFiled && (
                <p className="text-sm text-destructive mt-1">{t(errors.asylumOfficeFiled.message!)}</p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">{t('onboarding.dates.title')}</h2>
              <p className="text-muted-foreground mt-2">{t('onboarding.dates.subtitle')}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>{t('onboarding.dates.date_filed_label')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal mt-1',
                        !watchedValues.dateFiled && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchedValues.dateFiled ? (
                        format(watchedValues.dateFiled, 'PPP')
                      ) : (
                        <span>{t('onboarding.dates.date_filed_placeholder')}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={watchedValues.dateFiled}
                      onSelect={(date) => setValue('dateFiled', date)}
                      className="pointer-events-auto"
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.dateFiled && (
                  <p className="text-sm text-destructive mt-1">{t(errors.dateFiled.message!)}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">{t('onboarding.dates.title')}</h2>
              <p className="text-muted-foreground mt-2">{t('onboarding.dates.subtitle')}</p>
            </div>
            
            <div>
              <Label>{t('onboarding.dates.interview_date_label')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal mt-1',
                      !watchedValues.interviewDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchedValues.interviewDate ? (
                      format(watchedValues.interviewDate, 'PPP')
                    ) : (
                      <span>{t('onboarding.dates.interview_date_placeholder')}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={watchedValues.interviewDate}
                    onSelect={(date) => setValue('interviewDate', date)}
                    className="pointer-events-auto"
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Bell className="mx-auto h-16 w-16 text-primary mb-4" />
              <h2 className="text-2xl font-bold">{t('onboarding.notifications.title')}</h2>
              <p className="text-muted-foreground mt-2">{t('onboarding.notifications.subtitle')}</p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-4">
                {t('onboarding.notifications.description')}
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setValue('notificationsOptedIn', true);
                    handleSubmit(onSubmit)();
                  }}
                  className="w-full"
                  disabled={loading}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {t('onboarding.notifications.allow_button')}
                </Button>
                
                <Button
                  onClick={() => {
                    setValue('notificationsOptedIn', false);
                    handleSubmit(onSubmit)();
                  }}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  {t('onboarding.notifications.skip_button')}
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Language Selector */}
        <div className="flex justify-end mb-6">
          <Select value={i18n.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-48">
              <Globe className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="text-center">
                <CardTitle className="text-3xl">{t('onboarding.title')}</CardTitle>
                <CardDescription className="text-lg mt-2">
                  {t('onboarding.subtitle')}
                </CardDescription>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t('onboarding.progress', { current: currentStep, total: totalSteps })}</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {renderStep()}
              
              {/* Mobile: Stack buttons vertically, Skip last */}
              <div className="sm:hidden space-y-3 pt-6">
                {currentStep < totalSteps && (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={loading}
                    className="w-full"
                  >
                    {t('onboarding.next')}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={loading}
                    className="w-full"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    {t('onboarding.back')}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={skipOnboarding}
                  disabled={loading}
                  className="w-full"
                >
                  {t('onboarding.skip')}
                </Button>
              </div>

              {/* Desktop: Horizontal layout */}
              <div className="hidden sm:flex justify-between pt-6">
                <div className="flex gap-2">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      disabled={loading}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      {t('onboarding.back')}
                    </Button>
                  )}
                  
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={skipOnboarding}
                    disabled={loading}
                  >
                    {t('onboarding.skip')}
                  </Button>
                </div>
                
                {currentStep < totalSteps && (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={loading}
                  >
                    {t('onboarding.next')}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}