
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MessageSquare, Mic, X, Pause, Play, Send, MicOff, Volume2, EyeOff, Eye, Captions, Type } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import { usePersonas } from '@/hooks/usePersonas';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useInterviewConversation } from '@/hooks/useInterviewConversation';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { Waveform } from '@/components/Waveform';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Interview() {
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  // Get user's language preference
  const { language, languageCode, isLoading: languageLoading } = useLanguagePreference();
  
  // Audio recording and conversation hooks
  const { isRecording, duration, audioLevel, error: recordingError, startRecording, stopRecording, cancelRecording } = useAudioRecording();
  const { messages, isProcessing, currentSubtitle, processAudioMessage, clearConversation, formatTime, initializeInterview, hasInitialized } = useInterviewConversation();
  const { speak, stop: stopTTS, isPlaying: isTTSPlaying, isLoading: isTTSLoading, debugAudio, debugInfo } = useTextToSpeech();
  
  // Ref for managing press-to-talk
  const pressToTalkRef = useRef<boolean>(false);
  
  const { selectedPersona } = usePersonaStore();
  const { personas } = usePersonas();
  
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
      initializeInterview();
    }
  }, [selectedPersonaData, hasInitialized, languageLoading, languageCode, initializeInterview]);

  // Track last spoken subtitle to prevent rapid repeated TTS calls
  const lastSpokenSubtitle = useRef<string>('');

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
      shouldSpeak: !!(currentSubtitle && 
        !currentSubtitle.includes("Processing your message") && 
        !currentSubtitle.includes("Transcribing your message") &&
        !currentSubtitle.includes("Connecting...") &&
        !currentSubtitle.includes("Processing failed") &&
        selectedPersonaData?.tts_voice &&
        !isProcessing &&
        !isTTSPlaying &&
        currentSubtitle !== lastSpokenSubtitle.current)
    });
    
    // Only speak if it's an actual AI response (not processing/transcribing/system messages)
    // AND it's different from the last spoken subtitle
    if (currentSubtitle && 
        !currentSubtitle.includes("Processing your message") && 
        !currentSubtitle.includes("Transcribing your message") &&
        !currentSubtitle.includes("Connecting...") &&
        !currentSubtitle.includes("Processing failed") &&
        selectedPersonaData?.tts_voice &&
        !isProcessing &&
        !isTTSPlaying &&
        currentSubtitle !== lastSpokenSubtitle.current) {
      
      console.log('🚀 STARTING TTS for NEW content:', {
        text: currentSubtitle.substring(0, 50) + '...',
        voice: selectedPersonaData.tts_voice,
        timestamp: Date.now()
      });
      lastSpokenSubtitle.current = currentSubtitle;

      // Map OpenAI voice to ElevenLabs voice for compatibility
      const mapToElevenLabsVoice = (openaiVoice: string) => {
        const voiceMap: Record<string, string> = {
          'alloy': '9BWtsMINqrJLrRacOk9x', // Aria
          'echo': 'EXAVITQu4vr4xnSDxMaL', // Sarah  
          'fable': 'pFZP5JQG7iQjIQuC4Bku', // Lily
          'onyx': 'CwhRBWXzGAHq8TQ4Fs17', // Roger
          'nova': 'cgSgspJ2msm6clMCkdW9', // Jessica
          'shimmer': 'XB0fDUnXU5powFXDhCwa', // Charlotte
        };
        return voiceMap[openaiVoice] || '9BWtsMINqrJLrRacOk9x'; // Default to Aria
      };
      
      const elevenLabsVoice = mapToElevenLabsVoice(selectedPersonaData.tts_voice);
      console.log('🔄 Voice mapping:', selectedPersonaData.tts_voice, '->', elevenLabsVoice);
      
      speak(currentSubtitle, {
        voice: elevenLabsVoice,
        onStart: () => {
          console.log('✅ TTS STARTED - Audio should be playing now');
          setIsAiSpeaking(true);
        },
        onEnd: () => {
          console.log('✅ TTS ENDED - Audio finished playing');
          setIsAiSpeaking(false);
        },
        onError: (error) => {
          console.error('❌ TTS ERROR:', error);
          setIsAiSpeaking(false);
          alert(`TTS Error: ${error.message}`);
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
  }, [currentSubtitle, selectedPersonaData?.tts_voice, speak, isProcessing, isTTSPlaying]);

  // Handle touch events (primary for mobile)
  const handleTouch = async (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Touch event called', { isProcessing, isRecording, pressToTalkRef: pressToTalkRef.current });
    
    if (isProcessing) return;
    
    // Stop TTS if playing
    if (isTTSPlaying) {
      stopTTS();
      setIsAiSpeaking(false);
    }
    
    // Log AudioContext status instead of trying to initialize it here
    // It should have been initialized already from the Dashboard's Start Interview button
    console.log('AudioContext status:', {
      wasInitialized: window.sessionStorage.getItem('audioContextInitialized') === 'true'
    });
    
    // Toggle recording state
    if (!isRecording && !pressToTalkRef.current) {
      // Start recording
      pressToTalkRef.current = true;
      try {
        console.log('Starting recording...');
        await startRecording();
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
        const recording = await stopRecording();
        if (recording.duration > 0) {
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
    console.log('Mouse click called', { isProcessing, isRecording, pressToTalkRef: pressToTalkRef.current });
    
    if (isProcessing) return;
    
    // Stop TTS if playing
    if (isTTSPlaying) {
      stopTTS();
      setIsAiSpeaking(false);
    }
    
    // Toggle recording state
    if (!isRecording && !pressToTalkRef.current) {
      // Start recording
      pressToTalkRef.current = true;
      try {
        console.log('Starting recording...');
        await startRecording();
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
        const recording = await stopRecording();
        if (recording.duration > 0) {
          console.log('Processing audio message...');
          await processAudioMessage(recording);
        }
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    }
  };


  const handleEndSession = () => {
    setIsAiSpeaking(false);
    stopTTS();
    clearConversation();
    setShowFeedback(true);
  };

  const handleTTSToggle = () => {
    if (isTTSPlaying) {
      stopTTS();
      setIsAiSpeaking(false);
    } else if (currentSubtitle && 
               !currentSubtitle.includes("Processing your message") && 
               !currentSubtitle.includes("Transcribing your message") &&
               selectedPersonaData?.tts_voice) {
      
      // Map OpenAI voice to ElevenLabs voice for compatibility  
      const mapToElevenLabsVoice = (openaiVoice: string) => {
        const voiceMap: Record<string, string> = {
          'alloy': '9BWtsMINqrJLrRacOk9x', // Aria
          'echo': 'EXAVITQu4vr4xnSDxMaL', // Sarah  
          'fable': 'pFZP5JQG7iQjIQuC4Bku', // Lily
          'onyx': 'CwhRBWXzGAHq8TQ4Fs17', // Roger
          'nova': 'cgSgspJ2msm6clMCkdW9', // Jessica
          'shimmer': 'XB0fDUnXU5powFXDhCwa', // Charlotte
        };
        return voiceMap[openaiVoice] || '9BWtsMINqrJLrRacOk9x';
      };
      
      speak(currentSubtitle, {
        voice: mapToElevenLabsVoice(selectedPersonaData.tts_voice),
        onStart: () => {
          setIsAiSpeaking(true);
        },
        onEnd: () => {
          setIsAiSpeaking(false);
        },
        onError: (error) => {
          console.error('TTS error:', error);
          setIsAiSpeaking(false);
        }
      });
    }
  };

  const feedbackData = {
    clarity: 78,
    credibility: 85,
    caseStrength: 72,
    actionItems: [
      "Provide more specific dates and locations",
      "Include additional supporting evidence",
      "Practice speaking more clearly and confidently",
      "Prepare documentation for your claims"
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-blue-900/20" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen p-6">
        {/* Top Controls with Debug Button */}
        <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center">
          <div></div>
          {/* Debug Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={async () => {
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
              }}
              variant="default"
              size="sm"
            >
              🔊 Init Audio
            </Button>
            <Button 
              onClick={() => {
                console.log('🔄 Manually resetting lastSpokenSubtitle to empty');
                lastSpokenSubtitle.current = '';
                alert('TTS cache reset. Officer will speak next message.');
              }}
              variant="default"
              size="sm"
            >
              🔄 Reset TTS
            </Button>
            <Button 
              onClick={async () => {
                console.log('🧪 Testing iOS audio from interview screen');
                try {
                  // Force audio context activation
                  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                  if (AudioContext) {
                    const audioCtx = new AudioContext();
                    if (audioCtx.state === 'suspended') {
                      await audioCtx.resume();
                      console.log('✅ AudioContext resumed');
                    }
                  }
                  
                  // Test with ElevenLabs TTS directly
                  await speak('Testing audio playback on iOS device', {
                    onStart: () => console.log('✅ Test TTS started'),
                    onEnd: () => console.log('✅ Test TTS completed'),
                    onError: (e) => console.error('❌ Test TTS failed:', e)
                  });
                } catch (error) {
                  console.error('❌ TTS test failed:', error);
                  alert(`iOS Audio Error: ${error.message}`);
                }
              }}
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              🧪 Test Audio
            </Button>
            <Button 
              onClick={async () => {
                // Force a TTS reset by using the useInterviewConversation hook
                console.log('🔄 Forcing TTS reload with current message');
                const currentMessage = currentSubtitle;
                
                // First, clear the subtitle
                clearConversation();
                
                // Then set it again with a small delay
                setTimeout(() => {
                  // Create a "fake" AI message with the same content
                  const aiMessage = {
                    id: `ai_retry_${Date.now()}`,
                    role: 'assistant',
                    text: currentMessage,
                    timestamp: Date.now()
                  };
                  
                  // Call the raw setter from useInterviewConversation hook
                  console.log('🔄 Resetting with message:', currentMessage.substring(0, 30) + '...');
                  
                  // Force the lastSpokenSubtitle to be reset
                  lastSpokenSubtitle.current = '';
                  
                  // Re-initialize the interview (this will trigger the TTS)
                  initializeInterview();
                }, 100);
              }}
              variant="default"
              size="sm"
            >
              🔁 Restart TTS
            </Button>
            <Button 
              onClick={() => {
                const debugInfo = debugAudio();
                alert('Debug info in console and on screen');
              }}
              variant="default"
              size="sm"
            >
              🔍 Debug Audio
            </Button>
            <Button 
              onClick={() => {
                console.log('📋 COMPLETE TTS STATUS REPORT:', {
                  currentSubtitle: currentSubtitle?.substring(0, 50) + '...',
                  selectedPersona: selectedPersona,
                  selectedPersonaData: selectedPersonaData ? {
                    name: selectedPersonaData.name,
                    tts_voice: selectedPersonaData.tts_voice
                  } : null,
                  isProcessing,
                  isTTSPlaying,
                  isTTSLoading,
                  isAiSpeaking,
                  lastSpokenSubtitle: lastSpokenSubtitle.current?.substring(0, 30) + '...',
                  hasInitialized,
                  messagesCount: messages.length
                });
                alert('Complete status logged to console');
              }}
              variant="default"
              size="sm"
            >
              📋 Status
            </Button>
          </div>
        </div>
        
        {/* Debug Info Panel */}
        {debugInfo && (
          <div className="absolute bottom-16 right-6 z-20 max-w-md p-3 bg-black/70 backdrop-blur-sm rounded-lg text-xs font-mono text-white whitespace-pre-wrap">
            {debugInfo}
          </div>
        )}

        {/* App Name */}
        <div className="text-center pt-1.5 mb-0.5">
          <h1 className="text-white text-base font-medium">Asylum Prep</h1>
        </div>
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-start space-y-6 pt-8">
          {/* Profile Picture with AI Badge and Waveform */}
          <div className="relative">
            <div className="w-80 h-80 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
              <img
                src={selectedPersonaData?.image_url || '/placeholder.svg'}
                alt={selectedPersonaData?.alt_text || 'AI Interviewer'}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* End Session Button - Bottom left */}
            <button
              onClick={handleEndSession}
              className="absolute -bottom-2 -left-2 bg-red-600 hover:bg-red-500 rounded-full p-3 border-2 border-white/20 transition-colors"
              title="End Session"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Subtitles Toggle Button - Bottom right */}
            <button
              onClick={() => setShowSubtitles(!showSubtitles)}
              className={`absolute -bottom-2 -right-2 rounded-full p-3 border-2 border-white/20 transition-colors ${
                showSubtitles 
                  ? "bg-blue-600 hover:bg-blue-500" 
                  : "bg-gray-600 hover:bg-gray-500"
              }`}
              title={showSubtitles ? "Hide Subtitles" : "Show Subtitles"}
            >
              {showSubtitles ? (
                <Captions className="w-5 h-5 text-white" />
              ) : (
                <Type className="w-5 h-5 text-white" />
              )}
            </button>

            {/* Waveform - positioned in front of officer's picture at 25% height */}
            {isAiSpeaking && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-64 animate-fade-in">
                <Waveform 
                  isActive={true} 
                  className="h-16"
                />
              </div>
            )}
          </div>

          {/* Interviewer Name */}
          <div className="text-center">
            <h1 className="text-2xl font-semibold">
              {selectedPersonaData?.name || 'AI Interviewer'}
            </h1>
            {/* Personality/Mood */}
            {selectedPersonaData?.mood && (
              <p className="text-gray-300 text-sm mt-2">
                {selectedPersonaData.mood}
              </p>
            )}
            {/* Language indicator */}
            {language && (
              <p className="text-blue-300 text-xs mt-1">
                Speaking in {language.name}
              </p>
            )}
          </div>

          {/* Subtitles - Larger area with smaller font */}
          <div className="max-w-lg mx-auto h-24 flex items-center justify-center relative px-4">
            {showSubtitles && currentSubtitle && (
              <div className="flex items-center gap-2">
                <p className="text-center text-white/90 bg-black/30 px-4 py-3 rounded-lg backdrop-blur-sm animate-fade-in text-xs leading-relaxed">
                  {currentSubtitle}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Press to Talk Button - Bottom Middle */}
        <div className="flex flex-col items-center pb-8 relative">
          {/* Timer and Recording Indicator - Positioned absolutely to not affect button position */}
          {isRecording && (
            <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2">
              <div className="w-32 h-8 bg-black/30 rounded-lg backdrop-blur-sm overflow-hidden flex items-center justify-center">
                <Waveform 
                  isActive={true}
                  intensity={audioLevel}
                  className="h-full scale-y-75"
                />
              </div>
              <div className="bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
                <span className="text-white text-lg font-mono">
                  {formatTime(duration)}
                </span>
              </div>
            </div>
          )}
          
           {/* Press to Talk Button */}
          <div className="flex justify-center">
            <button
              onClick={isMobile ? undefined : handleMouseClick}
              onTouchStart={handleTouch}
              onTouchEnd={undefined}
              onTouchCancel={undefined}
              onContextMenu={(e) => e.preventDefault()}
              disabled={isProcessing}
              className={cn(
                "flex flex-col items-center gap-3 group select-none touch-none",
                "transition-all duration-200",
                isRecording && "scale-110"
              )}
            >
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg",
                isRecording 
                  ? "bg-red-600 hover:bg-red-500 shadow-red-500/50" 
                  : isProcessing 
                    ? "bg-yellow-600 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/30"
              )}>
                <Mic className="w-8 h-8 text-white" />
              </div>
              <span className="text-white text-sm font-medium">
                {isRecording ? "Press to stop" : isProcessing ? "Processing..." : "Press to talk"}
              </span>
            </button>
          </div>
        </div>
      </div>

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
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${feedbackData.clarity}%` }}
                      />
                    </div>
                    <span className="text-white font-medium w-8 text-right">{feedbackData.clarity}</span>
                  </div>
                </div>
                
                {/* Credibility */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Credibility</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${feedbackData.credibility}%` }}
                      />
                    </div>
                    <span className="text-white font-medium w-8 text-right">{feedbackData.credibility}</span>
                  </div>
                </div>
                
                {/* Case Strength */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Case Strength</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 transition-all duration-300"
                        style={{ width: `${feedbackData.caseStrength}%` }}
                      />
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
                {feedbackData.actionItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-300">
                    <span className="text-blue-400 mt-1">•</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => {
                  setShowFeedback(false);
                  navigate('/dashboard');
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Return to Dashboard
              </Button>
              <Button 
                onClick={() => {
                  setShowFeedback(false);
                  navigate('/dashboard'); // TODO: Navigate to session history when implemented
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
              >
                Session History
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
