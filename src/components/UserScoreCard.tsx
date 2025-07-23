
import { Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';

interface Score {
  credibility: number;
  story_clarity: number;
  case_strength: number;
}

const useUserScores = () => {
  const { user } = useAuth();
  
  
  return useQuery({
    queryKey: ['user-scores', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('scores')
        .select('credibility, story_clarity, case_strength')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as Score[];
    },
    enabled: !!user?.id,
  });
};

const ScoreRing = ({ score, label, tooltip }: { score: number; label: string; tooltip: string }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10b981"; // green
    if (score >= 60) return "#f59e0b"; // yellow
    return "#ef4444"; // red
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="3"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke={getScoreColor(score)}
            strokeWidth="3"
            strokeDasharray={`${(score / 100) * 125.66} 125.66`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-white">{score}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-center text-gray-300">{label}</span>
        <Popover>
          <PopoverTrigger asChild>
            <Info 
              className="w-2.5 h-2.5 text-gray-400 cursor-help hover:text-gray-300" 
              data-testid="info-icon"
            />
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 text-xs bg-gray-800 border-gray-700 text-white">
            {tooltip}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export const UserScoreCard = () => {
  const { t } = useTranslation();
  const { data: scores, isLoading, error } = useUserScores();

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="flex justify-center gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-gray-700 rounded-full" />
              <div className="w-12 h-3 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
        <div className="mt-2 text-center">
          <div className="w-32 h-3 bg-gray-700 rounded mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !scores || scores.length === 0) {
    return (
      <div>
        <div className="flex justify-center gap-4">
          <ScoreRing score={0} label={t('scores.credibility')} tooltip={t('scores.credibility_tooltip')} />
          <ScoreRing score={0} label={t('scores.story_clarity')} tooltip={t('scores.story_clarity_tooltip')} />
          <ScoreRing score={0} label={t('scores.case_strength')} tooltip={t('scores.case_strength_tooltip')} />
        </div>
        <div className="mt-1 text-center">
          <p className="text-sm text-gray-400">
            {t('scores.overall_readiness', { score: 0 })}
          </p>
        </div>
      </div>
    );
  }

  // Calculate averages from recent scores
  const avgCredibility = Math.round(scores.reduce((sum, s) => sum + s.credibility, 0) / scores.length);
  const avgStoryClarity = Math.round(scores.reduce((sum, s) => sum + s.story_clarity, 0) / scores.length);
  const avgCaseStrength = Math.round(scores.reduce((sum, s) => sum + s.case_strength, 0) / scores.length);
  const overallAverage = Math.round((avgCredibility + avgStoryClarity + avgCaseStrength) / 3);

  return (
    <div>
      <div className="flex justify-center gap-4">
        <ScoreRing 
          score={avgCredibility} 
          label={t('scores.credibility')} 
          tooltip={t('scores.credibility_tooltip')} 
        />
        <ScoreRing 
          score={avgStoryClarity} 
          label={t('scores.story_clarity')} 
          tooltip={t('scores.story_clarity_tooltip')} 
        />
        <ScoreRing 
          score={avgCaseStrength} 
          label={t('scores.case_strength')} 
          tooltip={t('scores.case_strength_tooltip')} 
        />
      </div>
      <div className="mt-1 text-center">
        <p className="text-sm font-medium text-white">
          {t('scores.overall_readiness', { score: overallAverage })}
        </p>
      </div>
    </div>
  );
};
