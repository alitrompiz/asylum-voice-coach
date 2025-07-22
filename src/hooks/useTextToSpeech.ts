import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguagePreference } from './useLanguagePreference';

interface TTSOptions {
  voice?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

// iOS-optimized audio manager
const createAudioElement = (base64Data: string): HTMLAudioElement => {
  console.log('🔊 Creating audio element for iOS');
  
  // Create audio with iOS-safe data URL
  const audio = new Audio(`data:audio/mpeg;base64,${base64Data}`);
  
  // Essential iOS properties
  audio.volume = 1.0;
  audio.muted = false;
  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';
  
  // Force iOS to prepare audio immediately
  audio.load();
  
  console.log('🔊 Audio element created:', {
    volume: audio.volume,
    muted: audio.muted,
    readyState: audio.readyState
  });
  
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

    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    currentRequestRef.current = requestId;
    
    console.log('🎤 TTS speak() called:', { 
      requestId,
      textLength: text.length, 
      languageCode,
      isIOS,
      textPreview: text.substring(0, 50) + '...'
    });

    // Stop any existing audio
    if (isPlaying || isLoading) {
      console.log('🛑 Stopping existing TTS');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setIsPlaying(false);
      setIsLoading(false);
    }

    // Ensure AudioContext is active on iOS
    if (isIOS) {
      console.log('🍎 Ensuring iOS AudioContext is active');
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        
        if (!(window as any).audioContext) {
          (window as any).audioContext = new AudioContextClass();
        }
        
        if ((window as any).audioContext.state === 'suspended') {
          await (window as any).audioContext.resume();
          console.log('🍎 AudioContext resumed');
        }
        
        console.log('🍎 AudioContext state:', (window as any).audioContext.state);
      } catch (err) {
        console.error('🍎 AudioContext error:', err);
      }
    }

    try {
      setIsLoading(true);
      options.onStart?.();

      const voice = options.voice || getVoiceForTTS('elevenlabs');

      console.log('📞 Calling ElevenLabs TTS function:', { 
        requestId,
        textLength: text.length, 
        voice, 
        languageCode
      });

      const { data, error } = await supabase.functions.invoke('eleven-labs-tts', {
        body: {
          text,
          voice,
          model: 'eleven_turbo_v2_5',
        },
      });

      if (currentRequestRef.current !== requestId) {
        console.log('🚫 TTS request cancelled');
        return;
      }

      if (error) {
        console.error('❌ ElevenLabs TTS error:', error);
        throw new Error(error.message || 'TTS failed');
      }

      if (data?.audioContent) {
        console.log('✅ TTS response received:', { 
          requestId,
          contentLength: data.audioContent.length
        });

        // Create and configure audio element
        const audio = createAudioElement(data.audioContent);
        audioRef.current = audio;

        // Set up event handlers
        const cleanup = () => {
          if (currentRequestRef.current === requestId) {
            setIsPlaying(false);
            audioRef.current = null;
            options.onEnd?.();
          }
        };

        const handleError = (e: any) => {
          console.error('❌ Audio error:', e);
          if (currentRequestRef.current === requestId) {
            setIsLoading(false);
            setIsPlaying(false);
            audioRef.current = null;
            options.onError?.(new Error('Audio playback failed'));
          }
        };

        audio.addEventListener('ended', cleanup);
        audio.addEventListener('error', handleError);

        // iOS-specific playback approach
        if (isIOS) {
          console.log('🍎 Using iOS playback method');
          
          // Wait for audio to be ready
          const waitForReady = () => new Promise<void>((resolve) => {
            if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
              resolve();
            } else {
              audio.addEventListener('canplay', () => resolve(), { once: true });
            }
          });

          await waitForReady();
          console.log('🍎 Audio ready for playback');
          
          // Try playback with retry
          let playAttempts = 0;
          const maxAttempts = 3;
          
          while (playAttempts < maxAttempts) {
            try {
              console.log(`🍎 Play attempt ${playAttempts + 1}`);
              await audio.play();
              console.log('✅ iOS audio playback started');
              
              if (currentRequestRef.current === requestId) {
                setIsLoading(false);
                setIsPlaying(true);
              }
              break;
              
            } catch (playError) {
              playAttempts++;
              console.warn(`🍎 Play attempt ${playAttempts} failed:`, playError);
              
              if (playAttempts >= maxAttempts) {
                throw playError;
              }
              
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        } else {
          // Standard playback for non-iOS
          console.log('🖥️ Using standard playback');
          await audio.play();
          console.log('✅ Audio playback started');
          
          if (currentRequestRef.current === requestId) {
            setIsLoading(false);
            setIsPlaying(true);
          }
        }

        // Verify playback after 100ms
        setTimeout(() => {
          if (audio && !audio.paused) {
            console.log('📊 Audio confirmed playing:', {
              currentTime: audio.currentTime,
              duration: audio.duration,
              paused: audio.paused
            });
          } else {
            console.warn('⚠️ Audio may not be playing');
          }
        }, 100);

      } else {
        throw new Error('No audio content received');
      }

    } catch (error) {
      console.error('❌ TTS error:', error);
      if (currentRequestRef.current === requestId) {
        setIsLoading(false);
        setIsPlaying(false);
        options.onError?.(error as Error);
      }
    }
  }, [language, getVoiceForTTS, languageCode, isPlaying, isLoading, isIOS]);

  const stop = useCallback(() => {
    console.log('🛑 TTS stop() called');
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