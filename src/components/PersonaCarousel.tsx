import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lock, Shield, UserCheck, Check } from 'lucide-react';
import { useEntitlementStatus } from '@/hooks/useEntitlementStatus';
import { usePersonaStore } from '@/stores/personaStore';
import { cn } from '@/lib/utils';
import { isDev } from '@/lib/env';
import { useToast } from '@/hooks/use-toast';
interface Persona {
  id: string;
  name: string;
  image_url: string;
  alt_text: string;
  mood: string;
  position: number;
  is_visible: boolean;
  tts_voice: string;
  tier_access: string[] | null;
}
interface PersonaCarouselProps {
  onSelect?: (personaId: string) => void;
  onError?: (error: Error) => void;
}
const usePersonas = () => {
  return useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('personas').select('*').eq('is_visible', true).order('position', {
        ascending: true
      }).order('id', {
        ascending: true
      });
      if (error) throw error;
      return data as Persona[];
    }
  });
};
export const PersonaCarousel = ({
  onSelect,
  onError
}: PersonaCarouselProps) => {
  const {
    t
  } = useTranslation();
  const {
    toast
  } = useToast();
  const {
    data: personas,
    isLoading,
    error
  } = usePersonas();
  const {
    selectedPersona,
    setSelectedPersona
  } = usePersonaStore();
  const {
    entitlementStatus,
    isLoading: entitlementLoading
  } = useEntitlementStatus();

  // Function to translate mood names
  const translateMood = (mood: string) => {
    if (!mood) return '';
    const key = `personas.moods.${mood.toLowerCase().replace(/ /g, '_').replace(/[^a-z_]/g, '')}`;
    const translated = t(key);
    return translated !== key ? translated : mood;
  };
  // Helper function to check if persona is accessible
  const isPersonaAccessible = (persona: Persona) => {
    if (!persona.tier_access || persona.tier_access.length === 0) return true;
    if (entitlementStatus === 'full_prep') return true;
    return persona.tier_access.includes('free');
  };
  const handlePersonaSelect = (personaId: string) => {
    const persona = personas?.find(p => p.id === personaId);
    if (!persona) return;
    if (!isPersonaAccessible(persona)) {
      toast({
        title: t('personas.unlock_with_full_prep', 'Unlock this with Full Prep'),
        variant: 'default'
      });
      return;
    }
    setSelectedPersona(personaId);
    onSelect?.(personaId);
  };
  if (isLoading || entitlementLoading) {
    return <div>
        <h3 className="text-lg font-semibold mb-2 text-white">{t('personas.title')}</h3>
        <div className="flex gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="flex flex-col items-center animate-pulse">
              <div className="w-36 h-36 bg-gray-700 rounded-full mb-2" />
              <div className="w-16 h-3 bg-gray-700 rounded mb-1" />
              <div className="w-12 h-3 bg-gray-700 rounded" />
            </div>)}
        </div>
      </div>;
  }

  // Debug logging for gating
  if (isDev && personas) {
    const enabledCount = personas.filter(p => isPersonaAccessible(p)).length;
    const disabledCount = personas.length - enabledCount;
    console.log('[GATING DEBUG] Personas:', {
      entitlementStatus,
      total: personas.length,
      enabled: enabledCount,
      disabled: disabledCount,
      enabledNames: personas.filter(p => isPersonaAccessible(p)).map(p => p.name),
      disabledNames: personas.filter(p => !isPersonaAccessible(p)).map(p => p.name)
    });
  }
  if (error) {
    // Notify parent component of error
    if (onError && error instanceof Error) {
      onError(error);
    }
    return <div>
        <h3 className="text-lg font-semibold mb-2 text-white">{t('personas.title')}</h3>
        <p className="text-gray-400">{error instanceof Error ? error.message : t('personas.no_officers')}</p>
      </div>;
  }
  if (!personas || personas.length === 0) {
    return <div>
        <h3 className="text-lg font-semibold mb-2 text-white">{t('personas.title')}</h3>
        <p className="text-gray-400">{t('personas.no_officers')}</p>
      </div>;
  }
  return <div>
      <div className="mb-3">
        <div className="flex items-baseline flex-wrap gap-3">
          <h3 className="text-xl font-bold text-white">{t('personas.title')}</h3>
          {entitlementStatus === 'free_trial'}
        </div>
      </div>
      <ScrollArea className="w-full p-1">
        <div className="flex gap-6 pt-2 pb-0 snap-x snap-mandatory overflow-x-auto py-[4px] my-0">
          {personas.map(persona => {
          const isAccessible = isPersonaAccessible(persona);
          const isLocked = !isAccessible;
          return <div key={persona.id} className={cn("flex flex-col items-center min-w-[160px] snap-center pb-0 transition-all duration-200", isAccessible ? "cursor-pointer" : "cursor-not-allowed opacity-60")} onClick={() => handlePersonaSelect(persona.id)} data-testid={`persona-${persona.id}`}>
                {/* Officer's photo */}
                <div className="relative mb-2">
                  <div className={cn("w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center overflow-hidden", "transition-all duration-200", selectedPersona === persona.id && "ring-4 ring-green-500 scale-105 border-4 border-white shadow-lg", isLocked && "grayscale")}>
                    <img src={persona.image_url} alt={persona.alt_text} className="w-32 h-32 sm:w-36 sm:h-36 object-cover rounded-full" loading="lazy" />
                    {selectedPersona === persona.id && (
                      <div className="absolute top-0 right-0 bg-green-500 rounded-full p-1">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {isLocked && <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center">
                        <Lock className="w-6 h-6 text-white mb-1" />
                        <span className="text-xs text-white font-medium">Locked</span>
                      </div>}
                  </div>
                </div>
                
                {/* Officer's info */}
                <div className="text-center">
                  <h4 className={cn("font-bold text-base mb-1", isAccessible ? "text-white" : "text-gray-400 line-through")}>
                    {persona.name}
                  </h4>
                  <p className={cn("text-sm", isAccessible ? "text-gray-300" : "text-gray-500")}>
                    {translateMood(persona.mood)}
                  </p>
                </div>
              </div>;
        })}
        </div>
      </ScrollArea>
    </div>;
};