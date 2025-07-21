
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguagePreference } from './useLanguagePreference';

interface TTSOptions {
  voice?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

// iOS Audio Manager Class
class IOSAudioManager {
  private audioContext: AudioContext | null = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume if suspended (required for iOS)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.initialized = true;
      console.log('iOS Audio Manager initialized, state:', this.audioContext.state);
    } catch (error) {
      console.error('Failed to initialize iOS Audio Manager:', error);
      throw error;
    }
  }

  async playBase64Audio(base64Data: string): Promise<HTMLAudioElement> {
    await this.initialize();
    
    // Convert base64 to blob for better iOS compatibility
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create blob with explicit MIME type
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(blob);
    
    // Create audio element
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    
    // Set up promise for loading
    return new Promise((resolve, reject) => {
      let resolved = false;
      
      const cleanup = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.addEventListener('canplaythrough', () => {
        if (!resolved) {
          resolved = true;
          console.log('iOS Audio ready to play');
          resolve(audio);
        }
      });
      
      audio.addEventListener('error', (e) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          console.error('iOS Audio loading error:', e);
          reject(new Error('Failed to load audio on iOS'));
        }
      });
      
      audio.addEventListener('ended', cleanup);
      
      // Set source and load
      audio.src = audioUrl;
      audio.load();
    });
  }

  getState() {
    return this.audioContext?.state || 'not-initialized';
  }
}

// Global iOS audio manager instance
const iosAudioManager = new IOSAudioManager();

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

      // Initialize iOS audio manager on first interaction
      if (isIOS) {
        try {
          await iosAudioManager.initialize();
          console.log('iOS Audio Manager state:', iosAudioManager.getState());
        } catch (error) {
          console.warn('iOS Audio Manager initialization warning:', error);
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

        let audio: HTMLAudioElement;

        if (isIOS) {
          // Use iOS-specific audio manager
          console.log('Using iOS audio playback');
          try {
            audio = await iosAudioManager.playBase64Audio(data.audioContent);
          } catch (iosError) {
            console.error('iOS audio failed, trying fallback:', iosError);
            // Fallback to regular audio element
            audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
          }
        } else {
          // Regular audio element for non-iOS
          console.log('Using standard audio playback');
          audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
        }

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

        // Start playback
        try {
          console.log('Starting audio playback...');
          const playPromise = audio.play();
          
          if (playPromise !== undefined) {
            await playPromise;
            console.log('Audio playback started successfully');
            
            // Set states if not already set by canplay event
            if (currentRequestRef.current === requestId) {
              setIsLoading(false);
              setIsPlaying(true);
            }
          }
        } catch (playError) {
          console.error('Audio play() failed:', playError);
          
          // Try a different approach for iOS
          if (isIOS) {
            try {
              console.log('Trying iOS fallback approach...');
              // Create a user-triggered audio element
              const fallbackAudio = new Audio();
              fallbackAudio.src = `data:audio/mpeg;base64,${data.audioContent}`;
              
              // Try immediate play (works if called during user gesture)
              await fallbackAudio.play();
              
              audioRef.current = fallbackAudio;
              fallbackAudio.addEventListener('ended', handleEnded);
              
              setIsLoading(false);
              setIsPlaying(true);
              console.log('iOS fallback playback successful');
            } catch (fallbackError) {
              console.error('iOS fallback also failed:', fallbackError);
              throw new Error('Audio playback not supported on this iOS device. Please check your device settings.');
            }
          } else {
            throw playError;
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
