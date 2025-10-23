
import { useState, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { usePersonaStore } from '@/stores/personaStore';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { AudioRecordingResult } from './useAudioRecording';
import { useAuth } from '@/hooks/useAuth';
import { useGuestSession } from '@/hooks/useGuestSession';

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
  const { user } = useAuth();
  const { guestData } = useGuestSession();
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
      const aiResponse = await sendToAI([], []); // Empty for both on init
      
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

  const trimConversationHistory = (messages: ConversationMessage[]): ConversationMessage[] => {
    // Calculate total character count
    const totalChars = messages.reduce((sum, msg) => sum + msg.text.length, 0);
    
    // If under 6000 chars (buffer before 8000 limit), return as-is
    if (totalChars < 6000) {
      console.log(`✅ Conversation length (${totalChars} chars) under limit, no trimming needed`);
      return messages;
    }
    
    // Keep first 2 messages (greeting + first response) for context
    const keepFirst = Math.min(2, messages.length);
    // Keep last 4 messages (most recent context)
    const keepLast = Math.min(4, messages.length - keepFirst);
    
    if (keepFirst + keepLast >= messages.length) {
      return messages;
    }
    
    const trimmedLength = keepFirst + 1 + keepLast; // +1 for context marker
    console.log(`✂️ Trimming conversation: ${messages.length} messages → ${trimmedLength} messages (${totalChars} chars → API processing only)`);
    console.log(`📝 Full ${messages.length}-message transcript will still be saved to database`);
    
    // Create trimmed conversation with context marker
    const contextMarker: ConversationMessage = {
      id: `context_${Date.now()}`,
      role: 'assistant',
      text: '[Previous conversation context omitted for brevity]',
      timestamp: Date.now()
    };
    
    return [
      ...messages.slice(0, keepFirst),
      contextMarker,
      ...messages.slice(-keepLast)
    ];
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

  const sendToAI = async (
    conversationMessages: ConversationMessage[], 
    fullMessages: ConversationMessage[]
  ): Promise<string> => {
    try {
      console.log('Sending to AI with language:', languageCode);
      console.log(`Trimmed messages: ${conversationMessages.length}, Full messages: ${fullMessages.length}`);
      
      // Build full transcript for storage (NOT for AI processing)
      const fullTranscript = fullMessages.map(m => 
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`
      ).join('\n\n');
      
      const requestBody: any = {
        messages: conversationMessages, // Trimmed for AI
        fullTranscript: fullTranscript,  // Full for storage
        personaId: selectedPersona,
        language: languageCode || 'en',
        skills: [], // Could be passed as props if needed
        sessionId: sessionIdRef.current
      };

      // Add guest story data for unauthenticated users
      if (!user && guestData) {
        requestBody.guestStoryData = {
          storyText: guestData.storyText,
          firstName: guestData.storyFirstName,
          lastName: guestData.storyLastName
        };
        requestBody.guestToken = guestData.guestToken;
        console.log('Including guest story data in AI request');
      }
      
      const { data, error } = await supabase.functions.invoke('interview-ai', {
        body: requestBody
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
    console.log('🎯 processAudioMessage started');
    setIsProcessing(true);
    setCurrentSubtitle('Transcribing your message...');
    setUserTranscript?.('Transcribing your message...');

    try {
      // Step 1: Transcribe audio
      console.log('🎯 Starting transcription...');
      const transcription = await transcribeAudio(recording.base64Audio);
      console.log('🎯 Transcription result:', transcription);
      
      if (!transcription.trim()) {
        console.log('🎯 Empty transcription detected');
        setUserTranscript?.('No speech detected');
        toast({
          title: "No speech detected",
          description: "Please try speaking more clearly.",
          variant: "destructive"
        });
        return;
      }

      // Update recording state machine with successful transcription
      console.log('🎯 Sending transcription to recording state machine:', transcription);
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

      // Step 3: Send to AI with trimmed history but keep full for storage
      const updatedMessages = [...messages, userMessage];
      const trimmedMessages = trimConversationHistory(updatedMessages);
      const aiResponse = await sendToAI(trimmedMessages, updatedMessages); // Pass both!

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
        title: "We heard:",
        description: transcription.substring(0, 100) + (transcription.length > 100 ? '...' : ''),
        duration: 3000
      });

    } catch (error) {
      console.error('Error processing audio message:', error);
      
      // Check for specific error types
      if (error instanceof Error) {
        if (error.message.includes('Conversation too long')) {
          toast({
            title: "Interview session is very long",
            description: "Consider ending this session and starting a new one for better performance",
            variant: "destructive"
          });
        } else if (error.message.includes('quota') || error.message.includes('429')) {
          toast({
            title: "Service temporarily unavailable",
            description: "Please try again in a moment",
            variant: "destructive"
          });
        } else {
          toast({
            title: "We couldn't process your answer",
            description: "Please try again",
            variant: "destructive"
          });
        }
      }
      
      setUserTranscript?.('transcription failed');
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
