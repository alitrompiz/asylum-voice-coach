
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
  const { speak, stop: stopTTS, isPlaying: isTTSPlaying, isLoading: isTTSLoading } = useTextToSpeech();
  
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
    console.log('TTS Effect triggered:', {
      currentSubtitle: currentSubtitle?.substring(0, 50) + '...',
      selectedPersonaData: !!selectedPersonaData,
      tts_voice: selectedPersonaData?.tts_voice,
      isProcessing,
      isTTSPlaying,
      languageCode,
      lastSpoken: lastSpokenSubtitle.current?.substring(0, 50) + '...'
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
      
      console.log('Starting TTS for NEW content:', currentSubtitle.substring(0, 50) + '...');
      lastSpokenSubtitle.current = currentSubtitle;
      
      // Get the appropriate voice for the user's selected language
      const voiceToUse = selectedPersonaData.tts_voice;
      
      speak(currentSubtitle, {
        voice: voiceToUse,
        onStart: () => {
          console.log('TTS started');
          setIsAiSpeaking(true);
        },
        onEnd: () => {
          console.log('TTS ended');
          setIsAiSpeaking(false);
        },
        onError: (error) => {
          console.error('TTS error:', error);
          setIsAiSpeaking(false);
        }
      });
    } else if (currentSubtitle === lastSpokenSubtitle.current) {
      console.log('Skipping TTS - same content as last spoken');
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
    
    // Initialize audio context on iOS Safari (required for audio playback)
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('Audio context resumed for iOS Safari');
      }
    } catch (error) {
      console.warn('Could not initialize audio context:', error);
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
      
      speak(currentSubtitle, {
        voice: selectedPersonaData.tts_voice,
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
        {/* Top Controls - Empty for now */}
        <div className="absolute top-6 left-6 z-20 flex gap-4">
          {/* Top controls removed - buttons moved to officer photo area */}
        </div>

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
