
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
  const currentRequestRef = useRef<string | null>(null);
  const { language, getVoiceForTTS, languageCode } = useLanguagePreference();

  const speak = useCallback(async (text: string, options: TTSOptions = {}) => {
    if (!text.trim()) return;

    // Create a unique request ID to prevent duplicate calls
    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    currentRequestRef.current = requestId;
    
    console.log('TTS speak() called:', { 
      requestId,
      textLength: text.length, 
      languageCode,
      isPlaying,
      isLoading,
      textPreview: text.substring(0, 50) + '...'
    });

    // If already playing or loading, stop first
    if (isPlaying || isLoading) {
      console.log('Stopping existing TTS for new request');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      setIsLoading(false);
    }

    try {
      setIsLoading(true);
      options.onStart?.();

      // Get the appropriate voice for the selected language
      const voice = options.voice || getVoiceForTTS('openai');

      console.log('Calling text-to-speech edge function with:', { 
        requestId,
        textLength: text.length, 
        voice, 
        language: languageCode,
        primaryTTS: language.primaryTTS 
      });

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text,
          voice,
          language: languageCode,
        },
      });

      // Check if this request is still the current one
      if (currentRequestRef.current !== requestId) {
        console.log('TTS request cancelled - newer request in progress');
        return;
      }

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('TTS response received:', { 
        requestId,
        success: !!data?.audioContent,
        contentLength: data?.audioContent?.length || 0
      });

      if (data?.audioContent) {
        // Check again if this request is still current
        if (currentRequestRef.current !== requestId) {
          console.log('TTS request cancelled before playback');
          return;
        }

        // Create audio element and play
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
        audioRef.current = audio;

        audio.onloadeddata = () => {
          if (currentRequestRef.current === requestId) {
            setIsLoading(false);
            setIsPlaying(true);
          }
        };

        audio.onended = () => {
          if (currentRequestRef.current === requestId) {
            setIsPlaying(false);
            options.onEnd?.();
          }
        };

        audio.onerror = () => {
          if (currentRequestRef.current === requestId) {
            setIsPlaying(false);
            setIsLoading(false);
            options.onError?.(new Error('Audio playback failed'));
          }
        };

        await audio.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
      if (currentRequestRef.current === requestId) {
        setIsLoading(false);
        setIsPlaying(false);
        options.onError?.(error as Error);
      }
    }
  }, [language, getVoiceForTTS, languageCode, isPlaying, isLoading]);

  const stop = useCallback(() => {
    console.log('TTS stop() called');
    currentRequestRef.current = null;
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
