import { useState, useCallback, useRef, useEffect } from 'react';
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

  // Debug logging for state changes
  useEffect(() => {
    console.log('🎤 Recording state changed to:', state);
  }, [state]);
  
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
          title: "Please allow microphone access to practice your interview",
          variant: 'destructive',
        });
      } else {
        setProcessingError(error instanceof Error ? error.message : 'Recording failed');
      }
    }
  }, [state, isDebouncingTap, playTapConfirm, startAudioRecording, t]);

  const stopRecording = useCallback(async (): Promise<AudioRecordingResult | null> => {
    console.log('🎤 stopRecording called, current state:', state);
    if (isDebouncingTap() || state !== 'recording') return null;

    try {
      setState('stopping');
      console.log('🎤 State set to stopping');
      
      // Play stop recording cue
      if (audioCues.canPlayAudioCues()) {
        await audioCues.playStopRecording();
      }
      
      // Stop audio recording
      const result = await stopAudioRecording();
      console.log('🎤 Recording stopped, result:', result ? `${result.duration}s audio` : 'null');
      
      if (result && result.duration > 0) {
        setState('processing');
        console.log('🎤 State set to processing');
        setUserTranscript('Transcribing your message...');
        return result;
      } else {
        setState('idle');
        console.log('🎤 No result, state set to idle');
        return null;
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setState('idle');
      toast({
        title: "We couldn't upload your recording",
        description: "Please try again",
        variant: 'destructive',
      });
      return null;
    }
  }, [state, isDebouncingTap, stopAudioRecording, t]);

  const setUserTranscriptWrapper = useCallback((transcript: string) => {
    console.log('🎤 setUserTranscript called:', { transcript: transcript.substring(0, 50), currentState: state });
    setUserTranscript(transcript);
    
    // Handle transcription errors first
    if (transcript.includes('transcription failed') || transcript.includes('error')) {
      console.log('🎤 Error detected, setting to idle');
      setState('idle');
      setProcessingError('Transcription failed');
      toast({
        title: "We couldn't understand your answer",
        description: "Please try speaking again",
        variant: 'destructive',
      });
      return;
    }
    
    // Use setState callback to get current state and avoid stale closure
    setState(currentState => {
      console.log('🎤 Current state in setState callback:', currentState, 'transcript:', transcript.substring(0, 50));
      
      // If we're in processing state, we need to transition out of it
      if (currentState === 'processing') {
        // If this is a processing message, stay in processing
        if (transcript.includes('Transcribing') || transcript.includes('Processing')) {
          console.log('🎤 Still processing, staying in processing state');
          return currentState;
        }
        
        // If we have a real transcript (not empty), move to ready state
        if (transcript && transcript.trim()) {
          console.log('🎤 Real transcript received, moving to ready state');
          
          // Auto-return to idle after transcript is shown
          setTimeout(() => {
            console.log('🎤 Timeout reached, checking if should return to idle');
            setState(timeoutState => {
              console.log('🎤 Current state in timeout:', timeoutState);
              return timeoutState === 'ready' ? 'idle' : timeoutState;
            });
          }, 1000);
          
          return 'ready';
        } else {
          // If transcript is empty/null, return to idle immediately
          console.log('🎤 Empty transcript, returning to idle immediately');
          return 'idle';
        }
      }
      
      // If not in processing state, don't change state
      return currentState;
    });
  }, [t]); // Remove 'state' from dependencies to avoid stale closure

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