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

interface SkillsState {
  skillsSelected: string[];
  toggleSkill: (skillId: string) => void;
  clearSkills: () => void;
}

export const useSkillsStore = create<SkillsState>()(
  persist(
    (set, get) => ({
      skillsSelected: [],
      toggleSkill: (skillId) => {
        const current = get().skillsSelected;
        const isSelected = current.includes(skillId);
        set({
          skillsSelected: isSelected
            ? current.filter((id) => id !== skillId)
            : [...current, skillId]
        });
      },
      clearSkills: () => set({ skillsSelected: [] }),
    }),
    {
      name: 'skills-store',
    }
  )
);