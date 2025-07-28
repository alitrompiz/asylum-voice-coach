import { useState, useCallback, useRef } from 'react';
import { useTextToSpeech } from './useTextToSpeech';
import { useTranslation } from 'react-i18next';

export type TTSState = 'idle' | 'starting' | 'playing';

export interface UseTTSStateMachineReturn {
  state: TTSState;
  isLoading: boolean;
  error: string | null;
  speak: (text: string, options?: any) => Promise<void>;
  stop: () => void;
  getButtonLabel: () => string;
  isButtonDisabled: boolean;
}

export const useTTSStateMachine = (): UseTTSStateMachineReturn => {
  const { t } = useTranslation();
  const [state, setState] = useState<TTSState>('idle');
  const [error, setError] = useState<string | null>(null);
  const playbackStarted = useRef<boolean>(false);
  
  const {
    speak: ttsSpeak,
    stop: ttsStop,
    isPlaying: isTTSPlaying,
    isLoading: isTTSLoading
  } = useTextToSpeech();

  const speak = useCallback(async (text: string, options?: any) => {
    if (state !== 'idle') return;
    
    try {
      setState('starting');
      setError(null);
      playbackStarted.current = false;
      
      await ttsSpeak(text, {
        ...options,
        onStart: () => {
          console.log('TTS loading started');
          options?.onStart?.();
        },
        onAudioPlaying: () => {
          // Only set to playing state when audio actually starts
          if (!playbackStarted.current) {
            playbackStarted.current = true;
            setState('playing');
            console.log('TTS audio actually playing');
          }
          options?.onAudioPlaying?.();
        },
        onEnd: () => {
          setState('idle');
          playbackStarted.current = false;
          console.log('TTS ended');
          options?.onEnd?.();
        },
        onError: (err: Error) => {
          setState('idle');
          playbackStarted.current = false;
          setError(err.message);
          console.error('TTS error:', err);
          
          // Show audio blocked message if needed
          if (err.message.includes('Audio blocked') || err.message.includes('user interaction')) {
            setError('Tap to allow audio');
          }
          
          options?.onError?.(err);
        }
      });
      
    } catch (err) {
      setState('idle');
      playbackStarted.current = false;
      setError(err instanceof Error ? err.message : 'TTS failed');
    }
  }, [state, ttsSpeak]);

  const stop = useCallback(() => {
    ttsStop();
    setState('idle');
    playbackStarted.current = false;
    setError(null);
  }, [ttsStop]);

  const getButtonLabel = useCallback(() => {
    switch (state) {
      case 'idle':
        return 'Play Officer';
      case 'starting':
        return 'Starting...';
      case 'playing':
        return t('interview.playing');
      default:
        return 'Play Officer';
    }
  }, [state, t]);

  const isButtonDisabled = state === 'starting';

  return {
    state,
    isLoading: isTTSLoading,
    error,
    speak,
    stop,
    getButtonLabel,
    isButtonDisabled,
  };
};