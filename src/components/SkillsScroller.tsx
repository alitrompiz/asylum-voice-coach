import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useSkillsStore } from '@/stores/personaStore';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  group_name: string;
  is_active: boolean;
  sort_order: number;
}

const useSkills = () => {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as Skill[];
    },
  });
};

export const SkillsScroller = () => {
  const { data: skills, isLoading, error } = useSkills();
  const { skillsSelected, toggleSkill } = useSkillsStore();

  const handleSkillToggle = (skillId: string) => {
    toggleSkill(skillId);
  };

  const handleKeyDown = (event: React.KeyboardEvent, skillId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSkillToggle(skillId);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-3 border">
        <h3 className="text-lg font-semibold mb-3">Pick areas of focus</h3>
        <div className="space-y-3">
          {[1, 2].map((row) => (
            <div key={row} className="flex gap-2 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 bg-muted rounded-full px-4" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !skills || skills.length === 0) {
    return (
      <div className="bg-card rounded-lg p-3 border">
        <h3 className="text-lg font-semibold mb-3">Pick areas of focus</h3>
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <ChevronRight className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-center">No focus areas are currently active.</p>
          <p className="text-sm text-muted-foreground mt-1">Contact your administrator to add areas.</p>
        </div>
      </div>
    );
  }

  // Split skills into two rows for better distribution
  const midpoint = Math.ceil(skills.length / 2);
  const row1Skills = skills.slice(0, midpoint);
  const row2Skills = skills.slice(midpoint);

  return (
    <div className="bg-card rounded-lg p-3 border">
      <h3 className="text-lg font-semibold mb-3">Pick areas of focus</h3>
      <div className="space-y-3">
        {/* Row 1 */}
        <ScrollArea className="w-full h-[60px]">
          <div className="flex gap-2 py-1 snap-x snap-mandatory overflow-x-auto min-h-[52px]">
            {row1Skills.map((skill) => (
              <Badge
                key={skill.id}
                variant={skillsSelected.includes(skill.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer snap-center transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "px-3 py-1 text-sm font-medium whitespace-nowrap",
                  skillsSelected.includes(skill.id) 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                )}
                onClick={() => handleSkillToggle(skill.id)}
                onKeyDown={(e) => handleKeyDown(e, skill.id)}
                tabIndex={0}
                role="button"
                aria-pressed={skillsSelected.includes(skill.id)}
                data-testid={`skill-chip-${skill.id}`}
              >
                {skill.name}
              </Badge>
            ))}
          </div>
        </ScrollArea>

        {/* Row 2 */}
        <ScrollArea className="w-full h-[60px]">
          <div className="flex gap-2 py-1 snap-x snap-mandatory overflow-x-auto min-h-[52px]">
            {row2Skills.map((skill) => (
              <Badge
                key={skill.id}
                variant={skillsSelected.includes(skill.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer snap-center transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "px-3 py-1 text-sm font-medium whitespace-nowrap",
                  skillsSelected.includes(skill.id) 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                )}
                onClick={() => handleSkillToggle(skill.id)}
                onKeyDown={(e) => handleKeyDown(e, skill.id)}
                tabIndex={0}
                role="button"
                aria-pressed={skillsSelected.includes(skill.id)}
                data-testid={`skill-chip-${skill.id}`}
              >
                {skill.name}
              </Badge>
            ))}
          </div>
        </ScrollArea>
      </div>
      
    </div>
  );
};