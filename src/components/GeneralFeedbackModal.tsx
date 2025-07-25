import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GeneralFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GeneralFeedbackModal({ open, onOpenChange }: GeneralFeedbackModalProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!feedbackText.trim()) {
      toast({
        title: "Please enter feedback",
        description: "We'd love to hear your thoughts!",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-feedback-email', {
        body: {
          type: 'general',
          feedbackText: feedbackText
        }
      });

      if (error) throw error;

      toast({
        title: "Thank you!",
        description: "Your feedback has been sent successfully.",
      });

      // Reset form and close modal
      setFeedbackText('');
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error sending feedback:', error);
      toast({
        title: "Error",
        description: "Failed to send feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFeedbackText('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white text-xl font-semibold">
              How can we improve?
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
          <div className="space-y-2">
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tell us about your experience, what features you'd like to see, or any issues you've encountered..."
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[120px]"
            />
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !feedbackText.trim()}
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
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}