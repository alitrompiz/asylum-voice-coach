import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface GeneratingFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function GeneratingFeedbackModal({ 
  open, 
  onOpenChange, 
  onComplete 
}: GeneratingFeedbackModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <div className="text-center space-y-6 py-8">
          {/* Animated Spinner */}
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin" data-testid="loader-icon" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">
              Generating Feedback...
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              When it's done, you'll see it in Past Feedback on your Profile.
            </p>
          </div>

          {/* OK Button */}
          <Button 
            onClick={onComplete}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3"
          >
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}