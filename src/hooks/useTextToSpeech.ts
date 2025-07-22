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
  const [debugInfo, setDebugInfo] = useState<string>('');
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

      const { data, error } = await supabase.functions.invoke('eleven-labs-tts-v2', {
        body: {
          text,
          voice,
          model: 'eleven_turbo_v2_5',
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
          
          try {
            // Create a blob URL instead of data URL for iOS compatibility
            const audioBytes = atob(data.audioContent);
            const arrayBuffer = new ArrayBuffer(audioBytes.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            
            for (let i = 0; i < audioBytes.length; i++) {
              uint8Array[i] = audioBytes.charCodeAt(i);
            }
            
            // Log first few bytes to verify audio data integrity
            console.log('🔍 Audio data verification:', {
              firstBytes: Array.from(uint8Array.slice(0, 10)).map(b => b.toString(16)),
              byteLength: uint8Array.length
            });
            
            const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(blob);
            
            // Create new audio element with full browser support
            const audio = new Audio();
            audio.src = audioUrl;
            audio.preload = 'auto';
            audio.volume = 1.0;
            
            // Force audio context initialization (helps on iOS)
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
              const audioContext = new AudioContext();
              const source = audioContext.createMediaElementSource(audio);
              source.connect(audioContext.destination);
              
              // Resume audio context if needed
              if (audioContext.state === 'suspended') {
                await audioContext.resume();
                console.log('🔊 AudioContext resumed on iOS');
              }
            }
            
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
                options.onError?.(new Error(`iOS audio playback failed: ${e.message || 'Unknown error'}`));
              }
            };

            audio.addEventListener('ended', cleanup);
            audio.addEventListener('error', handleError);
            
            // Wait for the audio to be ready with a longer timeout for iOS
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Audio load timeout after 8 seconds'));
              }, 8000);
              
              // Both canplaythrough and canplay events to maximize compatibility
              const readyHandler = () => {
                clearTimeout(timeout);
                resolve();
              };
              
              audio.addEventListener('canplaythrough', readyHandler, { once: true });
              audio.addEventListener('canplay', readyHandler, { once: true });
              
              audio.addEventListener('error', () => {
                clearTimeout(timeout);
                reject(new Error(`Audio load failed: ${audio.error?.message || 'Unknown error'}`));
              }, { once: true });
              
              // Force load to start
              audio.load();
            });

            console.log('🍎 Audio ready, attempting playback with user interaction simulation');
            
            // Simulate user interaction to help with iOS autoplay restrictions
            document.body.addEventListener('touchend', async function playAudioOnce() {
              document.body.removeEventListener('touchend', playAudioOnce);
              try {
                await audio.play();
              } catch (e) {
                console.error('Touch event play failed:', e);
              }
            }, { once: true });
            
            // Try to play anyway
            try {
              await audio.play();
              console.log('✅ iOS audio playback started successfully');
              
              if (currentRequestRef.current === requestId) {
                setIsLoading(false);
                setIsPlaying(true);
              }
            } catch (playError) {
              console.warn('⚠️ iOS play() failed, waiting for user interaction:', playError);
              // Don't throw here, we'll wait for the touch event
            }
          } catch (iosError) {
            console.error('❌ iOS audio setup failed:', iosError);
            throw new Error(`iOS audio setup failed: ${iosError.message}`);
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
  
  // Debug function to inspect audio state
  const debugAudio = useCallback(() => {
    const debugMessages: string[] = [];
    
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
      
      // Try to force play
      audio.play().then(() => {
        debugMessages.push('✅ Forced play successful');
        setDebugInfo(debugMessages.join('\n'));
      }).catch(err => {
        debugMessages.push(`❌ Forced play failed: ${err.message}`);
        setDebugInfo(debugMessages.join('\n'));
      });
    }
    
    // OS detection
    debugMessages.push(`📱 Platform: ${isIOS ? 'iOS' : 'non-iOS'}`);
    debugMessages.push(`📱 User Agent: ${navigator.userAgent}`);
    
    // Check AudioContext support
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      debugMessages.push('⚠️ AudioContext not supported');
    } else {
      debugMessages.push('✅ AudioContext supported');
      try {
        const ctx = new AudioContext();
        debugMessages.push(`📊 AudioContext state: ${ctx.state}`);
      } catch (e) {
        debugMessages.push(`❌ AudioContext creation failed: ${e.message}`);
      }
    }
    
    setDebugInfo(debugMessages.join('\n'));
    return debugMessages.join('\n');
  }, [isIOS]);

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