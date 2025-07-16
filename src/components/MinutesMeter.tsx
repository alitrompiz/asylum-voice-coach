import { useEffect } from 'react';
import { useMinutesStore } from '@/stores/minutesStore';
import { cn } from '@/lib/utils';

interface MinutesMeterProps {
  currentMinutes?: number;
  freeTrialUsed?: boolean;
  onZeroMinutes?: () => void;
  className?: string;
}

export default function MinutesMeter({ 
  currentMinutes: propMinutes,
  freeTrialUsed: propFreeTrialUsed,
  onZeroMinutes,
  className 
}: MinutesMeterProps) {
  const { 
    currentMinutes: storeMinutes, 
    freeTrialUsed: storeFreeTrialUsed,
    fetchMinutesBalance 
  } = useMinutesStore();

  const currentMinutes = propMinutes ?? storeMinutes;
  const freeTrialUsed = propFreeTrialUsed ?? storeFreeTrialUsed;

  useEffect(() => {
    fetchMinutesBalance();
  }, [fetchMinutesBalance]);

  useEffect(() => {
    if (currentMinutes === 0 && onZeroMinutes) {
      onZeroMinutes();
    }
  }, [currentMinutes, onZeroMinutes]);

  // Color logic based on minutes remaining
  const getColor = () => {
    if (currentMinutes > 10) return { primary: '#10b981', secondary: '#d1fae5' }; // green
    if (currentMinutes >= 2) return { primary: '#f59e0b', secondary: '#fef3c7' }; // yellow
    return { primary: '#ef4444', secondary: '#fee2e2' }; // red
  };

  const colors = getColor();
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const maxMinutes = 60; // Assume 60 minutes max for progress calculation
  const progress = Math.min(currentMinutes / maxMinutes, 1);
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="relative">
        <svg
          className="transform -rotate-90"
          width="100"
          height="100"
          viewBox="0 0 100 100"
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={colors.secondary}
            strokeWidth="8"
            fill="none"
          />
          
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={colors.primary}
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span 
            className="text-2xl font-bold tabular-nums"
            style={{ color: colors.primary }}
          >
            {currentMinutes}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentMinutes === 1 ? 'min' : 'mins'}
          </span>
        </div>
      </div>
      
      {/* Free trial indicator */}
      {freeTrialUsed && (
        <div className="ml-2 text-xs text-muted-foreground">
          Trial Used
        </div>
      )}
    </div>
  );
}