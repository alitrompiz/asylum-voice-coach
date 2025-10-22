import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface PersonaState {
  selectedPersona: string | null;
  setSelectedPersona: (personaId: string | null) => void;
}

function safeGetStorage(): Storage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const test = '__zstd_test__';
      window.localStorage.setItem(test, '1');
      window.localStorage.removeItem(test);
      return window.localStorage;
    }
  } catch (_) {}
  const memory: Record<string, string> = {};
  return {
    getItem: (name: string) => memory[name] ?? null,
    setItem: (name: string, value: string) => { memory[name] = value; },
    removeItem: (name: string) => { delete memory[name]; },
    clear: () => { Object.keys(memory).forEach(k => delete memory[k]); },
    key: (index: number) => Object.keys(memory)[index] ?? null,
    get length() { return Object.keys(memory).length; }
  } as Storage;
}

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set) => ({
      selectedPersona: null,
      setSelectedPersona: (personaId) => set({ selectedPersona: personaId }),
    }),
    {
      name: 'persona-store',
      storage: createJSONStorage(() => safeGetStorage()),
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
      storage: createJSONStorage(() => safeGetStorage()),
    }
  )
);