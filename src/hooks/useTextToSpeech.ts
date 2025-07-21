
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const { language, getVoiceForTTS, languageCode } = useLanguagePreference();

  // Initialize audio context for iOS Safari compatibility
  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        // Create audio context for iOS compatibility
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Resume audio context if suspended (required for iOS)
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        console.log('Audio context initialized:', audioContextRef.current.state);
      } catch (error) {
        console.warn('Could not initialize audio context:', error);
      }
    }
  }, []);

  const speak = useCallback(async (text: string, options: TTSOptions = {}) => {
    if (!text.trim()) return;

    // Initialize audio context on first interaction (required for iOS)
    initializeAudioContext();

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
        audioRef.current.currentTime = 0;
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
        
        // Check if it's a quota exceeded error and provide user-friendly message
        if (error.message?.includes('quota') || error.message?.includes('429')) {
          throw new Error('Voice synthesis temporarily unavailable - quota exceeded. Please check your OpenAI API billing.');
        }
        
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

        // Create audio element with iOS-compatible settings
        const audio = new Audio();
        
        // Set audio properties for iOS compatibility
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        
        // Set the audio source
        audio.src = `data:audio/mpeg;base64,${data.audioContent}`;
        audioRef.current = audio;

        // Set up event listeners before loading
        audio.addEventListener('loadstart', () => {
          console.log('Audio load started');
        });

        audio.addEventListener('canplay', () => {
          console.log('Audio can play');
          if (currentRequestRef.current === requestId) {
            setIsLoading(false);
            setIsPlaying(true);
          }
        });

        audio.addEventListener('ended', () => {
          console.log('Audio ended');
          if (currentRequestRef.current === requestId) {
            setIsPlaying(false);
            audioRef.current = null;
            options.onEnd?.();
          }
        });

        audio.addEventListener('error', (e) => {
          console.error('Audio error:', e);
          if (currentRequestRef.current === requestId) {
            setIsPlaying(false);
            setIsLoading(false);
            audioRef.current = null;
            options.onError?.(new Error('Audio playback failed on iOS Safari'));
          }
        });

        audio.addEventListener('pause', () => {
          console.log('Audio paused');
        });

        audio.addEventListener('play', () => {
          console.log('Audio started playing');
        });

        // Load and play the audio
        try {
          audio.load(); // Explicitly load the audio
          
          // For iOS Safari, we need to play immediately after user interaction
          const playPromise = audio.play();
          
          if (playPromise !== undefined) {
            await playPromise;
            console.log('Audio playing successfully on iOS');
          }
        } catch (playError) {
          console.error('iOS audio play error:', playError);
          
          // Fallback: try to create a new audio element
          try {
            const fallbackAudio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
            audioRef.current = fallbackAudio;
            
            fallbackAudio.addEventListener('ended', () => {
              if (currentRequestRef.current === requestId) {
                setIsPlaying(false);
                options.onEnd?.();
              }
            });
            
            await fallbackAudio.play();
            setIsLoading(false);
            setIsPlaying(true);
            console.log('Fallback audio playing on iOS');
          } catch (fallbackError) {
            console.error('Fallback audio failed:', fallbackError);
            throw new Error('Audio playback not supported on this iOS device');
          }
        }
      }
    } catch (error) {
      console.error('TTS error:', error);
      if (currentRequestRef.current === requestId) {
        setIsLoading(false);
        setIsPlaying(false);
        options.onError?.(error as Error);
      }
    }
  }, [language, getVoiceForTTS, languageCode, isPlaying, isLoading, initializeAudioContext]);

  const stop = useCallback(() => {
    console.log('TTS stop() called');
    currentRequestRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
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
