
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { usePersonaStore } from '@/stores/personaStore';
import { cn } from '@/lib/utils';

interface Persona {
  id: string;
  name: string;
  image_url: string;
  alt_text: string;
  mood: string;
  position: number;
  is_visible: boolean;
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
  const { data: personas, isLoading, error } = usePersonas();
  const { selectedPersona, setSelectedPersona } = usePersonaStore();

  const handlePersonaSelect = (personaId: string) => {
    setSelectedPersona(personaId);
    onSelect?.(personaId);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-3 border">
        <h3 className="text-lg font-semibold mb-3">Select an officer</h3>
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center animate-pulse">
              <div className="w-44 h-44 bg-muted rounded-full mb-2" />
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
        <h3 className="text-lg font-semibold mb-3">Select an officer</h3>
        <p className="text-muted-foreground">No officers available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-3 border">
      <h3 className="text-lg font-semibold mb-3">Select an officer</h3>
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 snap-x snap-mandatory overflow-x-auto">
          {personas.map((persona) => (
            <div
              key={persona.id}
              className="flex flex-col items-center min-w-[180px] cursor-pointer snap-center"
              onClick={() => handlePersonaSelect(persona.id)}
              data-testid={`persona-${persona.id}`}
            >
              <div
                className={cn(
                  "relative mb-2 rounded-full overflow-hidden transition-all duration-200 shadow-lg",
                  selectedPersona === persona.id
                    ? "ring-3 ring-primary ring-offset-2 scale-105"
                    : "hover:scale-105 hover:shadow-xl"
                )}
              >
                <img
                  src={persona.image_url}
                  alt={persona.alt_text}
                  className="w-44 h-44 object-cover rounded-full"
                  loading="lazy"
                />
                {selectedPersona === persona.id && (
                  <div className="absolute inset-0 bg-primary/10 rounded-full flex items-center justify-center">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                )}
                
                {/* Overlay pill with name and mood */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-muted/90 backdrop-blur-sm rounded-full px-3 py-1 border border-border/50">
                  <div className="text-center">
                    <p className="font-medium text-xs leading-tight">{persona.name}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{persona.mood}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
