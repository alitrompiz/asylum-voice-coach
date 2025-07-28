import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSubscription } from '@/hooks/useSubscription';
import { useSessionTime } from '@/hooks/useSessionTime';
import { useTranslation } from 'react-i18next';
import { Crown, Clock, ArrowRight } from 'lucide-react';

export const SubscriptionCard = () => {
  const { t } = useTranslation();
  const { isFreeTier, createCheckout, creatingCheckout } = useSubscription();
  const { remainingMinutes, sessionTime } = useSessionTime();

  if (!isFreeTier) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-purple-400" />
              <Badge variant="default" className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-blue-500">
                Full Prep
              </Badge>
            </div>
          </div>
          <div className="text-xs text-gray-300 leading-relaxed">
            ∞ minutes • All officers • All skills • Priority support
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = sessionTime 
    ? Math.min(100, (sessionTime.session_seconds_used / sessionTime.session_seconds_limit) * 100)
    : 0;

  return (
    <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20">
      <CardContent className="p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-orange-400" />
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              Free Trial
            </Badge>
          </div>
          <span className="text-xs font-medium text-white">
            {remainingMinutes === Infinity ? '∞' : remainingMinutes}m
          </span>
        </div>
        
        <Progress value={progressPercentage} className="h-1.5" />
        
        <Button 
          onClick={createCheckout}
          disabled={creatingCheckout}
          size="sm"
          className="w-full h-7 text-xs bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
        >
          {creatingCheckout ? (
            'Loading...'
          ) : (
            <>
              Upgrade
              <ArrowRight className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};