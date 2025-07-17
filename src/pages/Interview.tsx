import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Volume2, X, Pause, Play } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import { usePersonas } from '@/hooks/usePersonas';
import { Waveform } from '@/components/Waveform';
import { cn } from '@/lib/utils';

export default function Interview() {
  const [isAiSpeaking, setIsAiSpeaking] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();
  
  const { selectedPersona } = usePersonaStore();
  const { personas } = usePersonas();
  
  const selectedPersonaData = personas.find(p => p.id === selectedPersona);

  // Demo subtitle simulation
  useEffect(() => {
    if (isAiSpeaking && showSubtitles) {
      const subtitles = [
        "Hello, I'm here to help you practice for your asylum interview.",
        "Let's begin with some basic questions about your background.",
        "Can you tell me your name and where you're from?",
        "Take your time to think about your response."
      ];
      
      let currentIndex = 0;
      const interval = setInterval(() => {
        setCurrentSubtitle(subtitles[currentIndex]);
        currentIndex = (currentIndex + 1) % subtitles.length;
      }, 3000);
      
      return () => clearInterval(interval);
    } else {
      setCurrentSubtitle('');
    }
  }, [isAiSpeaking, showSubtitles]);

  const handleInterrupt = () => {
    setIsAiSpeaking(false);
    // Here you would implement the logic to interrupt the AI
  };

  const handleSwitchToText = () => {
    // Navigate to text-based interview or toggle mode
    navigate('/interview?mode=text');
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleEndCall = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-blue-900/20" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen p-6">
        {/* App Name */}
        <div className="text-center pt-4 mb-2">
          <h1 className="text-white text-base font-medium">Asylum Prep</h1>
        </div>
        
        {/* Header Warning */}
        <div className="text-center mb-8">
          <p className="text-gray-300 text-sm">
            This is not legal advice
          </p>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
          {/* Profile Picture with AI Badge */}
          <div className="relative">
            <div className="w-96 h-96 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
              <img
                src={selectedPersonaData?.image_url || '/placeholder.svg'}
                alt={selectedPersonaData?.alt_text || 'AI Interviewer'}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* AI Badge */}
            <div className="absolute -bottom-2 -right-2 bg-gray-800 rounded-full p-2 border-2 border-white/20">
              <Badge className="bg-gray-700 text-white text-xs px-2 py-1">
                AI ✨
              </Badge>
            </div>
          </div>

          {/* Interviewer Name */}
          <h1 className="text-2xl font-semibold text-center">
            {selectedPersonaData?.name || 'AI Interviewer'}
          </h1>

          {/* Speak to Interrupt Button */}
          <Button
            onClick={handleInterrupt}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 px-8 py-3 rounded-full"
          >
            Speak to interrupt
          </Button>

          {/* Subtitles */}
          {showSubtitles && currentSubtitle && (
            <div className="max-w-md mx-auto">
              <p className="text-center text-white/90 bg-black/30 px-4 py-2 rounded-lg backdrop-blur-sm">
                {currentSubtitle}
              </p>
            </div>
          )}
        </div>

        {/* Waveform Animation */}
        <div className="mb-8">
          <Waveform 
            isActive={isAiSpeaking} 
            className="h-20"
          />
        </div>

        {/* Bottom Controls */}
        <div className="flex justify-center items-center gap-8 pb-8">
          {/* Switch to Text */}
          <button
            onClick={handleSwitchToText}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center group-hover:bg-gray-600 transition-colors">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-sm">Switch to Text</span>
          </button>

          {/* Mute */}
          <button
            onClick={handleToggleMute}
            className="flex flex-col items-center gap-2 group"
          >
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
              isMuted ? "bg-yellow-600 hover:bg-yellow-500" : "bg-gray-700 hover:bg-gray-600"
            )}>
              <Volume2 className={cn(
                "w-6 h-6",
                isMuted ? "text-white" : "text-white"
              )} />
            </div>
            <span className="text-white text-sm">Mute</span>
          </button>

          {/* Pause */}
          <button
            onClick={handleTogglePause}
            className="flex flex-col items-center gap-2 group"
          >
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
              isPaused ? "bg-green-600 hover:bg-green-500" : "bg-gray-700 hover:bg-gray-600"
            )}>
              {isPaused ? <Play className="w-6 h-6 text-white" /> : <Pause className="w-6 h-6 text-white" />}
            </div>
            <span className="text-white text-sm">{isPaused ? "Resume" : "Pause"}</span>
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center group-hover:bg-red-500 transition-colors">
              <X className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-sm">End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}