import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mic, MicOff, Pause, Square, Volume2 } from 'lucide-react';

export default function Interview() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const navigate = useNavigate();

  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleEnd = () => {
    navigate('/dashboard');
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Interview Practice</h1>
            <p className="text-muted-foreground">
              Practice your asylum interview with AI guidance
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline">{formatTime(timeElapsed)}</Badge>
            <Badge variant="secondary">25 min remaining</Badge>
          </div>
        </div>

        {/* Main Interview Interface */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              AI Interviewer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* AI Response */}
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">AI Interviewer:</p>
                <p>
                  Hello, I'm here to help you practice for your asylum interview. 
                  Let's begin with some basic questions about your background. 
                  Can you tell me your name and where you're from?
                </p>
              </div>

              {/* Subtitles Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="subtitles"
                  checked={showSubtitles}
                  onCheckedChange={setShowSubtitles}
                />
                <Label htmlFor="subtitles">Show subtitles</Label>
              </div>

              {/* User Response Area */}
              {showSubtitles && (
                <div className="bg-primary/10 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Your Response:</p>
                  <p className="text-muted-foreground">
                    {isRecording ? 'Listening...' : 'Click the microphone to respond'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                onClick={handleToggleRecording}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-5 h-5 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 mr-2" />
                    Start Recording
                  </>
                )}
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                onClick={handlePause}
                disabled={!isRecording}
              >
                <Pause className="w-5 h-5 mr-2" />
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                onClick={handleEnd}
              >
                <Square className="w-5 h-5 mr-2" />
                End Interview
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Waveform Visualization Placeholder */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Audio Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-20 bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Audio waveform will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}