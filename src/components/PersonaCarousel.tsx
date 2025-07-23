
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
    const key = `personas.moods.${mood.toLowerCase().replace(/ /g, '_')}`;
    const translated = t(key);
    return translated !== key ? translated : mood;
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
    <div className="bg-card rounded-lg p-3 border">
      <h3 className="text-lg font-semibold mb-3">{t('personas.title')}</h3>
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 snap-x snap-mandatory overflow-x-auto">
          {personas.map((persona) => (
            <div
              key={persona.id}
              className="flex flex-col items-center min-w-[160px] cursor-pointer snap-center px-2"
              onClick={() => handlePersonaSelect(persona.id)}
              data-testid={`persona-${persona.id}`}
            >
              {/* Officer's name above photo */}
              <div className="mb-2 text-center">
                <p className="font-semibold text-sm">{persona.name}</p>
              </div>
              
              {/* Officer's photo - compact for mobile */}
              <div
                className={cn(
                  "relative mb-3 rounded-full overflow-hidden transition-all duration-200 shadow-lg",
                  selectedPersona === persona.id
                    ? "ring-3 ring-primary ring-offset-2 scale-105 shadow-xl"
                    : "hover:scale-105 hover:shadow-xl"
                )}
              >
                <img
                  src={persona.image_url}
                  alt={persona.alt_text}
                  className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-full"
                  loading="lazy"
                />
              </div>
              
              {/* Personality and language below photo */}
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground leading-tight">
                  {translateMood(persona.mood)}
                </p>
                <p className="text-xs text-muted-foreground leading-tight">
                  {persona.tts_voice ? t('personas.languages.english') : t('personas.languages.english')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
