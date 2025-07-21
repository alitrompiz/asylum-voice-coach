
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguagePreference } from './useLanguagePreference';

interface TTSOptions {
  voice?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

// Simple audio manager for cross-platform compatibility
const createAudioElement = (base64Data: string): HTMLAudioElement => {
  const audio = new Audio(`data:audio/mpeg;base64,${base64Data}`);
  
  // Set properties for better compatibility
  audio.crossOrigin = 'anonymous';
  audio.preload = 'metadata';
  
  // Force load the audio
  audio.load();
  
  return audio;
};


export const useTextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentRequestRef = useRef<string | null>(null);
  const { language, getVoiceForTTS, languageCode } = useLanguagePreference();

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

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
      isIOS,
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

      // Initialize AudioContext on iOS if needed
      if (isIOS) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log('iOS AudioContext resumed');
          }
        } catch (error) {
          console.warn('iOS AudioContext warning:', error);
        }
      }

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

        // Create audio element with cross-platform compatibility
        console.log(`Creating audio element for ${isIOS ? 'iOS' : 'standard'} device`);
        const audio = createAudioElement(data.audioContent);

        audioRef.current = audio;

        // Set up event listeners
        const handleCanPlay = () => {
          if (currentRequestRef.current === requestId) {
            console.log('Audio can play, starting playback');
            setIsLoading(false);
            setIsPlaying(true);
          }
        };

        const handleEnded = () => {
          if (currentRequestRef.current === requestId) {
            console.log('Audio playback ended');
            setIsPlaying(false);
            audioRef.current = null;
            options.onEnd?.();
          }
        };

        const handleError = (e: any) => {
          console.error('Audio playback error:', e);
          if (currentRequestRef.current === requestId) {
            setIsPlaying(false);
            setIsLoading(false);
            audioRef.current = null;
            options.onError?.(new Error(`Audio playback failed on ${isIOS ? 'iOS' : 'this device'}`));
          }
        };

        // Add event listeners
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('canplaythrough', handleCanPlay);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        // Start playback immediately 
        try {
          console.log('Starting audio playback...');
          await audio.play();
          console.log('Audio playback started successfully');
          
          // Set states after successful play
          if (currentRequestRef.current === requestId) {
            setIsLoading(false);
            setIsPlaying(true);
          }
        } catch (playError) {
          console.error('Audio play() failed:', playError);
          throw new Error(`Audio playback failed: ${playError.message}`);
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
  }, [language, getVoiceForTTS, languageCode, isPlaying, isLoading, isIOS]);

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
