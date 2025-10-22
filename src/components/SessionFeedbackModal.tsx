import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SessionFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionFeedbackModal({ open, onOpenChange }: SessionFeedbackModalProps) {
  const [selectedThumb, setSelectedThumb] = useState<'up' | 'down' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTextarea, setShowTextarea] = useState(false);
  const { toast } = useToast();

  const handleThumbSelect = (thumb: 'up' | 'down') => {
    setSelectedThumb(thumb);
    setShowTextarea(true);
  };

  const handleSubmit = async () => {
    if (!selectedThumb) return;
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-feedback-email', {
        body: {
          type: 'session',
          thumbValue: selectedThumb,
          feedbackText: feedbackText || 'No additional feedback provided.'
        }
      });

      if (error) throw error;

      toast({
        title: "Thanks for your feedback!",
      });

      // Reset form and close modal
      setSelectedThumb(null);
      setFeedbackText('');
      setShowTextarea(false);
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error sending feedback:', error);
      toast({
        title: "Couldn't send your feedback",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedThumb(null);
    setFeedbackText('');
    setShowTextarea(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white text-xl font-semibold">
              How did we do?
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {!showTextarea ? (
            // Step 1: Thumb selection
            <div className="flex justify-center gap-8">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => handleThumbSelect('up')}
                className="flex flex-col items-center gap-2 p-6 h-auto text-gray-300 hover:text-green-400 hover:bg-green-400/10"
              >
                <ThumbsUp className="h-12 w-12" />
                <span className="text-sm">Good</span>
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                onClick={() => handleThumbSelect('down')}
                className="flex flex-col items-center gap-2 p-6 h-auto text-gray-300 hover:text-red-400 hover:bg-red-400/10"
              >
                <ThumbsDown className="h-12 w-12" />
                <span className="text-sm">Poor</span>
              </Button>
            </div>
          ) : (
            // Step 2: Optional feedback text
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-300">
                <span>You selected:</span>
                {selectedThumb === 'up' ? (
                  <ThumbsUp className="h-5 w-5 text-green-400" />
                ) : (
                  <ThumbsDown className="h-5 w-5 text-red-400" />
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-white font-medium">
                  Please tell us more:
                </label>
                <Textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="What went well? What could be improved?"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[100px]"
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? "Sending..." : "Send"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}