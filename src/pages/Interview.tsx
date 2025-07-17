import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MessageSquare, Mic, X, Pause, Play, Send, MicOff } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import { usePersonas } from '@/hooks/usePersonas';
import { Waveform } from '@/components/Waveform';
import { cn } from '@/lib/utils';

export default function Interview() {
  const [isAiSpeaking, setIsAiSpeaking] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const navigate = useNavigate();
  
  const { selectedPersona } = usePersonaStore();
  const { personas } = usePersonas();
  
  const selectedPersonaData = personas.find(p => p.id === selectedPersona);

  // Demo subtitle simulation
  useEffect(() => {
    if (isAiSpeaking && showSubtitles && !isPaused) {
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
  }, [isAiSpeaking, showSubtitles, isPaused]);

  const handlePressToTalk = () => {
    // Here you would implement press to talk functionality
    console.log('Press to talk activated');
  };

  const handleEndSession = () => {
    setIsAiSpeaking(false);
    setShowFeedback(true);
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
        {/* End Session Button - Top Left */}
        <div className="absolute top-6 left-6 z-20">
          <button
            onClick={handleEndSession}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
            <span className="text-white text-sm font-medium">End Session</span>
          </button>
        </div>

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
          {/* Profile Picture with AI Badge and Waveform */}
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

            {/* Waveform - positioned in front of officer's picture at 25% height */}
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-80">
              <Waveform 
                isActive={isAiSpeaking && !isPaused} 
                className="h-16"
              />
            </div>
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
          </div>

          {/* Subtitles */}
          <div className="max-w-md mx-auto h-16 flex items-center justify-center">
            {showSubtitles && currentSubtitle && (
              <p className="text-center text-white/90 bg-black/30 px-4 py-2 rounded-lg backdrop-blur-sm">
                {currentSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Press to Talk Button - Bottom Middle */}
        <div className="flex justify-center pb-8">
          <button
            onClick={handlePressToTalk}
            className="flex flex-col items-center gap-3 group"
          >
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center group-hover:bg-blue-500 transition-colors shadow-lg">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <span className="text-white text-sm font-medium">Press to talk</span>
          </button>
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