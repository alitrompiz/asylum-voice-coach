import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <Badge variant="default" className="bg-gradient-to-r from-primary to-primary/80">
              Full Prep
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            ✓ Unlimited practice time<br />
            ✓ All officers available<br />
            ✓ All areas of focus<br />
            ✓ Priority support
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = sessionTime 
    ? Math.min(100, (sessionTime.session_seconds_used / sessionTime.session_seconds_limit) * 100)
    : 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          <Badge variant="secondary">Free Trial</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('dashboard.freeMinutesLeft')}
            </span>
            <span className="font-medium">
              {remainingMinutes === Infinity ? '∞' : remainingMinutes} min
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        <Button 
          onClick={createCheckout}
          disabled={creatingCheckout}
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          size="sm"
        >
          {creatingCheckout ? (
            'Opening checkout...'
          ) : (
            <>
              Upgrade to Full Prep
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
        
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          {t('dashboard.whatsIncluded')}
        </button>
      </CardContent>
    </Card>
  );
};