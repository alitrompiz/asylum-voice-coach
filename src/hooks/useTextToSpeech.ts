
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguagePreference } from './useLanguagePreference';
import { ensureAudioContextReady, getOrCreateAudioElement, playAudioWithContext } from '@/utils/audioContext';

interface TTSOptions {
  voice?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export const useTextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentRequestRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const { language, getVoiceForTTS, languageCode } = useLanguagePreference();

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Audio recovery system for handling interruptions
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('👁️ Visibility changed:', document.hidden ? 'hidden' : 'visible');
      if (!document.hidden && audioRef.current) {
        // Page became visible again, check if audio needs recovery
        setTimeout(() => {
          if (audioRef.current && audioRef.current.paused && isPlaying) {
            console.log('🔄 Attempting audio recovery after visibility change');
            audioRef.current.play().catch(err => {
              console.error('❌ Audio recovery failed:', err);
            });
          }
        }, 100);
      }
    };

    const handleInterruption = () => {
      console.log('📱 Audio interruption detected');
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        console.log('🔄 Resuming AudioContext after interruption');
        audioContextRef.current.resume().catch(err => {
          console.error('❌ AudioContext resume failed:', err);
        });
      }
    };

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for focus events (app coming back to foreground)
    window.addEventListener('focus', handleInterruption);
    window.addEventListener('pageshow', handleInterruption);
    
    // iOS specific interruption handling
    if (isIOS) {
      document.addEventListener('touchstart', handleInterruption, { once: true });
      document.addEventListener('click', handleInterruption, { once: true });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleInterruption);
      window.removeEventListener('pageshow', handleInterruption);
      if (isIOS) {
        document.removeEventListener('touchstart', handleInterruption);
        document.removeEventListener('click', handleInterruption);
      }
    };
  }, [isPlaying, isIOS]);

  const speak = useCallback(async (text: string, options: TTSOptions = {}) => {
    if (!text.trim()) {
      console.log('❌ TTS: Empty text provided');
      return;
    }

    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    currentRequestRef.current = requestId;
    
    console.log('🎤 TTS speak() called:', { 
      requestId,
      textLength: text.length, 
      languageCode,
      isIOS,
      textPreview: text.substring(0, 50) + '...',
      currentAudioElement: !!audioRef.current,
      isCurrentlyPlaying: isPlaying,
      isCurrentlyLoading: isLoading
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

      const voice = options.voice || getVoiceForTTS('openai');

      console.log('📞 Calling OpenAI TTS function:', { 
        requestId,
        textLength: text.length, 
        voice, 
        languageCode
      });

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text,
          voice,
          language: languageCode,
        },
      });
      
      console.log('📨 TTS API Response:', { 
        hasData: !!data, 
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : null,
        requestId: data?.requestId || 'unknown'
      });

      if (currentRequestRef.current !== requestId) {
        console.log('🚫 TTS request cancelled');
        return;
      }

      if (error) {
        console.error('❌ OpenAI TTS error:', error);
        throw new Error(error.message || 'TTS failed');
      }

      if (data?.audioContent) {
        console.log('✅ TTS response received:', { 
          requestId,
          contentLength: data.audioContent.length
        });

        // Ensure AudioContext is ready before playing audio
        await ensureAudioContextReady();

        try {
          // Use persistent audio element for consistent playback
          const audio = getOrCreateAudioElement();
          audioRef.current = audio;

          // Create data URL for audio content
          const audioSrc = `data:audio/mpeg;base64,${data.audioContent}`;

          console.log('🔊 Playing audio with persistent element');

          // Set up event handlers
          const cleanup = () => {
            console.log('🧹 Audio cleanup called');
            if (currentRequestRef.current === requestId) {
              setIsPlaying(false);
              audioRef.current = null;
              options.onEnd?.();
            }
          };

          const handleError = (e: any) => {
            console.error('❌ Audio error:', e, audio.error);
            if (currentRequestRef.current === requestId) {
              setIsLoading(false);
              setIsPlaying(false);
              audioRef.current = null;
              options.onError?.(new Error(`Audio playback failed: ${e.message || audio.error?.message || 'Unknown error'}`));
            }
          };

          // Remove any existing event listeners to prevent duplicates
          audio.removeEventListener('ended', cleanup);
          audio.removeEventListener('error', handleError);
          
          // Add fresh event listeners
          audio.addEventListener('ended', cleanup, { once: true });
          audio.addEventListener('error', handleError, { once: true });

          // Use the utility function for consistent playback
          await playAudioWithContext(audioSrc);
          
          console.log('✅ Audio playback started successfully');
          
          if (currentRequestRef.current === requestId) {
            setIsLoading(false);
            setIsPlaying(true);
          }

        } catch (playbackError) {
          console.error('❌ Audio playback failed:', playbackError);
          
          // Handle the case where audio requires user interaction
          if (playbackError.message.includes('user interaction') || 
              playbackError.message.includes('NotAllowedError')) {
            console.log('⚠️ Audio requires user interaction');
            setIsLoading(false);
            options.onError?.(new Error('Audio blocked - tap to enable audio'));
          } else {
            throw playbackError;
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
  
  // Enhanced debug function to inspect audio state and diagnose interruptions
  const debugAudio = useCallback(() => {
    const debugMessages: string[] = [];
    
    // Current state info
    debugMessages.push(`🎵 TTS State: playing=${isPlaying}, loading=${isLoading}`);
    debugMessages.push(`📱 Platform: ${isIOS ? 'iOS' : 'non-iOS'}`);
    debugMessages.push(`👁️ Page visible: ${!document.hidden}`);
    debugMessages.push(`🔊 Page focused: ${document.hasFocus()}`);
    
    // Check if we have an audio element
    if (!audioRef.current) {
      debugMessages.push('⚠️ No audio element available');
    } else {
      // Check audio element properties
      const audio = audioRef.current;
      debugMessages.push(`📊 Audio state: ${audio.paused ? 'paused' : 'playing'}`);
      debugMessages.push(`📊 Current time: ${audio.currentTime.toFixed(2)}s`);
      debugMessages.push(`📊 Duration: ${audio.duration ? audio.duration.toFixed(2) + 's' : 'unknown'}`);
      debugMessages.push(`📊 Volume: ${audio.volume}`);
      debugMessages.push(`📊 Muted: ${audio.muted}`);
      debugMessages.push(`📊 Ready state: ${audio.readyState}`);
      debugMessages.push(`📊 Network state: ${audio.networkState}`);
      debugMessages.push(`📊 Error: ${audio.error ? audio.error.message : 'none'}`);
      
      // Try to force play and report result immediately
      audio.play().then(() => {
        console.log('✅ Forced play successful');
        debugMessages.push('✅ Forced play successful');
        setDebugInfo(debugMessages.join('\n'));
      }).catch(err => {
        console.log('❌ Forced play failed:', err.message);
        debugMessages.push(`❌ Forced play failed: ${err.message}`);
        setDebugInfo(debugMessages.join('\n'));
      });
    }
    
    // Check AudioContext state
    if (audioContextRef.current) {
      debugMessages.push(`🔊 AudioContext state: ${audioContextRef.current.state}`);
      debugMessages.push(`🔊 AudioContext sample rate: ${audioContextRef.current.sampleRate}`);
    } else {
      debugMessages.push('⚠️ No AudioContext available');
    }
    
    // Check for common interruption scenarios
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      debugMessages.push('⚠️ AudioContext not supported');
    } else {
      debugMessages.push('✅ AudioContext supported');
      try {
        const testCtx = new AudioContext();
        debugMessages.push(`📊 New AudioContext state: ${testCtx.state}`);
        testCtx.close(); // Clean up test context
      } catch (e) {
        debugMessages.push(`❌ AudioContext creation failed: ${e.message}`);
      }
    }
    
    // Browser compatibility checks
    debugMessages.push(`🌐 User Agent: ${navigator.userAgent.substring(0, 60)}...`);
    debugMessages.push(`🔊 Audio support: ${!!window.Audio}`);
    debugMessages.push(`🎵 MediaDevices: ${!!navigator.mediaDevices}`);
    
    setDebugInfo(debugMessages.join('\n'));
    return debugMessages.join('\n');
  }, [isIOS, isPlaying, isLoading]);

  return {
    speak,
    stop,
    isPlaying,
    isLoading,
    debugAudio,
    debugInfo,
    currentLanguage: language,
  };
};
