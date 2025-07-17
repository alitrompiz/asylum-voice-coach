import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMinutesStore } from '@/stores/minutesStore';
import { trackEvent } from '@/lib/tracking';
import { trackAICall } from '@/lib/monitoring';

export interface InterviewMessage {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
}

export interface UseVoiceInterviewOptions {
  personaId?: string;
  language?: string;
  skills?: string[];
  onZeroMinutes?: () => void;
}

export interface UseVoiceInterviewReturn {
  // State
  isRecording: boolean;
  subtitlesText: string;
  messages: InterviewMessage[];
  minutesRemaining: number;
  isProcessing: boolean;
  error: string | null;
  
  // Actions
  startInterview: () => Promise<void>;
  stopRecording: () => void;
  toggleSubtitles: () => void;
  pause: () => void;
  end: () => void;
  
  // Settings
  subtitlesEnabled: boolean;
}

export const useVoiceInterview = (options: UseVoiceInterviewOptions = {}): UseVoiceInterviewReturn => {
  const { personaId = 'professional', language = 'en', skills = [], onZeroMinutes } = options;
  
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [subtitlesText, setSubtitlesText] = useState('');
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interviewActive, setInterviewActive] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const minuteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Zustand store
  const { currentMinutes, decrementMinutes, fetchMinutesBalance } = useMinutesStore();
  
  // Cleanup function
  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (minuteTimerRef.current) {
      clearInterval(minuteTimerRef.current);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsRecording(false);
    setIsProcessing(false);
  }, []);
  
  // Auto-pause when minutes reach 0
  useEffect(() => {
    if (currentMinutes === 0 && interviewActive) {
      // Pause function will be defined below
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (minuteTimerRef.current) {
        clearInterval(minuteTimerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setIsRecording(false);
      setIsProcessing(false);
      setInterviewActive(false);
      onZeroMinutes?.();
    }
  }, [currentMinutes, interviewActive, onZeroMinutes]);
  
  // Start minute decrement timer
  const startMinuteTimer = useCallback(() => {
    if (minuteTimerRef.current) {
      clearInterval(minuteTimerRef.current);
    }
    
    minuteTimerRef.current = setInterval(() => {
      decrementMinutes();
    }, 60000); // 1 minute
  }, [decrementMinutes]);
  
  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  };
  
  // Process audio with Whisper
  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const base64Audio = await blobToBase64(audioBlob);
      
      // Track voice-to-text call
      const whisperStartTime = Date.now();
      const { data, error: whisperError } = await supabase.functions.invoke('voice-to-text', {
        body: {
          audio: base64Audio,
          language: language
        }
      });
      const whisperLatency = Date.now() - whisperStartTime;
      
      if (whisperError) {
        trackAICall('voice-to-text', {
          model: 'whisper-1',
          latency_ms: whisperLatency,
          cost_usd: 0.006, // Approximate cost per minute
          success: false,
          error: whisperError.message
        });
        throw whisperError;
      }
      
      trackAICall('voice-to-text', {
        model: 'whisper-1',
        latency_ms: whisperLatency,
        cost_usd: 0.006, // Approximate cost per minute
        success: true
      });
      
      const userText = data.text;
      if (!userText?.trim()) {
        setError('No speech detected. Please try again.');
        return;
      }
      
      // Add user message
      const userMessage: InterviewMessage = {
        role: 'user',
        text: userText,
        ts: Date.now()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setSubtitlesText(userText);
      
      // Get AI response
      const currentMessages = [...messages, userMessage];
      const aiStartTime = Date.now();
      const { data: aiData, error: aiError } = await supabase.functions.invoke('interview-ai', {
        body: {
          messages: currentMessages,
          personaId,
          language,
          skills,
          sessionId
        }
      });
      const aiLatency = Date.now() - aiStartTime;
      
      if (aiError) {
        trackAICall('interview-ai', {
          model: 'gpt-4o-mini',
          latency_ms: aiLatency,
          cost_usd: 0.0015, // Approximate cost per interaction
          success: false,
          error: aiError.message
        });
        throw aiError;
      }
      
      trackAICall('interview-ai', {
        model: 'gpt-4o-mini',
        latency_ms: aiLatency,
        cost_usd: 0.0015, // Approximate cost per interaction
        success: true
      });
      
      const aiMessage: InterviewMessage = {
        role: 'assistant',
        text: aiData.text,
        ts: Date.now()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Convert AI response to speech
      const ttsStartTime = Date.now();
        const { data: speechData, error: speechError } = await supabase.functions.invoke('text-to-speech', {
          body: {
            text: aiData.text,
            voice: 'alloy' // Using OpenAI's default voice
          }
        });
      const ttsLatency = Date.now() - ttsStartTime;
      
      if (speechError) {
        trackAICall('text-to-speech', {
          model: 'tts-1',
          latency_ms: ttsLatency,
          cost_usd: 0.0015, // Approximate cost per request
          success: false,
          error: speechError.message
        });
        throw speechError;
      }
      
      trackAICall('text-to-speech', {
        model: 'tts-1',
        latency_ms: ttsLatency,
        cost_usd: 0.0015, // Approximate cost per request
        success: true
      });
      
      // Play audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      audioRef.current = new Audio();
      audioRef.current.src = `data:audio/mpeg;base64,${speechData.audioContent}`;
      audioRef.current.play().catch(console.error);
      
      if (subtitlesEnabled) {
        setSubtitlesText(aiData.text);
      }
      
    } catch (error: any) {
      console.error('Error processing audio:', error);
      setError(error.message || 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  }, [messages, personaId, language, skills, subtitlesEnabled]);
  
  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          await processAudio(audioBlob);
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setError(error.message || 'Failed to start recording');
    }
  }, [processAudio]);
  
  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);
  
  // Start interview
  const startInterview = useCallback(async () => {
    try {
      setError(null);
      setInterviewActive(true);
      const newInterviewId = `interview_${Date.now()}`;
      setInterviewId(newInterviewId);
      
      // Generate session ID for tracking
      const newSessionId = crypto.randomUUID();
      setSessionId(newSessionId);
      
      // Fetch current minutes balance
      await fetchMinutesBalance();
      
      // Start minute timer
      startMinuteTimer();
      
      // Track interview start
      trackEvent('interview_start', {
        personaId,
        language,
        skills,
        minutesRemaining: currentMinutes,
        interviewId: newInterviewId,
        sessionId: newSessionId
      });
      
      // Add initial AI message
      const aiStartTime = Date.now();
      const { data: aiData, error: aiError } = await supabase.functions.invoke('interview-ai', {
        body: {
          messages: [],
          personaId,
          language,
          skills,
          sessionId: newSessionId
        }
      });
      const aiLatency = Date.now() - aiStartTime;
      
      if (aiError) {
        trackAICall('interview-ai', {
          model: 'gpt-4o-mini',
          latency_ms: aiLatency,
          cost_usd: 0.0015,
          success: false,
          error: aiError.message
        });
        throw aiError;
      }
      
      trackAICall('interview-ai', {
        model: 'gpt-4o-mini',
        latency_ms: aiLatency,
        cost_usd: 0.0015,
        success: true
      });
      
      const initialMessage: InterviewMessage = {
        role: 'assistant',
        text: aiData.text,
        ts: Date.now()
      };
      
      setMessages([initialMessage]);
      
      // Convert to speech
      const ttsStartTime = Date.now();
      const { data: speechData, error: speechError } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: aiData.text,
          voice: 'alloy' // Using OpenAI's default voice
        }
      });
      const ttsLatency = Date.now() - ttsStartTime;
      
      if (speechError) {
        trackAICall('text-to-speech', {
          model: 'tts-1',
          latency_ms: ttsLatency,
          cost_usd: 0.0015,
          success: false,
          error: speechError.message
        });
        throw speechError;
      }
      
      trackAICall('text-to-speech', {
        model: 'tts-1',
        latency_ms: ttsLatency,
        cost_usd: 0.0015,
        success: true
      });
      
      // Play initial audio
      audioRef.current = new Audio();
      audioRef.current.src = `data:audio/mpeg;base64,${speechData.audioContent}`;
      audioRef.current.play().catch(console.error);
      
      if (subtitlesEnabled) {
        setSubtitlesText(aiData.text);
      }
      
    } catch (error: any) {
      console.error('Error starting interview:', error);
      setError(error.message || 'Failed to start interview');
      setInterviewActive(false);
    }
  }, [personaId, language, skills, fetchMinutesBalance, startMinuteTimer, currentMinutes, subtitlesEnabled]);
  
  // Toggle subtitles
  const toggleSubtitles = useCallback(() => {
    setSubtitlesEnabled(prev => !prev);
    if (!subtitlesEnabled) {
      setSubtitlesText('');
    }
  }, [subtitlesEnabled]);
  
  // Pause interview
  const pause = useCallback(() => {
    cleanup();
    setInterviewActive(false);
    if (minuteTimerRef.current) {
      clearInterval(minuteTimerRef.current);
    }
  }, [cleanup]);
  
  // End interview
  const end = useCallback(() => {
    cleanup();
    setInterviewActive(false);
    setMessages([]);
    setSubtitlesText('');
    
    if (minuteTimerRef.current) {
      clearInterval(minuteTimerRef.current);
    }
    
    // Track interview end
    trackEvent('interview_end', {
      personaId,
      language,
      skills,
      minutesRemaining: currentMinutes,
      interviewId,
      messageCount: messages.length,
      duration: interviewId ? Date.now() - parseInt(interviewId.split('_')[1]) : 0
    });
    
    setInterviewId(null);
  }, [cleanup, personaId, language, skills, currentMinutes, interviewId, messages.length]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (minuteTimerRef.current) {
        clearInterval(minuteTimerRef.current);
      }
    };
  }, [cleanup]);
  
  return {
    // State
    isRecording,
    subtitlesText,
    messages,
    minutesRemaining: currentMinutes,
    isProcessing,
    error,
    subtitlesEnabled,
    
    // Actions
    startInterview,
    stopRecording: stopRecording,
    toggleSubtitles,
    pause,
    end
  };
};