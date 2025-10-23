import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MessageSquare, Mic, X, Pause, Play, Send, MicOff, Volume2, EyeOff, Eye, Captions, Type, Bug, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { usePersonaStore } from '@/stores/personaStore';
import { usePersonas } from '@/hooks/usePersonas';
import { useRecordingStateMachine } from '@/hooks/useRecordingStateMachine';
import { useTTSStateMachine } from '@/hooks/useTTSStateMachine';
import { useInterviewConversation } from '@/hooks/useInterviewConversation';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { Waveform } from '@/components/Waveform';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ensureAudioContextReady } from '@/utils/audioContext';
import { SessionEndDialog } from '@/components/SessionEndDialog';
import { GeneratingFeedbackModal } from '@/components/GeneratingFeedbackModal';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export default function Interview() {
  const { t } = useTranslation();
  const { isGuest } = useAuth();
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false); // OFF by default per session
  const [isPaused, setIsPaused] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showSessionEnd, setShowSessionEnd] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [firstTTSStartTime, setFirstTTSStartTime] = useState<number | null>(null);
  const [showGeneratingFeedback, setShowGeneratingFeedback] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioActuallyPlaying, setAudioActuallyPlaying] = useState(false); // Track actual audio playback
  const [showEndConfirmation, setShowEndConfirmation] = useState(false); // Confirmation dialog before ending
  const [isEnding, setIsEnding] = useState(false); // Guard to prevent new TTS during cleanup
  const [previousTranscript, setPreviousTranscript] = useState('');
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Get user's language preference
  const {
    language,
    languageCode,
    isLoading: languageLoading,
    getVoiceForTTS
  } = useLanguagePreference();

  // Enhanced recording and TTS state machines
  const recordingMachine = useRecordingStateMachine();
  const ttsMachine = useTTSStateMachine();

  // Conversation hooks
  const {
    messages,
    isProcessing,
    currentSubtitle,
    processAudioMessage,
    clearConversation,
    formatTime,
    initializeInterview,
    hasInitialized
  } = useInterviewConversation(recordingMachine.setUserTranscript);

  // Extract values from state machines for compatibility
  const isRecording = recordingMachine.state === 'recording';
  const isTTSPlaying = ttsMachine.state === 'playing';
  const duration = recordingMachine.duration;
  const audioLevel = recordingMachine.audioLevel;
  const userTranscription = recordingMachine.userTranscript;

  // Ref for managing press-to-talk
  const pressToTalkRef = useRef<boolean>(false);
  const {
    selectedPersona
  } = usePersonaStore();
  const {
    personas
  } = usePersonas();
  const selectedPersonaData = personas.find(p => p.id === selectedPersona);
  console.log('Interview component - Language info:', {
    languageCode,
    language: language?.name,
    selectedPersona,
    hasInitialized,
    currentSubtitle: currentSubtitle?.substring(0, 50) + '...',
    isAiSpeaking,
    isTTSPlaying
  });

  // Initialize interview with AI greeting
  useEffect(() => {
    if (selectedPersonaData && !hasInitialized && !languageLoading) {
      console.log('Initializing interview with language:', languageCode);
      setSessionStartTime(Date.now());
      initializeInterview();
    }
  }, [selectedPersonaData, hasInitialized, languageLoading, languageCode, initializeInterview]);

  // Track last spoken subtitle to prevent rapid repeated TTS calls
  const lastSpokenSubtitle = useRef<string>('');

  // Handle user transcript persistence - cross-fade when new transcript arrives
  useEffect(() => {
    if (userTranscription && !userTranscription.includes('Transcribing') && !userTranscription.includes('Processing')) {
      // This is a new user transcript - store previous one for potential cross-fade
      if (previousTranscript && previousTranscript !== userTranscription) {
        // Cross-fade transition (simplified - just replace for now)
        setPreviousTranscript(userTranscription);
      } else {
        setPreviousTranscript(userTranscription);
      }
    }
  }, [userTranscription, previousTranscript]);

  // Auto-play TTS when AI responds - with deduplication
  useEffect(() => {
    console.log('🎯 TTS Effect triggered:', {
      currentSubtitle: currentSubtitle?.substring(0, 50) + '...',
      selectedPersonaData: !!selectedPersonaData,
      tts_voice: selectedPersonaData?.tts_voice,
      isProcessing,
      isTTSPlaying,
      languageCode,
      lastSpoken: lastSpokenSubtitle.current?.substring(0, 50) + '...',
      subtitleLength: currentSubtitle?.length || 0,
      shouldSpeak: !!(currentSubtitle && !currentSubtitle.includes("Processing your message") && !currentSubtitle.includes("Transcribing your message") && !currentSubtitle.includes("Connecting...") && !currentSubtitle.includes("Processing failed") && selectedPersonaData?.tts_voice && !isProcessing && !isTTSPlaying && currentSubtitle !== lastSpokenSubtitle.current)
    });

    // Only speak if it's an actual AI response (not processing/transcribing/system messages)
    // AND it's different from the last spoken subtitle AND session is not ending
    if (currentSubtitle && !currentSubtitle.includes("Processing your message") && !currentSubtitle.includes("Transcribing your message") && !currentSubtitle.includes("Connecting...") && !currentSubtitle.includes("Processing failed") && selectedPersonaData?.tts_voice && !isProcessing && !isTTSPlaying && currentSubtitle !== lastSpokenSubtitle.current && !isEnding) {
      console.log('🚀 STARTING TTS for NEW content:', {
        text: currentSubtitle.substring(0, 50) + '...',
        voice: selectedPersonaData.tts_voice,
        timestamp: Date.now()
      });

      // Ensure AudioContext is ready before TTS
      ensureAudioContextReady().then(() => {
        console.log('🔊 AudioContext ready for TTS');
      }).catch(err => {
        console.warn('⚠️ AudioContext preparation failed:', err);
      });

      // Use TTS state machine with OpenAI voice for stability
      const languageVoice = getVoiceForTTS('openai');
      ttsMachine.speak(currentSubtitle, {
        voice: languageVoice,
        onStart: () => {
          console.log('✅ TTS STARTED - Request sent, loading audio...');
          // Track first TTS start for accurate session timing
          if (!firstTTSStartTime) {
            setFirstTTSStartTime(Date.now());
            console.log('🕐 First TTS started - session timer begins');
          }
          setIsAiSpeaking(true);
        },
        onEnd: () => {
          console.log('✅ TTS ENDED - Audio finished playing');
          setIsAiSpeaking(false);
          setAudioActuallyPlaying(false);
        },
        onError: error => {
          console.error('❌ TTS ERROR:', error);
          setIsAiSpeaking(false);
          setAudioActuallyPlaying(false);
          
          // Set dedupe guard to prevent infinite retry loop on same subtitle
          lastSpokenSubtitle.current = currentSubtitle;

          // Check if audio is blocked and show appropriate feedback
          if (error.message.includes('Audio blocked') || error.message.includes('user interaction')) {
            setAudioBlocked(true);
            console.log('⚠️ Audio blocked - user interaction required');
          }
        },
        onAudioPlaying: () => {
          console.log('🔊 AUDIO ACTUALLY PLAYING - Subtitles can now show');
          setAudioActuallyPlaying(true);
          // Mark as spoken only when audio actually plays
          lastSpokenSubtitle.current = currentSubtitle;
        }
      });
    } else if (currentSubtitle === lastSpokenSubtitle.current) {
      console.log('⏭️ Skipping TTS - same content as last spoken');
    } else {
      console.log('⏭️ Skipping TTS - conditions not met:', {
        hasSubtitle: !!currentSubtitle,
        isProcessingMessage: currentSubtitle?.includes("Processing your message"),
        isTranscribingMessage: currentSubtitle?.includes("Transcribing your message"),
        isConnecting: currentSubtitle?.includes("Connecting..."),
        hasVoice: !!selectedPersonaData?.tts_voice,
        isProcessing,
        isTTSPlaying,
        isSameAsLast: currentSubtitle === lastSpokenSubtitle.current
      });
    }
  }, [currentSubtitle, selectedPersonaData?.tts_voice, ttsMachine, isProcessing, isTTSPlaying, isEnding]);

  // Handle touch events (primary for mobile)
  const handleTouch = async (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Touch event called', {
      isProcessing,
      isRecording,
      pressToTalkRef: pressToTalkRef.current
    });
    if (isProcessing) return;

    // Stop TTS if playing
    if (isTTSPlaying) {
      ttsMachine.stop();
      setIsAiSpeaking(false);
      setAudioActuallyPlaying(false);
    }

    // Ensure AudioContext is ready before any audio operations
    await ensureAudioContextReady();

    // Toggle recording state
    if (!isRecording && !pressToTalkRef.current) {
      // Start recording
      pressToTalkRef.current = true;
      try {
        console.log('Starting recording...');
        await recordingMachine.startRecording();
        setIsAiSpeaking(false);
        console.log('Recording started successfully');
      } catch (error) {
        console.error('Failed to start recording:', error);
        pressToTalkRef.current = false;
      }
    } else if (isRecording && pressToTalkRef.current) {
      // Stop recording
      pressToTalkRef.current = false;
      try {
        console.log('Stopping recording...');
        const recording = await recordingMachine.stopRecording();
        if (recording && recording.duration > 0) {
          console.log('Processing audio message...');
          await processAudioMessage(recording);
        }
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    }
  };

  // Handle click events for desktop
  const handleMouseClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Mouse click called', {
      isProcessing,
      isRecording,
      pressToTalkRef: pressToTalkRef.current
    });
    if (isProcessing) return;

    // Stop TTS if playing
    if (isTTSPlaying) {
      ttsMachine.stop();
      setIsAiSpeaking(false);
      setAudioActuallyPlaying(false);
    }

    // Ensure AudioContext is ready before any audio operations
    await ensureAudioContextReady();

    // Toggle recording state
    if (!isRecording && !pressToTalkRef.current) {
      // Start recording
      pressToTalkRef.current = true;
      try {
        console.log('Starting recording...');
        await recordingMachine.startRecording();
        setIsAiSpeaking(false);
        console.log('Recording started successfully');
      } catch (error) {
        console.error('Failed to start recording:', error);
        pressToTalkRef.current = false;
      }
    } else if (isRecording && pressToTalkRef.current) {
      // Stop recording
      pressToTalkRef.current = false;
      try {
        console.log('Stopping recording...');
        const recording = await recordingMachine.stopRecording();
        if (recording && recording.duration > 0) {
          console.log('Processing audio message...');
          await processAudioMessage(recording);
        }
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    }
  };
  // Show confirmation dialog when user wants to end session
  const onRequestEndSession = () => {
    setShowEndConfirmation(true);
  };

  // Gracefully end the session after user confirms
  const gracefulEndSession = async () => {
    console.log('🚪 User confirmed session end - stopping all audio and timers');
    
    // Set ending guard to prevent new TTS
    setIsEnding(true);
    
    try {
      // Stop TTS immediately using state machine
      ttsMachine.stop();
      
      // Stop any audio element that might be playing
      const audioElement = document.getElementById('tts-audio') as HTMLAudioElement;
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.removeAttribute('src');
        console.log('🔇 Audio element stopped and cleared');
      }
      
      // Stop any AudioContext
      if (window.audioContext && window.audioContext.state === 'running') {
        try {
          await window.audioContext.suspend();
          console.log('🔇 AudioContext suspended');
        } catch (err) {
          console.warn('⚠️ Failed to suspend AudioContext:', err);
        }
      }
      
      // Clear all audio/subtitle state
      setIsAiSpeaking(false);
      setAudioActuallyPlaying(false);
      clearConversation();
      
      // Close confirmation dialog
      setShowEndConfirmation(false);
      
      // Brief delay to ensure cleanup completes, then show feedback modal
      setTimeout(() => {
        setShowSessionEnd(true);
      }, 100);
      
    } catch (error) {
      console.error('Error during graceful session end:', error);
      // Even if cleanup fails, proceed to show session end
      setShowEndConfirmation(false);
      setShowSessionEnd(true);
    }
  };

  const handleFeedbackRequest = async () => {
    // Store the interview session first
    const transcript = messages.map(m => `${m.role}: ${m.text}`).join('\n');
    
    try {
      // Save interview session to database
      const { data: sessionData, error: sessionError } = await supabase
        .from('interview_sessions')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          full_transcript: transcript,
          session_duration_seconds: getSessionDuration(),
          persona_id: selectedPersona,
          skills_selected: [], // TODO: Get from interview state
          language: languageCode
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error saving session:', sessionError);
        throw sessionError;
      }

      // Generate feedback using the edge function
      const { data: feedbackData, error: feedbackError } = await supabase.functions.invoke('generate_feedback', {
        body: {
          transcript: transcript,
          sessionId: sessionData.id,
          personaDesc: (selectedPersonaData as any)?.ai_instructions || 'Default persona description',
          skillsSelected: [], // TODO: Get from interview state
          onboarding: {} // TODO: Get from user profile
        }
      });

      if (feedbackError) {
        console.error('Error generating feedback:', feedbackError);
        // Don't throw here - we still want to show the session end flow
      }

      console.log('Session and feedback saved successfully');
    } catch (error) {
      console.error('Error in feedback request:', error);
      // Don't throw - continue with the flow
    }
  };

  const getSessionDuration = () => {
    // Use first TTS start time for accurate session duration instead of component initialization
    if (!firstTTSStartTime) return 0;
    return Math.floor((Date.now() - firstTTSStartTime) / 1000);
  };
  const handleTTSToggle = () => {
    if (isTTSPlaying) {
      ttsMachine.stop();
      setIsAiSpeaking(false);
      setAudioActuallyPlaying(false);
    } else if (currentSubtitle && !currentSubtitle.includes("Processing your message") && !currentSubtitle.includes("Transcribing your message") && selectedPersonaData?.tts_voice) {
      const languageVoice = getVoiceForTTS('openai');
      ttsMachine.speak(currentSubtitle, {
        voice: languageVoice,
        onStart: () => {
          setIsAiSpeaking(true);
        },
        onEnd: () => {
          setIsAiSpeaking(false);
          setAudioActuallyPlaying(false);
        },
        onError: error => {
          console.error('TTS error:', error);
          setIsAiSpeaking(false);
          setAudioActuallyPlaying(false);
          // Prevent retry loop
          lastSpokenSubtitle.current = currentSubtitle;
        },
        onAudioPlaying: () => {
          console.log('🔊 AUDIO ACTUALLY PLAYING - Subtitles can now show');
          setAudioActuallyPlaying(true);
        }
      });
    }
  };
  const feedbackData = {
    clarity: 78,
    credibility: 85,
    caseStrength: 72,
    actionItems: ["Provide more specific dates and locations", "Include additional supporting evidence", "Practice speaking more clearly and confidently", "Prepare documentation for your claims"]
  };
  return <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-blue-900/20" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen p-6">
        {/* Debug Panel */}
        {showDebugPanel && <div className="absolute top-6 left-6 right-6 z-30 bg-black/70 backdrop-blur-sm rounded-lg p-3">
            <div className="text-xs text-white/80 space-y-1">
              <div><strong>Subtitle:</strong> {currentSubtitle?.substring(0, 100)}...</div>
              <div><strong>TTS State:</strong> Playing: {isTTSPlaying}, Loading: {ttsMachine.isLoading}, AI Speaking: {isAiSpeaking}</div>
              <div><strong>Recording:</strong> {isRecording ? 'Active' : 'Inactive'}, Processing: {isProcessing}</div>
              <div><strong>Persona:</strong> {selectedPersonaData?.name} ({selectedPersonaData?.tts_voice})</div>
              <div><strong>Language:</strong> {languageCode}</div>
              <div><strong>Messages:</strong> {messages.length}</div>
            </div>
            <Button onClick={() => setShowDebugPanel(false)} variant="ghost" size="sm" className="absolute top-2 right-2 text-white/60 hover:text-white">
              <X className="h-3 w-3" />
            </Button>
          </div>}
        
        {/* Debug Info Panel */}
        {recordingMachine.error && <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 p-4 bg-black/90 backdrop-blur-sm rounded-lg text-xs font-mono text-white whitespace-pre-wrap max-w-sm max-h-60 overflow-y-auto border border-white/20">
            {recordingMachine.error}
          </div>}

        {/* App Name */}
        <div className="text-center pt-1.5 mb-2">
          <h1 className="text-white text-base font-medium mb-2">Asylum Prep</h1>
          
          {/* Officer Info - moved to top */}
          <div className="text-center space-y-1">
            <h2 className="text-white text-lg font-semibold">{selectedPersonaData?.name || "Officer"}</h2>
            <p className="text-white/70 text-sm">{selectedPersonaData?.mood || "Professional"}</p>
            {language && <p className="text-blue-300 text-xs">
                Speaking in {language.name}
              </p>}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center relative pt-2">
          {/* Officer Image - moved directly under the info */}
          <div className="flex flex-col items-center relative">{/* removed space-y-6 */}
            {/* Officer Image */}
            <div className="relative">
              <img 
                src={selectedPersonaData?.image_url || "/persona-1.png"} 
                alt={selectedPersonaData?.name || "Officer"} 
                className={cn("w-80 h-80 rounded-lg object-cover border-4 shadow-2xl transition-all duration-300", isAiSpeaking ? "border-green-400/80 shadow-green-400/20" : "border-white/20")}
                data-testid="officer-image"
              />
              
              {/* AI Speaking Indicator */}
              {isAiSpeaking && <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="bg-green-500 w-4 h-4 rounded-full animate-pulse shadow-lg"></div>
                </div>}

              {/* Officer Subtitles - positioned at 60% down from top of photo */}
              {showSubtitles && currentSubtitle && audioActuallyPlaying && <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 max-w-[1000px] w-full px-4 z-10">
                  <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
                    <p className="text-xs text-white leading-relaxed">{currentSubtitle}</p>
                  </div>
                </div>}

              {/* Audio Blocked Indicator */}
              {audioBlocked && <div className="absolute top-[50%] left-1/2 transform -translate-x-1/2 w-screen z-20">
                  <div className="bg-orange-600/90 backdrop-blur-sm rounded-lg px-4 py-3 text-center cursor-pointer hover:bg-orange-500/90 transition-colors mx-6" onClick={async () => {
                await ensureAudioContextReady();
                setAudioBlocked(false);
              }}>
                    <p className="text-sm text-white font-medium">🔊 Tap to enable audio</p>
                    <p className="text-xs text-white/80 mt-1">Audio requires user interaction on mobile browsers</p>
                  </div>
                </div>}

              {/* Exit Interview Button - Top Left Corner of Photo */}
              <button 
                onClick={onRequestEndSession} 
                className="absolute top-2 left-2 bg-red-600 hover:bg-red-500 rounded-full p-2 border-2 border-white/20 transition-colors" 
                title="Exit Interview"
                data-testid="exit-button"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Debug Dropdown Button - Upper Right */}
              <div className="absolute -top-2 -right-2 z-20">{/* keeping debug unchanged */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full p-2">
                      🐛
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-background/95 backdrop-blur-sm z-50">
                    <DropdownMenuItem onClick={async () => {
                    console.log('🔊 Initializing AudioContext for iOS');
                    try {
                      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                      if (AudioContext) {
                        const audioCtx = new AudioContext();
                        console.log('AudioContext state before:', audioCtx.state);
                        if (audioCtx.state === 'suspended') {
                          await audioCtx.resume();
                          console.log('AudioContext state after resume:', audioCtx.state);
                          alert('✅ AudioContext activated! Now try TTS.');
                        } else {
                          alert('✅ AudioContext already running!');
                        }
                      } else {
                        alert('❌ AudioContext not supported');
                      }
                    } catch (error) {
                      console.error('❌ AudioContext init failed:', error);
                      alert(`❌ Error: ${error.message}`);
                    }
                  }}>
                      🔊 Init Audio
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                    console.log('🔄 Manually resetting lastSpokenSubtitle to empty');
                    lastSpokenSubtitle.current = '';
                    alert('TTS cache reset. Officer will speak next message.');
                  }}>
                      🔄 Reset TTS
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                    console.log('🧪 Testing iOS audio from interview screen');
                    try {
                      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                      if (AudioContext) {
                        const audioCtx = new AudioContext();
                        if (audioCtx.state === 'suspended') {
                          await audioCtx.resume();
                          console.log('✅ AudioContext resumed');
                        }
                      }
                      await ttsMachine.speak('Testing audio playback on iOS device', {
                        onStart: () => console.log('✅ Test TTS started'),
                        onEnd: () => console.log('✅ Test TTS completed'),
                        onError: e => console.error('❌ Test TTS failed:', e)
                      });
                    } catch (error) {
                      console.error('❌ TTS test failed:', error);
                      alert(`iOS Audio Error: ${error.message}`);
                    }
                  }}>
                      🧪 Test Audio
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                    console.log('🔄 Forcing TTS reload with current message');
                    const currentMessage = currentSubtitle;
                    clearConversation();
                    setTimeout(() => {
                      lastSpokenSubtitle.current = '';
                      initializeInterview();
                    }, 100);
                  }}>
                      🔁 Restart TTS
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                    console.log('Recording state:', recordingMachine);
                    alert('Debug info in console and on screen');
                  }}>
                      🔍 Debug Audio
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                    setShowDebugPanel(!showDebugPanel);
                  }}>
                      📋 Status
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Show/Hide Subtitles Button - Top Right Corner of Photo */}
              <button onClick={() => setShowSubtitles(!showSubtitles)} className={`absolute top-2 right-2 rounded-full p-2 border-2 border-white/20 transition-colors ${showSubtitles ? "bg-blue-600 hover:bg-blue-500" : "bg-gray-600 hover:bg-gray-500"}`} title={showSubtitles ? "Hide Subtitles" : "Show Subtitles"}>
                {showSubtitles ? <Captions className="w-5 h-5 text-white" /> : <Type className="w-5 h-5 text-white" />}
              </button>


            </div>
            
          </div>

          {/* User Transcription - above the record button */}
          {userTranscription && <div className="w-full max-w-2xl mx-auto mt-8">
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
                <p className="text-sm text-gray-300 leading-relaxed">{userTranscription}</p>
              </div>
            </div>}
        </div>

        {/* Press to Talk Button - Bottom - Fixed to always be visible */}
        <div className="fixed bottom-0 left-0 right-0">
          <div className="flex flex-col items-center pb-safe-or-6 pt-4 space-y-6">
            {/* Timer and Recording Indicator */}
            {isRecording && <div className="flex flex-col items-center gap-2">
                <div className="w-32 h-8 bg-black/30 rounded-lg backdrop-blur-sm overflow-hidden flex items-center justify-center">
                  <Waveform isActive={true} intensity={audioLevel} className="h-full scale-y-75" />
                </div>
                <div className="bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <span className="text-white text-lg font-mono">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>}
            
            {/* Button Row */}
            <div className="flex items-center justify-center gap-8">
              {/* Play Response Button - moved to left */}
              <button onClick={handleTTSToggle} className={cn("flex flex-col items-center gap-2 group select-none", "transition-all duration-200")}>
                <div className={cn("w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg", isTTSPlaying ? "bg-green-600 hover:bg-green-500 shadow-green-500/50" : "bg-purple-600 hover:bg-purple-500 shadow-purple-500/30")}>
                  <Play className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <span className="text-white text-xs md:text-sm font-medium text-center leading-tight min-h-[2.5rem] flex items-center">Play Officer</span>
              </button>

              {/* Press to Talk Button - moved to right */}
              <button onClick={handleMouseClick} onTouchStart={isMobile ? handleTouch : undefined} onTouchEnd={isMobile ? handleTouch : undefined} onTouchCancel={isMobile ? handleTouch : undefined} onContextMenu={e => e.preventDefault()} disabled={isProcessing} className={cn("flex flex-col items-center gap-2 group select-none", "transition-all duration-200", isRecording && "scale-110")}>
                <div className={cn("w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg", isRecording ? "bg-red-600 hover:bg-red-500 shadow-red-500/50" : isProcessing ? "bg-yellow-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/30")}>
                  <Mic className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <span className="text-white text-xs md:text-sm font-medium text-center leading-tight min-h-[2.5rem] flex items-center">
                  {recordingMachine.getButtonLabel()}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Session End Dialog */}
      <SessionEndDialog 
        open={showSessionEnd}
        onOpenChange={setShowSessionEnd}
        sessionDuration={getSessionDuration()}
        isGuest={isGuest}
        onFeedbackRequest={() => {
          setShowSessionEnd(false);
          setShowGeneratingFeedback(true);
          return handleFeedbackRequest();
        }}
        sessionData={{
          transcript: messages.map(m => `${m.role}: ${m.text}`).join('\n'),
          personaId: selectedPersona,
          skills: [], // TODO: Get from interview state
          sessionId: undefined // TODO: Get from interview state
        }}
      />

      {/* Generating Feedback Modal */}
      <GeneratingFeedbackModal 
        open={showGeneratingFeedback}
        onOpenChange={setShowGeneratingFeedback}
        onComplete={() => {
          setShowGeneratingFeedback(false);
          setShowFeedback(true);
        }}
      />

      {/* Feedback Dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="sm:max-w-[500px] bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-semibold">Session Feedback</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Scores */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Your Performance</h3>
              
              <div className="space-y-3">
                {/* Clarity */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Clarity</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-300" style={{
                      width: `${feedbackData.clarity}%`
                    }} />
                    </div>
                    <span className="text-white font-medium w-8 text-right">{feedbackData.clarity}</span>
                  </div>
                </div>
                
                {/* Credibility */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Credibility</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 transition-all duration-300" style={{
                      width: `${feedbackData.credibility}%`
                    }} />
                    </div>
                    <span className="text-white font-medium w-8 text-right">{feedbackData.credibility}</span>
                  </div>
                </div>
                
                {/* Case Strength */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Case Strength</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 transition-all duration-300" style={{
                      width: `${feedbackData.caseStrength}%`
                    }} />
                    </div>
                    <span className="text-white font-medium w-8 text-right">{feedbackData.caseStrength}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Items */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white">Action Items</h3>
              <ul className="space-y-2">
                {feedbackData.actionItems.map((item, index) => <li key={index} className="flex items-start gap-2 text-gray-300">
                    <span className="text-blue-400 mt-1">•</span>
                    <span className="text-sm">{item}</span>
                  </li>)}
              </ul>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button onClick={() => {
              setShowFeedback(false);
              navigate('/dashboard');
            }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                Return to Dashboard
              </Button>
              <Button onClick={() => {
              setShowFeedback(false);
              navigate('/dashboard'); // TODO: Navigate to session history when implemented
            }} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white">
                Session History
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* End Session Confirmation Dialog */}
      <Dialog open={showEndConfirmation} onOpenChange={setShowEndConfirmation}>
        <DialogContent className="sm:max-w-[400px] bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <div className="text-center space-y-6 py-6">
            <h2 className="text-xl font-bold text-white">
              Are you sure you want to end this session?
            </h2>
            
            <div className="space-y-3">
              {/* Primary Button: Continue Session */}
              <Button 
                onClick={() => setShowEndConfirmation(false)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3"
              >
                Continue Session
              </Button>
              
              {/* Secondary Button: End Session */}
              <Button 
                onClick={gracefulEndSession}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                End Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}
