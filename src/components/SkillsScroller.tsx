
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useSkillsStore } from '@/stores/personaStore';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const { data: skills, isLoading, error } = useSkills();
  const { skillsSelected, toggleSkill } = useSkillsStore();

  // Function to translate skill names
  const translateSkillName = (skillName: string) => {
    // Create a key from the skill name for translation lookup
    const key = `skills.names.${skillName.toLowerCase().replace(/ /g, '_').replace(/[^a-z_]/g, '')}`;
    const translated = t(key);
    // If translation exists (key is different from translated), use it, otherwise fallback to original
    return translated !== key ? translated : skillName;
  };

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
      <div>
        <h3 className="text-lg font-semibold mb-2 text-white">{t('skills.title')}</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((row) => (
            <div key={row} className="flex gap-2 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-gray-700 rounded-full px-4" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !skills || skills.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-2 text-white">{t('skills.title')}</h3>
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <ChevronRight className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-400 text-center">{t('skills.no_areas')}</p>
          <p className="text-sm text-gray-500 mt-1">{t('skills.contact_admin')}</p>
        </div>
      </div>
    );
  }

  // Split skills into three rows for better distribution
  const thirdPoint = Math.ceil(skills.length / 3);
  const twoThirdPoint = Math.ceil((skills.length * 2) / 3);
  const row1Skills = skills.slice(0, thirdPoint);
  const row2Skills = skills.slice(thirdPoint, twoThirdPoint);
  const row3Skills = skills.slice(twoThirdPoint);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-white">{t('skills.title')}</h3>
      <div className="space-y-2">
        {/* Row 1 */}
        <ScrollArea className="w-full [&>div>div]:!overflow-visible">
          <div className="flex gap-2 py-1 snap-x snap-mandatory overflow-x-auto scrollbar-hide">
            {row1Skills.map((skill) => (
              <Badge
                key={skill.id}
                variant={skillsSelected.includes(skill.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer snap-center transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "px-3 py-2 text-xs font-medium whitespace-nowrap rounded-full min-w-fit",
                  skillsSelected.includes(skill.id) 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-gray-700 border-gray-600 text-gray-300 bg-gray-800/50"
                )}
                onClick={() => handleSkillToggle(skill.id)}
                onKeyDown={(e) => handleKeyDown(e, skill.id)}
                tabIndex={0}
                role="button"
                aria-pressed={skillsSelected.includes(skill.id)}
                data-testid={`skill-chip-${skill.id}`}
              >
                {translateSkillName(skill.name)}
              </Badge>
            ))}
          </div>
        </ScrollArea>

        {/* Row 2 */}
        <ScrollArea className="w-full [&>div>div]:!overflow-visible">
          <div className="flex gap-2 py-1 snap-x snap-mandatory overflow-x-auto scrollbar-hide">
            {row2Skills.map((skill) => (
              <Badge
                key={skill.id}
                variant={skillsSelected.includes(skill.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer snap-center transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "px-3 py-2 text-xs font-medium whitespace-nowrap rounded-full min-w-fit",
                  skillsSelected.includes(skill.id) 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-gray-700 border-gray-600 text-gray-300 bg-gray-800/50"
                )}
                onClick={() => handleSkillToggle(skill.id)}
                onKeyDown={(e) => handleKeyDown(e, skill.id)}
                tabIndex={0}
                role="button"
                aria-pressed={skillsSelected.includes(skill.id)}
                data-testid={`skill-chip-${skill.id}`}
              >
                {translateSkillName(skill.name)}
              </Badge>
            ))}
          </div>
        </ScrollArea>

        {/* Row 3 */}
        <ScrollArea className="w-full [&>div>div]:!overflow-visible">
          <div className="flex gap-2 py-1 snap-x snap-mandatory overflow-x-auto scrollbar-hide">
            {row3Skills.map((skill) => (
              <Badge
                key={skill.id}
                variant={skillsSelected.includes(skill.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer snap-center transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "px-3 py-2 text-xs font-medium whitespace-nowrap rounded-full min-w-fit",
                  skillsSelected.includes(skill.id) 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-gray-700 border-gray-600 text-gray-300 bg-gray-800/50"
                )}
                onClick={() => handleSkillToggle(skill.id)}
                onKeyDown={(e) => handleKeyDown(e, skill.id)}
                tabIndex={0}
                role="button"
                aria-pressed={skillsSelected.includes(skill.id)}
                data-testid={`skill-chip-${skill.id}`}
              >
                {translateSkillName(skill.name)}
              </Badge>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
