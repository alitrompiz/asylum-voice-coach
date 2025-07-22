
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguagePreference } from './useLanguagePreference';

interface TTSOptions {
  voice?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

// Enhanced audio manager for cross-platform compatibility with improved iOS support
const createAudioElement = (base64Data: string): HTMLAudioElement => {
  console.log('🔊 createAudioElement called');
  const audio = new Audio(`data:audio/mpeg;base64,${base64Data}`);
  
  // Essential iOS properties
  audio.volume = 1.0;
  audio.muted = false;
  audio.crossOrigin = 'anonymous';
  audio.preload = 'auto';
  audio.autoplay = false;

  console.log('🔊 Audio element created with properties:', {
    volume: audio.volume,
    muted: audio.muted,
    src: audio.src.substring(0, 50) + '...'
  });

  // Load the audio immediately
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
    
  // Check if AudioContext was initialized from Start Interview button
  const wasAudioContextInitialized = useRef<boolean>(
    window.sessionStorage.getItem('audioContextInitialized') === 'true'
  );

  const speak = useCallback(async (text: string, options: TTSOptions = {}) => {
    if (!text.trim()) return;

    // Create a unique request ID to prevent duplicate calls
    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    currentRequestRef.current = requestId;
    
    console.log('🎤 TTS speak() called:', { 
      requestId,
      textLength: text.length, 
      languageCode,
      isPlaying,
      isLoading,
      isIOS,
      textPreview: text.substring(0, 50) + '...'
    });

    // Force audio context initialization right now if iOS
    if (isIOS) {
      console.log('🍎 iOS detected - ensuring AudioContext is active');
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        console.log('🍎 AudioContext state:', audioContext.state);
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
          console.log('🍎 AudioContext resumed');
        }
        
        // Store global reference for audio elements to use
        (window as any).__audioContext = audioContext;
      } catch (err) {
        console.error('🍎 AudioContext initialization failed:', err);
      }
    }
    
    // If already playing or loading, stop first
    if (isPlaying || isLoading) {
      console.log('🛑 Stopping existing TTS for new request');
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

      console.log('🔍 Checking audio context state before TTS call');

      // Get the appropriate voice for the selected language
      const voice = options.voice || getVoiceForTTS('openai');

      console.log('📞 Calling ElevenLabs TTS edge function with:', { 
        requestId,
        textLength: text.length, 
        voice, 
        language: languageCode
      });

      const { data, error } = await supabase.functions.invoke('eleven-labs-tts', {
        body: {
          text,
          voice,
          model: 'eleven_turbo_v2_5', // Fast, multilingual model
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

        // Debug audio element properties before playback
        console.log('🔊 Audio element properties before play:', {
          requestId,
          volume: audio.volume,
          muted: audio.muted,
          readyState: audio.readyState,
          paused: audio.paused,
          currentTime: audio.currentTime,
          duration: audio.duration,
          src: audio.src.substring(0, 50) + '...',
          audioContextState: (window as any).__audioContext?.state || 'none'
        });

        // Start playback immediately 
        try {
          console.log('▶️ Starting audio playback...');
          
          // For iOS, ensure volume is set correctly
          if (isIOS) {
            audio.volume = 1.0;
            audio.muted = false;
            console.log('🍎 iOS audio settings enforced');
          }
          
          const playPromise = audio.play();
          console.log('🎵 Audio.play() promise created:', !!playPromise);
          
          if (playPromise) {
            await playPromise;
            console.log('✅ Audio playback started successfully');
            
            // Verify audio is actually playing
            setTimeout(() => {
              console.log('📊 Audio status after 100ms:', {
                paused: audio.paused,
                currentTime: audio.currentTime,
                volume: audio.volume,
                muted: audio.muted,
                readyState: audio.readyState
              });
            }, 100);
            
            // Set states after successful play
            if (currentRequestRef.current === requestId) {
              setIsLoading(false);
              setIsPlaying(true);
            }
          }
        } catch (playError) {
          console.error('❌ Audio play() failed:', playError);
          console.error('📋 Audio element state on error:', {
            volume: audio.volume,
            muted: audio.muted,
            readyState: audio.readyState,
            paused: audio.paused,
            networkState: audio.networkState,
            error: audio.error
          });
          
          // Try alternative approach for iOS
          if (isIOS) {
            console.log('🍎 Attempting iOS fallback playback method');
            try {
              // Force load and try again
              audio.load();
              await new Promise(resolve => setTimeout(resolve, 100));
              await audio.play();
              console.log('✅ iOS fallback successful');
              if (currentRequestRef.current === requestId) {
                setIsLoading(false);
                setIsPlaying(true);
              }
            } catch (fallbackError) {
              console.error('❌ iOS fallback also failed:', fallbackError);
              throw new Error(`Audio playback failed: ${playError.message}`);
            }
          } else {
            throw new Error(`Audio playback failed: ${playError.message}`);
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
