import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Play } from 'lucide-react';
import { UserScoreCard } from '@/components/UserScoreCard';
import { PersonaCarousel } from '@/components/PersonaCarousel';

export default function Dashboard() {
  const navigate = useNavigate();

  const handleStartInterview = () => {
    navigate('/interview');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Interview Practice Dashboard</h1>
            <p className="text-muted-foreground">
              Prepare for your asylum interview with AI-powered practice sessions
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/profile')}>
            <User className="w-4 h-4 mr-2" />
            Profile
          </Button>
        </header>

        <div className="mb-8">
          <UserScoreCard />
        </div>

        <div className="mb-8">
          <PersonaCarousel />
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