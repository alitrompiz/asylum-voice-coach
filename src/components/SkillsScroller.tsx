import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEntitlementStatus } from '@/hooks/useEntitlementStatus';
import { useSkillsStore } from '@/stores/personaStore';
import { useToast } from '@/hooks/use-toast';
import { isDev } from '@/lib/env';
interface Skill {
  id: string;
  name: string;
  group_name: string;
  is_active: boolean;
  sort_order: number;
  tier_access: string[] | null;
}
const useSkills = () => {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('skills').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data as Skill[];
    }
  });
};
export const SkillsScroller = () => {
  const {
    t
  } = useTranslation();
  const {
    toast
  } = useToast();
  const {
    data: skills,
    isLoading,
    error
  } = useSkills();
  const {
    skillsSelected,
    toggleSkill
  } = useSkillsStore();
  const {
    entitlementStatus,
    isLoading: entitlementLoading
  } = useEntitlementStatus();

  // Function to translate skill names
  const translateSkillName = (skillName: string) => {
    // Create a key from the skill name for translation lookup
    const key = `skills.names.${skillName.toLowerCase().replace(/ /g, '_').replace(/[^a-z_]/g, '')}`;
    const translated = t(key);
    // If translation exists (key is different from translated), use it, otherwise fallback to original
    return translated !== key ? translated : skillName;
  };

  // Helper function to check if skill is accessible
  const isSkillAccessible = (skill: Skill) => {
    if (!skill.tier_access || skill.tier_access.length === 0) return true;
    if (entitlementStatus === 'full_prep') return true;
    return skill.tier_access.includes('free');
  };
  const handleSkillToggle = (skillId: string) => {
    const skill = skills?.find(s => s.id === skillId);
    if (!skill) return;
    if (!isSkillAccessible(skill)) {
      toast({
        title: t('skills.unlock_with_full_prep', 'Unlock this with Full Prep'),
        variant: 'default'
      });
      return;
    }
    toggleSkill(skillId);
  };
  const handleKeyDown = (event: React.KeyboardEvent, skillId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSkillToggle(skillId);
    }
  };
  if (isLoading || entitlementLoading) {
    return <div>
        <h3 className="text-lg font-semibold mb-2 text-white">{t('skills.title')}</h3>
        <div className="space-y-2">
          {[1, 2, 3].map(row => <div key={row} className="flex gap-2 animate-pulse">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-gray-700 rounded-full px-4" />)}
            </div>)}
        </div>
      </div>;
  }
  if (error || !skills || skills.length === 0) {
    return <div>
        <h3 className="text-lg font-semibold mb-2 text-white">{t('skills.title')}</h3>
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <ChevronRight className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-400 text-center">{t('skills.no_areas')}</p>
          <p className="text-sm text-gray-500 mt-1">{t('skills.contact_admin')}</p>
        </div>
      </div>;
  }

  // Debug logging for gating
  if (isDev && skills) {
    const enabledCount = skills.filter(s => isSkillAccessible(s)).length;
    const disabledCount = skills.length - enabledCount;
    console.log('[GATING DEBUG] Skills:', {
      entitlementStatus,
      total: skills.length,
      enabled: enabledCount,
      disabled: disabledCount,
      enabledNames: skills.filter(s => isSkillAccessible(s)).map(s => s.name),
      disabledNames: skills.filter(s => !isSkillAccessible(s)).map(s => s.name)
    });
  }

  // Split skills into three rows for better distribution
  const thirdPoint = Math.ceil(skills.length / 3);
  const twoThirdPoint = Math.ceil(skills.length * 2 / 3);
  const row1Skills = skills.slice(0, thirdPoint);
  const row2Skills = skills.slice(thirdPoint, twoThirdPoint);
  const row3Skills = skills.slice(twoThirdPoint);
  return <div>
      <div className="mb-2">
        <div className="flex items-baseline flex-wrap gap-3">
          <h3 className="text-lg font-semibold text-white">{t('skills.title')}</h3>
          {entitlementStatus === 'free_trial'}
        </div>
      </div>
      <div className="space-y-2">
        {/* Row 1 */}
        <ScrollArea className="w-full [&>div>div]:!overflow-visible">
          <div className="flex gap-2 py-1 snap-x snap-mandatory overflow-x-auto scrollbar-hide">
            {row1Skills.map(skill => {
            const isAccessible = isSkillAccessible(skill);
            const isLocked = !isAccessible;
            return <Badge key={skill.id} variant={skillsSelected.includes(skill.id) ? "default" : "outline"} className={cn("snap-center transition-all duration-200 focus:ring-2 focus:ring-primary focus:ring-offset-2", "px-3 py-2 text-xs font-medium whitespace-nowrap rounded-full min-w-fit flex items-center gap-1", isAccessible ? "cursor-pointer hover:scale-105" : "cursor-not-allowed opacity-60", skillsSelected.includes(skill.id) ? "bg-primary text-primary-foreground" : isAccessible ? "hover:bg-gray-700 border-gray-600 text-gray-300 bg-gray-800/50" : "border-gray-700 text-gray-500 bg-gray-900/50")} onClick={() => handleSkillToggle(skill.id)} onKeyDown={e => handleKeyDown(e, skill.id)} tabIndex={0} role="button" aria-pressed={skillsSelected.includes(skill.id)} data-testid={`skill-chip-${skill.id}`}>
                  {isLocked && <Lock className="w-3 h-3" />}
                  {translateSkillName(skill.name)}
                </Badge>;
          })}
          </div>
        </ScrollArea>

        {/* Row 2 */}
        <ScrollArea className="w-full [&>div>div]:!overflow-visible">
          <div className="flex gap-2 py-1 snap-x snap-mandatory overflow-x-auto scrollbar-hide">
            {row2Skills.map(skill => {
            const isAccessible = isSkillAccessible(skill);
            const isLocked = !isAccessible;
            return <Badge key={skill.id} variant={skillsSelected.includes(skill.id) ? "default" : "outline"} className={cn("snap-center transition-all duration-200 focus:ring-2 focus:ring-primary focus:ring-offset-2", "px-3 py-2 text-xs font-medium whitespace-nowrap rounded-full min-w-fit flex items-center gap-1", isAccessible ? "cursor-pointer hover:scale-105" : "cursor-not-allowed opacity-60", skillsSelected.includes(skill.id) ? "bg-primary text-primary-foreground" : isAccessible ? "hover:bg-gray-700 border-gray-600 text-gray-300 bg-gray-800/50" : "border-gray-700 text-gray-500 bg-gray-900/50")} onClick={() => handleSkillToggle(skill.id)} onKeyDown={e => handleKeyDown(e, skill.id)} tabIndex={0} role="button" aria-pressed={skillsSelected.includes(skill.id)} data-testid={`skill-chip-${skill.id}`}>
                  {isLocked && <Lock className="w-3 h-3" />}
                  {translateSkillName(skill.name)}
                </Badge>;
          })}
          </div>
        </ScrollArea>

        {/* Row 3 */}
        <ScrollArea className="w-full [&>div>div]:!overflow-visible">
          <div className="flex gap-2 py-1 snap-x snap-mandatory overflow-x-auto scrollbar-hide">
            {row3Skills.map(skill => {
            const isAccessible = isSkillAccessible(skill);
            const isLocked = !isAccessible;
            return <Badge key={skill.id} variant={skillsSelected.includes(skill.id) ? "default" : "outline"} className={cn("snap-center transition-all duration-200 focus:ring-2 focus:ring-primary focus:ring-offset-2", "px-3 py-2 text-xs font-medium whitespace-nowrap rounded-full min-w-fit flex items-center gap-1", isAccessible ? "cursor-pointer hover:scale-105" : "cursor-not-allowed opacity-60", skillsSelected.includes(skill.id) ? "bg-primary text-primary-foreground" : isAccessible ? "hover:bg-gray-700 border-gray-600 text-gray-300 bg-gray-800/50" : "border-gray-700 text-gray-500 bg-gray-900/50")} onClick={() => handleSkillToggle(skill.id)} onKeyDown={e => handleKeyDown(e, skill.id)} tabIndex={0} role="button" aria-pressed={skillsSelected.includes(skill.id)} data-testid={`skill-chip-${skill.id}`}>
                  {isLocked && <Lock className="w-3 h-3" />}
                  {translateSkillName(skill.name)}
                </Badge>;
          })}
          </div>
        </ScrollArea>
      </div>
    </div>;
};