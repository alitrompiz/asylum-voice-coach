
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguagePreference } from './useLanguagePreference';

interface TTSOptions {
  voice?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export const useTextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { language, getVoiceForTTS } = useLanguagePreference();

  const speak = useCallback(async (text: string, options: TTSOptions = {}) => {
    if (!text.trim()) return;

    try {
      setIsLoading(true);
      options.onStart?.();

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Get the appropriate voice for the selected language
      const voice = options.voice || getVoiceForTTS('openai');

      // Call the TTS edge function with language-specific voice
      console.log('Calling text-to-speech edge function with:', { 
        textLength: text.length, 
        voice, 
        language: language.code,
        primaryTTS: language.primaryTTS 
      });

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text,
          voice,
          language: language.code,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('TTS response received:', { 
        success: !!data?.audioContent,
        contentLength: data?.audioContent?.length || 0
      });

      if (data?.audioContent) {
        // Create audio element and play
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
        audioRef.current = audio;

        audio.onloadeddata = () => {
          setIsLoading(false);
          setIsPlaying(true);
        };

        audio.onended = () => {
          setIsPlaying(false);
          options.onEnd?.();
        };

        audio.onerror = () => {
          setIsPlaying(false);
          setIsLoading(false);
          options.onError?.(new Error('Audio playback failed'));
        };

        await audio.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsLoading(false);
      setIsPlaying(false);
      options.onError?.(error as Error);
    }
  }, [language, getVoiceForTTS]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  return {
    speak,
    stop,
    isPlaying,
    isLoading,
    currentLanguage: language,
  };
};
