import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Mic, Clock, FileText, User, Play } from 'lucide-react';

export default function Dashboard() {
  const [minutesRemaining] = useState(25); // Mock data
  const [totalMinutes] = useState(25); // Mock data
  const navigate = useNavigate();

  const handleStartInterview = () => {
    navigate('/interview');
  };

  const usageProgress = ((totalMinutes - minutesRemaining) / totalMinutes) * 100;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Interview Practice Dashboard</h1>
          <p className="text-muted-foreground">
            Prepare for your asylum interview with AI-powered practice sessions
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Minutes Meter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Practice Minutes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{minutesRemaining}</div>
              <p className="text-sm text-muted-foreground mb-4">minutes remaining</p>
              <Progress value={usageProgress} className="mb-4" />
              <Button variant="outline" size="sm" className="w-full">
                Buy More Minutes
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Upload Story
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <User className="w-4 h-4 mr-2" />
                Select Persona
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Mic className="w-4 h-4 mr-2" />
                Voice Settings
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Practice Session</span>
                  <Badge variant="secondary">15 min</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Story Upload</span>
                  <Badge variant="secondary">2 days ago</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Account Created</span>
                  <Badge variant="secondary">1 week ago</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Start Interview */}
        <Card>
          <CardHeader>
            <CardTitle>Ready to Practice?</CardTitle>
            <CardDescription>
              Start an AI-powered interview practice session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button size="lg" onClick={handleStartInterview}>
                <Play className="w-5 h-5 mr-2" />
                Start Interview
              </Button>
              <p className="text-sm text-muted-foreground">
                This will use your practice minutes
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}