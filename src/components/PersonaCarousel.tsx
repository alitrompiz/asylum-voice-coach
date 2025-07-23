
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

  // Get background color for persona
  const getPersonaBackground = (index: number) => {
    const colors = [
      'bg-gradient-to-br from-orange-400 to-yellow-500', // Orange/yellow like Mark Cuban
      'bg-gradient-to-br from-blue-400 to-blue-600',     // Blue like Dr. Matt Walker
      'bg-gradient-to-br from-purple-400 to-purple-600', // Purple
      'bg-gradient-to-br from-green-400 to-green-600',   // Green
      'bg-gradient-to-br from-red-400 to-red-600',       // Red
      'bg-gradient-to-br from-pink-400 to-pink-600',     // Pink
    ];
    return colors[index % colors.length];
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {personas.map((persona, index) => (
          <div
            key={persona.id}
            className="flex flex-col items-center"
            data-testid={`persona-${persona.id}`}
          >
            {/* Officer's photo with colored background */}
            <div className="relative mb-4">
              <div
                className={cn(
                  "w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center overflow-hidden",
                  getPersonaBackground(index),
                  "transition-all duration-200"
                )}
              >
                <img
                  src={persona.image_url}
                  alt={persona.alt_text}
                  className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-full"
                  loading="lazy"
                />
              </div>
              
              {/* Selection indicator */}
              {selectedPersona === persona.id && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mb-3 w-full max-w-[280px]">
              <button
                onClick={() => handlePersonaSelect(persona.id)}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-full font-medium text-sm transition-all duration-200",
                  "flex items-center justify-center gap-2",
                  selectedPersona === persona.id
                    ? "bg-green-500 text-white"
                    : "bg-green-500 text-white hover:bg-green-600"
                )}
              >
                <div className="w-4 h-4">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79a15.91 15.91 0 006.59 6.59l2.2-2.2a1 1 0 01.68-.27 1 1 0 01.32.05 11.43 11.43 0 003.58.58 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.43 11.43 0 00.58 3.58 1 1 0 01-.22 1z"/>
                  </svg>
                </div>
                Call
              </button>
              <button className="w-12 h-10 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors">
                <div className="w-5 h-5 text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 12a4 4 0 118 0 4 4 0 01-8 0zm8-10v2h4a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h4V2a2 2 0 012-2h4a2 2 0 012 2z"/>
                  </svg>
                </div>
              </button>
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
    </div>
  );
};
