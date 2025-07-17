import { useState, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { usePersonaStore } from '@/stores/personaStore';
import { AudioRecordingResult } from './useAudioRecording';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  audioUrl?: string;
}

export const useInterviewConversation = () => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const { toast } = useToast();
  const { selectedPersona } = usePersonaStore();
  const sessionIdRef = useRef<string | null>(null);

  // Initialize session ID
  if (!sessionIdRef.current) {
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const transcribeAudio = async (audioData: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: audioData, language: 'en' }
      });

      if (error) {
        console.error('Transcription error:', error);
        throw new Error('Failed to transcribe audio');
      }

      return data.text || '';
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  };

  const sendToAI = async (conversationMessages: ConversationMessage[]): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('interview-ai', {
        body: {
          messages: conversationMessages,
          personaId: selectedPersona,
          language: 'en',
          skills: [], // Could be passed as props if needed
          sessionId: sessionIdRef.current
        }
      });

      if (error) {
        console.error('AI response error:', error);
        throw new Error('Failed to get AI response');
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

    try {
      // Step 1: Transcribe audio
      const transcription = await transcribeAudio(recording.base64Audio);
      
      if (!transcription.trim()) {
        toast({
          title: "No speech detected",
          description: "Please try speaking more clearly.",
          variant: "destructive"
        });
        return;
      }

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

      setMessages(prev => [...prev, aiMessage]);
      setCurrentSubtitle(aiResponse);

      // Display transcription in toast
      toast({
        title: "Message transcribed",
        description: transcription,
        duration: 3000
      });

    } catch (error) {
      console.error('Error processing audio message:', error);
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
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  return {
    messages,
    isProcessing,
    currentSubtitle,
    processAudioMessage,
    clearConversation,
    formatTime
  };
};