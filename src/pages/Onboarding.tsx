import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const ONBOARDING_STEPS = [
  {
    title: 'Welcome to AsylumPrep',
    description: 'Let\'s get you set up for interview practice',
    content: 'Welcome! We\'ll help you prepare for your asylum interview with AI-powered practice sessions.',
  },
  {
    title: 'Your Background',
    description: 'Tell us about your situation',
    content: 'This will help us customize your practice experience.',
  },
  {
    title: 'Language Preference',
    description: 'Choose your preferred language',
    content: 'Select the language you\'re most comfortable with for practice.',
  },
  {
    title: 'Ready to Start',
    description: 'You\'re all set!',
    content: 'Your profile is complete. Let\'s begin your interview preparation.',
  },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      toast.success('Onboarding complete!');
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
  const step = ONBOARDING_STEPS[currentStep];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="mb-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              Step {currentStep + 1} of {ONBOARDING_STEPS.length}
            </p>
          </div>
          <CardTitle>{step.title}</CardTitle>
          <CardDescription>{step.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-8">
            <p className="text-muted-foreground">{step.content}</p>
          </div>
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              Back
            </Button>
            <Button onClick={handleNext}>
              {currentStep === ONBOARDING_STEPS.length - 1 ? 'Complete' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}