
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORTED_LANGUAGES, type Language } from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';

export const useLanguagePreference = () => {
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();

  const { data: languageCode, isLoading } = useQuery({
    queryKey: ['user-language'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'en';

      const { data: profile } = await supabase
        .from('profiles')
        .select('language_preference')
        .eq('user_id', user.id)
        .single();

      return profile?.language_preference || 'en';
    },
  });

  const updateLanguage = useMutation({
    mutationFn: async (newLanguageCode: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ language_preference: newLanguageCode })
        .eq('user_id', user.id);

      if (error) throw error;
      return newLanguageCode;
    },
    onSuccess: (newLanguageCode) => {
      // Update the cache immediately to show the new language
      queryClient.setQueryData(['user-language'], newLanguageCode);
      queryClient.invalidateQueries({ queryKey: ['user-language'] });
      
      // Update i18n language
      console.log('Changing i18n language to:', newLanguageCode, 'from:', i18n.language);
      i18n.changeLanguage(newLanguageCode);
      console.log('i18n language after change:', i18n.language);
    },
  });

  const language = SUPPORTED_LANGUAGES.find(l => l.code === languageCode) || SUPPORTED_LANGUAGES[0];

  const getVoiceForTTS = (ttsProvider: 'polly' | 'google' | 'openai' | 'elevenlabs' = 'elevenlabs') => {
    switch (ttsProvider) {
      case 'elevenlabs':
        // Use ElevenLabs voices - default to Aria for most languages
        if (languageCode === 'es') return 'EXAVITQu4vr4xnSDxMaL'; // Sarah - good for Spanish
        if (languageCode === 'fr') return 'pFZP5JQG7iQjIQuC4Bku'; // Lily - good for French
        if (languageCode === 'pt') return 'cgSgspJ2msm6clMCkdW9'; // Jessica - good for Portuguese
        return '9BWtsMINqrJLrRacOk9x'; // Aria - default for English and others
      case 'polly':
        return language.pollyVoice || language.googleVoice || language.openaiVoice || 'alloy';
      case 'google':
        return language.googleVoice || language.pollyVoice || language.openaiVoice || 'alloy';
      case 'openai':
        return language.openaiVoice || 'alloy';
      default:
        return '9BWtsMINqrJLrRacOk9x'; // Default to ElevenLabs Aria
    }
  };

  return {
    languageCode: languageCode || 'en',
    language,
    isLoading,
    updateLanguage: updateLanguage.mutateAsync,
    isUpdating: updateLanguage.isPending,
    getVoiceForTTS,
  };
};
