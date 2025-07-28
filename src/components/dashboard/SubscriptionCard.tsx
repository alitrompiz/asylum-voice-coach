import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useSessionTime } from '@/hooks/useSessionTime';
import { useTranslation } from 'react-i18next';
import { Crown, Clock } from 'lucide-react';

export const SubscriptionCard = () => {
  const { t } = useTranslation();
  const { isFreeTier, createCheckout, creatingCheckout } = useSubscription();
  const { remainingMinutes, sessionTime } = useSessionTime();

  if (!isFreeTier) {
    return (
      <Card className="h-20 bg-gray-900 border border-gray-600">
        <CardContent className="p-3 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-gray-300" />
            <div>
              <div className="text-sm font-medium text-gray-300">Full Prep</div>
              <div className="text-xs text-gray-300">∞ minutes • All officers • All skills</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = sessionTime 
    ? Math.min(100, (sessionTime.session_seconds_used / sessionTime.session_seconds_limit) * 100)
    : 0;

  // Create a simple progress circle using stroke-dasharray
  const circumference = 2 * Math.PI * 8; // radius of 8
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <Card className="h-20 bg-dashboard-blue border border-focus-border">
      <CardContent className="p-3 h-full">
        {/* Mobile layout: 3 rows stacked vertically */}
        <div className="flex flex-col gap-2 h-full xs:hidden">
          {/* Row 1: Title and remaining time with progress circle */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-focus-text">Free Trial</div>
            <div className="flex items-center gap-1">
              <div className="relative">
                <Clock className="h-3 w-3 text-focus-text" />
                <svg className="absolute -top-0.5 -left-0.5 w-4 h-4 transform -rotate-90" viewBox="0 0 16 16">
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="transparent"
                    className="text-gray-600"
                  />
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="text-orange-400"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="text-xs text-focus-text">
                {remainingMinutes === Infinity ? '∞' : remainingMinutes}min left
              </span>
            </div>
          </div>
          
          {/* Row 2: Full-width upgrade button */}
          <Button 
            onClick={createCheckout}
            disabled={creatingCheckout}
            size="sm"
            className="w-full h-7 text-xs bg-officer-halo hover:bg-officer-halo/90 text-white"
            aria-label="Upgrade to Full Prep"
          >
            {creatingCheckout ? (
              'Loading...'
            ) : (
              <>
                <Crown className="w-3 h-3 mr-1 text-yellow-300" aria-label="Crown icon" />
                Upgrade to Full Prep
              </>
            )}
          </Button>
          
          {/* Row 3: Centered sub-text */}
          <div className="text-xs text-focus-text text-center">to ace your interview</div>
        </div>

        {/* Desktop/tablet layout: horizontal */}
        <div className="hidden xs:flex items-center justify-between h-full">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Clock className="h-4 w-4 text-focus-text" />
              <svg className="absolute -top-1 -left-1 w-6 h-6 transform -rotate-90" viewBox="0 0 20 20">
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="transparent"
                  className="text-gray-600"
                />
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="text-orange-400"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-focus-text">Free Trial</div>
              <div className="text-xs text-focus-text">
                {remainingMinutes === Infinity ? '∞' : remainingMinutes}min left
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <Button 
              onClick={createCheckout}
              disabled={creatingCheckout}
              size="sm"
              className="h-6 px-2 text-xs bg-officer-halo hover:bg-officer-halo/90 text-white"
              aria-label="Upgrade to Full Prep"
            >
              {creatingCheckout ? (
                'Loading...'
              ) : (
                <>
                  <Crown className="w-3 h-3 mr-1 text-yellow-300" aria-label="Crown icon" />
                  Upgrade to Full Prep
                </>
              )}
            </Button>
            <div className="text-xs text-focus-text">to ace your interview</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};