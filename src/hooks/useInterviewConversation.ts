
import { useState, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { usePersonaStore } from '@/stores/personaStore';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { AudioRecordingResult } from './useAudioRecording';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  audioUrl?: string;
}

export const useInterviewConversation = (setUserTranscript?: (transcript: string) => void) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);
  const { toast } = useToast();
  const { selectedPersona } = usePersonaStore();
  const { languageCode } = useLanguagePreference();
  const sessionIdRef = useRef<string | null>(null);

  // Initialize session ID
  if (!sessionIdRef.current) {
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  console.log('useInterviewConversation - Language:', languageCode);

  // Initialize with AI greeting
  const initializeInterview = async () => {
    if (hasInitialized || !selectedPersona) return;
    
    setHasInitialized(true);
    setIsProcessing(true);
    setCurrentSubtitle('Connecting...');

    try {
      console.log('Initializing interview with language:', languageCode);
      
      // Get initial AI greeting
      const aiResponse = await sendToAI([]);
      
      // Add AI greeting to conversation
      const aiMessage: ConversationMessage = {
        id: `ai_greeting_${Date.now()}`,
        role: 'assistant',
        text: aiResponse,
        timestamp: Date.now()
      };

      setMessages([aiMessage]);
      setCurrentSubtitle(aiResponse);
    } catch (error) {
      console.error('Error initializing interview:', error);
      setCurrentSubtitle('Hello! I\'m ready to conduct your asylum interview. Please press and hold the button to speak.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const transcribeAudio = async (audioData: string): Promise<string> => {
    try {
      console.log('Transcribing audio with language:', languageCode);
      
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { 
          audio: audioData, 
          language: languageCode || 'en' 
        }
      });

      if (error) {
        console.error('Transcription error:', error);
        
        // Check if it's a quota exceeded error
        if (error.message?.includes('quota') || error.message?.includes('429')) {
          throw new Error('OpenAI quota exceeded. Please check your API billing or try again later.');
        } else {
          throw new Error('Failed to transcribe audio');
        }
      }

      return data.text || '';
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  };

  const sendToAI = async (conversationMessages: ConversationMessage[]): Promise<string> => {
    try {
      console.log('Sending to AI with language:', languageCode);
      
      const { data, error } = await supabase.functions.invoke('interview-ai', {
        body: {
          messages: conversationMessages,
          personaId: selectedPersona,
          language: languageCode || 'en',
          skills: [], // Could be passed as props if needed
          sessionId: sessionIdRef.current
        }
      });

      if (error) {
        console.error('AI response error:', error);
        
        // Check if it's a quota exceeded error
        if (error.message?.includes('quota') || error.message?.includes('429')) {
          throw new Error('OpenAI quota exceeded. Please check your API billing or try again later.');
        } else {
          throw new Error('Failed to get AI response');
        }
      }

      return data.text || '';
    } catch (error) {
      console.error('Error getting AI response:', error);
      throw error;
    }
  };

  const processAudioMessage = async (recording: AudioRecordingResult) => {
    setIsProcessing(true);
    setCurrentSubtitle('Transcribing your message...');
    setUserTranscript?.('Transcribing your message...');

    try {
      // Step 1: Transcribe audio
      const transcription = await transcribeAudio(recording.base64Audio);
      
      if (!transcription.trim()) {
        setUserTranscript?.('No speech detected');
        toast({
          title: "No speech detected",
          description: "Please try speaking more clearly.",
          variant: "destructive"
        });
        return;
      }

      // Update recording state machine with successful transcription
      setUserTranscript?.(transcription);

      // Step 2: Add user message to conversation
      const userMessage: ConversationMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        text: transcription,
        timestamp: Date.now(),
        audioUrl: URL.createObjectURL(recording.audioBlob)
      };

      setMessages(prev => [...prev, userMessage]);
      setCurrentSubtitle('Processing your message...');

      // Step 3: Send to AI
      const updatedMessages = [...messages, userMessage];
      const aiResponse = await sendToAI(updatedMessages);

      // Step 4: Add AI response to conversation
      const aiMessage: ConversationMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        text: aiResponse,
        timestamp: Date.now()
      };

      // Important: Set unique timestamp to ensure new response is processed
      // This forces TTS to recognize it as a new message
      console.log('Setting new AI response with timestamp:', Date.now());
      
      setMessages(prev => [...prev, aiMessage]);
      // Set to empty first to ensure the effect detects a change
      setCurrentSubtitle('');
      
      // Small delay to ensure state update happens before setting the new subtitle
      setTimeout(() => {
        setCurrentSubtitle(aiResponse);
      }, 10);

      // Display transcription in toast
      toast({
        title: "Message transcribed",
        description: transcription,
        duration: 3000
      });

    } catch (error) {
      console.error('Error processing audio message:', error);
      // Notify recording state machine of error
      setUserTranscript?.('transcription failed');
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to process your message",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setCurrentSubtitle('');
    setHasInitialized(false);
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  return {
    messages,
    isProcessing,
    currentSubtitle,
    processAudioMessage,
    clearConversation,
    formatTime,
    initializeInterview,
    hasInitialized
  };
};
