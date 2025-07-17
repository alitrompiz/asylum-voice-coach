import { Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

interface Score {
  credibility: number;
  story_clarity: number;
  case_strength: number;
}

const useUserScores = () => {
  const { user } = useAuthStore();
  
  
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
    if (score >= 80) return "hsl(var(--success))";
    if (score >= 60) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
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
            stroke="hsl(var(--muted))"
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
          <span className="text-xs font-semibold">{score}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-center">{label}</span>
        <Popover>
          <PopoverTrigger asChild>
            <Info 
              className="w-2.5 h-2.5 text-muted-foreground cursor-help hover:text-foreground" 
              data-testid="info-icon"
            />
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 text-xs">
            {tooltip}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export const UserScoreCard = () => {
  const { data: scores, isLoading, error } = useUserScores();

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-3 border animate-pulse">
        <div className="flex justify-center gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-muted rounded-full" />
              <div className="w-12 h-3 bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="mt-2 text-center">
          <div className="w-32 h-3 bg-muted rounded mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !scores || scores.length === 0) {
    return (
      <div className="bg-card rounded-lg p-3 border">
        <div className="flex justify-center gap-4">
          <ScoreRing score={0} label="Credibility" tooltip="Perceived honesty of your answers" />
          <ScoreRing score={0} label="Story Clarity" tooltip="How clearly you narrate events" />
          <ScoreRing score={0} label="Case Strength" tooltip="Match between your story and asylum criteria" />
        </div>
        <div className="mt-2 text-center">
          <p className="text-sm text-muted-foreground">
            Your overall readiness: 0/100
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Complete practice interviews to see your scores
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
    <div className="bg-card rounded-lg p-3 border">
      <div className="flex justify-center gap-4">
        <ScoreRing 
          score={avgCredibility} 
          label="Credibility" 
          tooltip="Perceived honesty of your answers" 
        />
        <ScoreRing 
          score={avgStoryClarity} 
          label="Story Clarity" 
          tooltip="How clearly you narrate events" 
        />
        <ScoreRing 
          score={avgCaseStrength} 
          label="Case Strength" 
          tooltip="Match between your story and asylum criteria" 
        />
      </div>
      <div className="mt-2 text-center">
        <p className="text-sm font-medium">
          Your overall readiness: {overallAverage}/100
        </p>
      </div>
    </div>
  );
};