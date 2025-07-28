import { useState, useCallback, useRef } from 'react';
import { useAudioRecording, AudioRecordingResult } from './useAudioRecording';
import { audioCues } from '@/utils/audioCues';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export type RecordingState = 'idle' | 'arming' | 'recording' | 'stopping' | 'processing' | 'ready';

export interface UseRecordingStateMachineReturn {
  state: RecordingState;
  duration: number;
  audioLevel: number;
  error: string | null;
  userTranscript: string;
  isButtonDisabled: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<AudioRecordingResult | null>;
  setUserTranscript: (transcript: string) => void;
  getButtonLabel: () => string;
  playTapConfirm: () => Promise<void>;
}

export const useRecordingStateMachine = (): UseRecordingStateMachineReturn => {
  const { t } = useTranslation();
  const [state, setState] = useState<RecordingState>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [processingError, setProcessingError] = useState<string | null>(null);
  const lastTapTime = useRef<number>(0);
  
  const {
    isRecording,
    duration,
    audioLevel,
    error: recordingError,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    cancelRecording
  } = useAudioRecording();

  // Debounce taps to prevent multi-fires
  const isDebouncingTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current < 250) {
      return true;
    }
    lastTapTime.current = now;
    return false;
  }, []);

  const playTapConfirm = useCallback(async () => {
    if (audioCues.canPlayAudioCues()) {
      await audioCues.playTapConfirm();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (isDebouncingTap() || state !== 'idle') return;

    try {
      setState('arming');
      setProcessingError(null);
      
      // Play tap confirmation
      await playTapConfirm();
      
      // Start audio recording
      await startAudioRecording();
      
      // Play start recording cue and update state
      if (audioCues.canPlayAudioCues()) {
        await audioCues.playStartRecording();
      }
      
      setState('recording');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setState('idle');
      
      // Show permission error if needed
      if (error instanceof Error && error.message.includes('Permission denied')) {
        toast({
          title: t('interview.mic_permission_needed'),
          variant: 'destructive',
        });
      } else {
        setProcessingError(error instanceof Error ? error.message : 'Recording failed');
      }
    }
  }, [state, isDebouncingTap, playTapConfirm, startAudioRecording, t]);

  const stopRecording = useCallback(async (): Promise<AudioRecordingResult | null> => {
    if (isDebouncingTap() || state !== 'recording') return null;

    try {
      setState('stopping');
      
      // Play stop recording cue
      if (audioCues.canPlayAudioCues()) {
        await audioCues.playStopRecording();
      }
      
      // Stop audio recording
      const result = await stopAudioRecording();
      
      if (result && result.duration > 0) {
        setState('processing');
        setUserTranscript('Transcribing your message...');
        return result;
      } else {
        setState('idle');
        return null;
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setState('idle');
      toast({
        title: t('interview.upload_failed'),
        variant: 'destructive',
      });
      return null;
    }
  }, [state, isDebouncingTap, stopAudioRecording, t]);

  const setUserTranscriptWrapper = useCallback((transcript: string) => {
    setUserTranscript(transcript);
    
    // Handle transcription errors first
    if (transcript.includes('transcription failed') || transcript.includes('error')) {
      setState('idle');
      setProcessingError('Transcription failed');
      toast({
        title: t('interview.transcription_failed'),
        variant: 'destructive',
      });
      return;
    }
    
    // If we're in processing state, we need to transition out of it
    if (state === 'processing') {
      // If this is a processing message, stay in processing
      if (transcript.includes('Transcribing') || transcript.includes('Processing')) {
        return;
      }
      
      // If we have a real transcript (not empty), move to ready state
      if (transcript && transcript.trim()) {
        setState('ready');
        
        // Auto-return to idle after transcript is shown
        setTimeout(() => {
          setState(currentState => currentState === 'ready' ? 'idle' : currentState);
        }, 1000);
      } else {
        // If transcript is empty/null, return to idle immediately
        setState('idle');
      }
    }
  }, [state, t]);

  const getButtonLabel = useCallback(() => {
    switch (state) {
      case 'idle':
        return t('interview.press_to_talk');
      case 'arming':
        return t('interview.press_to_talk');
      case 'recording':
        return t('interview.recording_tap_to_stop');
      case 'stopping':
      case 'processing':
        return 'Processing...';
      case 'ready':
        return t('interview.press_to_talk');
      default:
        return t('interview.press_to_talk');
    }
  }, [state, t]);

  const isButtonDisabled = state === 'stopping' || state === 'processing';
  const error = recordingError || processingError;

  return {
    state,
    duration,
    audioLevel,
    error,
    userTranscript,
    isButtonDisabled,
    startRecording,
    stopRecording,
    setUserTranscript: setUserTranscriptWrapper,
    getButtonLabel,
    playTapConfirm,
  };
};