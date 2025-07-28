import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import { Crown, Clock, Users, Target, HeadphonesIcon } from 'lucide-react';

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            {reason === 'time_exhausted' 
              ? t('upgrade.timeExhausted') 
              : 'Upgrade to Full Prep'
            }
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {reason === 'time_exhausted' && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-800">
                {t('upgrade.timeExhaustedMessage')}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-medium">What's included in Full Prep:</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-green-600" />
                <span className="text-sm">Unlimited practice time</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm">All immigration officers</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-purple-600" />
                <span className="text-sm">All areas of focus</span>
              </div>
              
              <div className="flex items-center gap-3">
                <HeadphonesIcon className="h-5 w-5 text-orange-600" />
                <span className="text-sm">Priority support</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold">$199</div>
              <div className="text-sm text-muted-foreground">per month</div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button 
              onClick={handleUpgrade}
              disabled={creatingCheckout}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80"
            >
              {creatingCheckout ? 'Loading...' : 'Upgrade Now'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};