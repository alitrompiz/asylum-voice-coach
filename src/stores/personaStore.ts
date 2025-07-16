import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PersonaState {
  selectedPersona: string | null;
  setSelectedPersona: (personaId: string | null) => void;
}

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set) => ({
      selectedPersona: null,
      setSelectedPersona: (personaId) => set({ selectedPersona: personaId }),
    }),
    {
      name: 'persona-store',
    }
  )
);