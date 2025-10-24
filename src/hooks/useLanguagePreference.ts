
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORTED_LANGUAGES, type Language } from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useGuestSession } from '@/hooks/useGuestSession';

export const useLanguagePreference = () => {
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const { isGuest } = useAuth();
  const guestSession = useGuestSession();

  const { data: languageCode, isLoading } = useQuery({
    queryKey: ['user-language'],
    queryFn: async () => {
      // For guest users, get language from localStorage
      if (isGuest && guestSession.guestData?.languagePreference) {
        return guestSession.guestData.languagePreference;
      }
      
      // For authenticated users, get from database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'en';

      const { data: profile } = await supabase
        .from('profiles')
        .select('language_preference')
        .eq('user_id', user.id)
        .single();

      return profile?.language_preference || 'en';
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce unnecessary queries
    refetchOnWindowFocus: false, // Don't refetch on tab switch
  });

  const updateLanguage = useMutation({
    mutationFn: async (newLanguageCode: string) => {
      // For guest users, store in localStorage
      if (isGuest) {
        guestSession.setLanguagePreference(newLanguageCode);
        return newLanguageCode;
      }
      
      // For authenticated users, update database
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
      
      // Update i18n language (works for both guest and authenticated)
      console.log('Changing i18n language to:', newLanguageCode, 'from:', i18n.language);
      i18n.changeLanguage(newLanguageCode);
      console.log('i18n language after change:', i18n.language);
    },
  });

  const language = SUPPORTED_LANGUAGES.find(l => l.code === languageCode) || SUPPORTED_LANGUAGES[0];

  const getVoiceForTTS = (ttsProvider: 'polly' | 'google' | 'openai' | 'elevenlabs' = 'elevenlabs') => {
    switch (ttsProvider) {
      case 'elevenlabs':
        // Comprehensive language-to-voice mapping for ElevenLabs
        // Using multilingual voices (Sarah, Lily, Jessica) that adapt to language
        if (languageCode === 'es') return 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Spanish
        if (languageCode === 'fr') return 'pFZP5JQG7iQjIQuC4Bku'; // Lily - French
        if (languageCode === 'pt') return 'cgSgspJ2msm6clMCkdW9'; // Jessica - Portuguese
        if (languageCode === 'ar') return 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Arabic
        if (languageCode === 'zh') return 'cgSgspJ2msm6clMCkdW9'; // Jessica - Chinese
        if (languageCode === 'hi') return 'pFZP5JQG7iQjIQuC4Bku'; // Lily - Hindi
        if (languageCode === 'ru') return 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Russian
        if (languageCode === 'am') return 'pFZP5JQG7iQjIQuC4Bku'; // Lily - Amharic
        if (languageCode === 'bn') return 'cgSgspJ2msm6clMCkdW9'; // Jessica - Bengali
        if (languageCode === 'fa') return 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Farsi
        if (languageCode === 'ht') return 'pFZP5JQG7iQjIQuC4Bku'; // Lily - Haitian Creole
        if (languageCode === 'so') return 'cgSgspJ2msm6clMCkdW9'; // Jessica - Somali
        if (languageCode === 'sw') return 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Swahili
        if (languageCode === 'ti') return 'pFZP5JQG7iQjIQuC4Bku'; // Lily - Tigrinya
        if (languageCode === 'uk') return 'cgSgspJ2msm6clMCkdW9'; // Jessica - Ukrainian
        if (languageCode === 'ur') return 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Urdu
        return '9BWtsMINqrJLrRacOk9x'; // Aria - English default
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
