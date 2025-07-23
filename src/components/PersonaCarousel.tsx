
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { usePersonaStore } from '@/stores/personaStore';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface Persona {
  id: string;
  name: string;
  image_url: string;
  alt_text: string;
  mood: string;
  position: number;
  is_visible: boolean;
  tts_voice: string;
}

interface PersonaCarouselProps {
  onSelect?: (personaId: string) => void;
}

const usePersonas = () => {
  return useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('is_visible', true)
        .order('position', { ascending: true })
        .order('id', { ascending: true });
      
      if (error) throw error;
      return data as Persona[];
    },
  });
};

export const PersonaCarousel = ({ onSelect }: PersonaCarouselProps) => {
  const { t } = useTranslation();
  const { data: personas, isLoading, error } = usePersonas();
  const { selectedPersona, setSelectedPersona } = usePersonaStore();

  // Function to translate mood names
  const translateMood = (mood: string) => {
    if (!mood) return '';
    const key = `personas.moods.${mood.toLowerCase().replace(/ /g, '_').replace(/[^a-z_]/g, '')}`;
    const translated = t(key);
    return translated !== key ? translated : mood;
  };

  // Get background color for persona - same color for all
  const getPersonaBackground = () => {
    return 'bg-gradient-to-br from-blue-400 to-blue-600';
  };

  const handlePersonaSelect = (personaId: string) => {
    setSelectedPersona(personaId);
    onSelect?.(personaId);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-3 border">
        <h3 className="text-lg font-semibold mb-2">{t('personas.title')}</h3>
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center animate-pulse">
              <div className="w-36 h-36 bg-muted rounded-full mb-2" />
              <div className="w-16 h-3 bg-muted rounded mb-1" />
              <div className="w-12 h-3 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !personas || personas.length === 0) {
    return (
      <div className="bg-card rounded-lg p-3 border">
        <h3 className="text-lg font-semibold mb-2">{t('personas.title')}</h3>
        <p className="text-muted-foreground">{t('personas.no_officers')}</p>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg p-4">
      <h3 className="text-xl font-bold text-foreground mb-4">{t('personas.title')}</h3>
      <ScrollArea className="w-full">
        <div className="flex gap-6 pb-4 snap-x snap-mandatory overflow-x-auto">
          {personas.map((persona) => (
            <div
              key={persona.id}
              className="flex flex-col items-center min-w-[160px] cursor-pointer snap-center"
              onClick={() => handlePersonaSelect(persona.id)}
              data-testid={`persona-${persona.id}`}
            >
              {/* Officer's photo with colored background */}
              <div className="relative mb-3">
                <div
                  className={cn(
                    "w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center overflow-hidden",
                    "transition-all duration-200",
                    selectedPersona === persona.id && "ring-4 ring-green-500 ring-offset-2"
                  )}
                >
                  <img
                    src={persona.image_url}
                    alt={persona.alt_text}
                    className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-full"
                    loading="lazy"
                  />
                </div>
              </div>
              
              {/* Officer's info */}
              <div className="text-center">
                <h4 className="font-bold text-foreground text-base mb-1">{persona.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {translateMood(persona.mood)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
