import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SessionFeedbackModal } from '@/components/SessionFeedbackModal';
import { supabase } from '@/integrations/supabase/client';

// Default phrases for session endings
const GOOD_PHRASES = [
  "Great work! You completed a full practice session.",
  "Excellent! You made it through the entire session.",
  "Well done! You stayed focused throughout the session.",
  "Fantastic! You completed the full interview practice.",
  "Outstanding! You engaged with the full session."
];

const CUT_SHORT_PHRASES = [
  "Session ended early. Every practice counts!",
  "Short session, but still valuable practice time.",
  "Brief session completed. Progress is progress!",
  "Quick practice session finished.",
  "Short but focused practice time completed."
];

// Default threshold: 2 minutes (120 seconds)
const DEFAULT_SESSION_THRESHOLD = 120;

interface SessionEndDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionDuration: number; // in seconds
  onFeedbackRequest: () => Promise<void>;
  sessionData?: {
    transcript?: string;
    personaId?: string;
    skills?: string[];
    sessionId?: string;
  };
}

export function SessionEndDialog({ 
  open, 
  onOpenChange, 
  sessionDuration, 
  onFeedbackRequest,
  sessionData 
}: SessionEndDialogProps) {
  const [isProcessingFeedback, setIsProcessingFeedback] = useState(false);
  const [showSessionFeedback, setShowSessionFeedback] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Determine if session was cut short based on threshold
  const isSessionCutShort = sessionDuration < DEFAULT_SESSION_THRESHOLD;
  
  // Select random phrase from appropriate list
  const phrases = isSessionCutShort ? CUT_SHORT_PHRASES : GOOD_PHRASES;
  const selectedPhrase = phrases[Math.floor(Math.random() * phrases.length)];

  const handleGetFeedback = async () => {
    setIsProcessingFeedback(true);
    
    try {
      // Show processing toast
      toast({
        title: "Processing...",
        description: "Generating your session feedback",
      });

      // Start feedback generation in background
      await onFeedbackRequest();
      
      // Simulate processing time for UX
      setTimeout(() => {
        onOpenChange(false);
        setShowSessionFeedback(true);
      }, 2000);
      
    } catch (error) {
      console.error('Error generating feedback:', error);
      toast({
        title: "Error",
        description: "Failed to generate feedback. Please try again.",
        variant: "destructive"
      });
      setIsProcessingFeedback(false);
    }
  };

  const handleExitWithoutFeedback = () => {
    onOpenChange(false);
    navigate('/dashboard');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <div className="text-center space-y-6 py-6">
            {/* Session End Phrase */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                {selectedPhrase}
              </h2>
              <p className="text-gray-300 text-sm">
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