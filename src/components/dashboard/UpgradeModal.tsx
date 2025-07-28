import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import { Crown, Clock, Users, Target, HeadphonesIcon, X } from 'lucide-react';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: 'time_exhausted' | 'locked_feature';
}

export const UpgradeModal = ({ open, onOpenChange, reason }: UpgradeModalProps) => {
  const { t } = useTranslation();
  const { createCheckout, creatingCheckout } = useSubscription();

  const handleUpgrade = () => {
    createCheckout();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0">
        <div className="relative bg-gradient-to-br from-purple-600 to-blue-600 text-white p-4 rounded-t-lg">
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold">
              {reason === 'time_exhausted' ? 'Time\'s Up!' : 'Upgrade to Full Prep'}
            </DialogTitle>
          </div>
          
          {reason === 'time_exhausted' && (
            <p className="text-sm text-purple-100">
              You've used your 10 free minutes. Unlock unlimited practice time!
            </p>
          )}
        </div>
        
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-green-800">Unlimited time</span>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-blue-800">All officers</span>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-purple-50 rounded">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="text-purple-800">All skills</span>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-orange-50 rounded">
              <HeadphonesIcon className="h-4 w-4 text-orange-600" />
              <span className="text-orange-800">Priority support</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900">$199</div>
            <div className="text-xs text-gray-600">per month</div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1 text-xs h-8"
            >
              Maybe Later
            </Button>
            <Button 
              onClick={handleUpgrade}
              disabled={creatingCheckout}
              className="flex-1 text-xs h-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {creatingCheckout ? 'Loading...' : 'Upgrade Now'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};