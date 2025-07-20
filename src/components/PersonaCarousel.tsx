
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

  const handlePersonaSelect = (personaId: string) => {
    setSelectedPersona(personaId);
    onSelect?.(personaId);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-3 border">
        <h3 className="text-lg font-semibold mb-3">{t('personas.title')}</h3>
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
        <h3 className="text-lg font-semibold mb-3">{t('personas.title')}</h3>
        <p className="text-muted-foreground">{t('personas.no_officers')}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-3 border">
      <h3 className="text-lg font-semibold mb-3">{t('personas.title')}</h3>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 snap-x snap-mandatory overflow-x-auto">
          {personas.map((persona) => (
            <div
              key={persona.id}
              className="flex flex-col items-center min-w-[150px] cursor-pointer snap-center relative pt-4 px-2 pb-2"
              onClick={() => handlePersonaSelect(persona.id)}
              data-testid={`persona-${persona.id}`}
            >
              <div
                className={cn(
                  "relative mb-2 rounded-full overflow-hidden transition-all duration-200 shadow-lg",
                  selectedPersona === persona.id
                    ? "ring-4 ring-primary ring-offset-4 scale-105 shadow-xl"
                    : "hover:scale-105 hover:shadow-xl"
                )}
              >
                <img
                  src={persona.image_url}
                  alt={persona.alt_text}
                  className="w-36 h-36 object-cover rounded-full"
                  loading="lazy"
                />
              </div>
              
              {/* Overlay pill with name and mood - positioned outside image container */}
              <div className="absolute bottom-0 left-0 right-0 h-11 bg-muted/90 backdrop-blur-sm rounded-full border border-border/50 flex flex-col items-center justify-center z-10">
                <p className="font-medium text-xs leading-tight">{persona.name}</p>
                <p className="text-xs text-muted-foreground leading-tight">{persona.mood}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
