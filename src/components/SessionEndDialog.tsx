import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SessionFeedbackModal } from '@/components/SessionFeedbackModal';
import { GuestSignUpPrompt } from '@/components/GuestSignUpPrompt';
import { supabase } from '@/integrations/supabase/client';

interface SessionEndDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionDuration: number; // in seconds
  onFeedbackRequest: () => Promise<void>;
  isGuest?: boolean;
  sessionData?: {
    transcript?: string;
    personaId?: string;
    skills?: string[];
    sessionId?: string;
  };
}

interface SessionPhrase {
  id: string;
  phrase_text: string;
  phrase_type: 'good' | 'cut_short';
}


export function SessionEndDialog({ 
  open, 
  onOpenChange, 
  sessionDuration, 
  onFeedbackRequest,
  isGuest = false,
  sessionData 
}: SessionEndDialogProps) {
  const [isProcessingFeedback, setIsProcessingFeedback] = useState(false);
  const [showSessionFeedback, setShowSessionFeedback] = useState(false);
  const [goodPhrases, setGoodPhrases] = useState<SessionPhrase[]>([]);
  const [cutShortPhrases, setCutShortPhrases] = useState<SessionPhrase[]>([]);
  const [sessionThreshold, setSessionThreshold] = useState(120); // Default: 2 minutes
  const [selectedPhrase, setSelectedPhrase] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch phrases and settings when dialog opens
  useEffect(() => {
    if (open) {
      fetchPhrasesAndSettings();
    }
  }, [open]);

  const fetchPhrasesAndSettings = async () => {
    try {
      // Fetch phrases
      const { data: phrasesData, error: phrasesError } = await supabase
        .from('session_phrases')
        .select('*')
        .eq('is_active', true);

      if (phrasesError) throw phrasesError;

      const good = (phrasesData?.filter(p => p.phrase_type === 'good') || []) as SessionPhrase[];
      const cutShort = (phrasesData?.filter(p => p.phrase_type === 'cut_short') || []) as SessionPhrase[];
      
      setGoodPhrases(good);
      setCutShortPhrases(cutShort);

      // Fetch session threshold setting
      const { data: settingsData, error: settingsError } = await supabase
        .from('session_settings')
        .select('setting_value')
        .eq('setting_key', 'session_cutshort_threshold_seconds')
        .single();

      if (settingsError) {
        console.warn('Could not fetch session threshold, using default:', settingsError);
      } else if (settingsData) {
        setSessionThreshold(settingsData.setting_value);
      }

      // Select a random phrase based on session duration
      const isSessionCutShort = sessionDuration < (settingsData?.setting_value || 120);
      const phrasesToUse = isSessionCutShort ? cutShort : good;
      
      if (phrasesToUse.length > 0) {
        const randomPhrase = phrasesToUse[Math.floor(Math.random() * phrasesToUse.length)];
        setSelectedPhrase(randomPhrase.phrase_text);
      } else {
        // Fallback to default phrases if none in database
        const fallbackPhrases = isSessionCutShort 
          ? ["Session ended early. Every practice counts!"]
          : ["Great work! You completed a full practice session."];
        setSelectedPhrase(fallbackPhrases[0]);
      }

    } catch (error: any) {
      console.error('Error fetching phrases and settings:', error);
      // Use fallback phrase
      const isSessionCutShort = sessionDuration < sessionThreshold;
      const fallbackPhrase = isSessionCutShort 
        ? "Session ended early. Every practice counts!"
        : "Great work! You completed a full practice session.";
      setSelectedPhrase(fallbackPhrase);
    }
  };

  const handleGetFeedback = async () => {
    setIsProcessingFeedback(true);
    
    try {
      // Start feedback generation in background
      await onFeedbackRequest();
      
      // Show feedback modal after short delay
      setTimeout(() => {
        setShowSessionFeedback(true);
        setIsProcessingFeedback(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error generating feedback:', error);
      toast({
        title: "Couldn't generate your feedback",
        description: "Please try again",
        variant: "destructive"
      });
      setIsProcessingFeedback(false);
    }
  };

  const handleExitWithoutFeedback = () => {
    onOpenChange(false);
    navigate('/dashboard');
  };

  // Show guest sign-up prompt for guest users
  if (isGuest) {
    return (
      <GuestSignUpPrompt 
        open={open}
        onOpenChange={onOpenChange}
        sessionDuration={sessionDuration}
      />
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="sm:max-w-[500px] bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700"
          data-testid="session-end-dialog"
        >
          <div className="text-center space-y-6 py-6">
            {/* Session End Phrase */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                {selectedPhrase}
              </h2>
              <p className="text-gray-300 text-sm" data-testid="session-duration">
                Session Duration: {Math.floor(sessionDuration / 60)}m {sessionDuration % 60}s
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Primary Button: Get Feedback */}
              <div className="space-y-2">
                <Button 
                  onClick={handleGetFeedback}
                  disabled={isProcessingFeedback}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 text-lg"
                >
                  {isProcessingFeedback ? (
                    "Processing..."
                  ) : (
                    "Get my session feedback 💪🏼✨"
                  )}
                </Button>
                <p className="text-xs text-gray-400">
                  We'll analyze your performance and provide personalized insights
                </p>
              </div>

              {/* Secondary Button: Exit Without Feedback */}
              <Button 
                variant="outline"
                onClick={handleExitWithoutFeedback}
                disabled={isProcessingFeedback}
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                Exit without feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Feedback Modal */}
      <SessionFeedbackModal 
        open={showSessionFeedback}
        onOpenChange={(open) => {
          setShowSessionFeedback(open);
          if (!open) {
            navigate('/dashboard');
          }
        }}
      />
    </>
  );
}