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

        // Create audio element with special iOS handling
        console.log('🔊 Creating audio element for iOS');
        
        // For iOS, we need to use a different approach due to autoplay restrictions
        if (isIOS) {
          console.log('🍎 Using iOS-compatible approach');
          
          // Create a blob URL instead of data URL for iOS compatibility
          const audioBytes = atob(data.audioContent);
          const arrayBuffer = new ArrayBuffer(audioBytes.length);
          const uint8Array = new Uint8Array(arrayBuffer);
          
          for (let i = 0; i < audioBytes.length; i++) {
            uint8Array[i] = audioBytes.charCodeAt(i);
          }
          
          const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(blob);
          
          const audio = new Audio(audioUrl);
          audio.preload = 'auto';
          
          audioRef.current = audio;

          // Set up event handlers
          const cleanup = () => {
            if (currentRequestRef.current === requestId) {
              setIsPlaying(false);
              audioRef.current = null;
              URL.revokeObjectURL(audioUrl); // Clean up blob URL
              options.onEnd?.();
            }
          };

          const handleError = (e: any) => {
            console.error('❌ iOS Audio error:', e);
            if (currentRequestRef.current === requestId) {
              setIsLoading(false);
              setIsPlaying(false);
              audioRef.current = null;
              URL.revokeObjectURL(audioUrl);
              options.onError?.(new Error('iOS audio playback failed'));
            }
          };

          audio.addEventListener('ended', cleanup);
          audio.addEventListener('error', handleError);
          
          // Wait for the audio to be ready
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Audio load timeout'));
            }, 5000);
            
            audio.addEventListener('canplaythrough', () => {
              clearTimeout(timeout);
              resolve();
            }, { once: true });
            
            audio.addEventListener('error', () => {
              clearTimeout(timeout);
              reject(new Error('Audio load failed'));
            }, { once: true });
          });

          console.log('🍎 Audio ready, attempting playback');
          
          try {
            await audio.play();
            console.log('✅ iOS audio playback started');
            
            if (currentRequestRef.current === requestId) {
              setIsLoading(false);
              setIsPlaying(true);
            }
          } catch (playError) {
            console.error('❌ iOS play() failed:', playError);
            throw new Error(`iOS audio playback failed: ${playError.message}`);
          }
          
        } else {
          // Standard approach for non-iOS
          console.log('🖥️ Using standard audio approach');
          const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
          audio.volume = 1.0;
          audio.muted = false;
          audio.preload = 'auto';
          
          audioRef.current = audio;

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

          await audio.play();
          console.log('✅ Standard audio playback started');
          
          if (currentRequestRef.current === requestId) {
            setIsLoading(false);
            setIsPlaying(true);
          }
        }

        // Verify playback after 100ms
        setTimeout(() => {
          if (audioRef.current && !audioRef.current.paused) {
            console.log('📊 Audio confirmed playing:', {
              currentTime: audioRef.current.currentTime,
              duration: audioRef.current.duration,
              paused: audioRef.current.paused
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