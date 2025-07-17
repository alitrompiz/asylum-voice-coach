
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, Play, Shield } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserScoreCard } from '@/components/UserScoreCard';
import { PersonaCarousel } from '@/components/PersonaCarousel';
import { SkillsScroller } from '@/components/SkillsScroller';
import { useSkillsStore } from '@/stores/personaStore';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useEffect } from 'react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { skillsSelected } = useSkillsStore();
  const { isAdmin } = useAdminAccess();

  // Clean up old localStorage admin code on component mount
  useEffect(() => {
    localStorage.removeItem('isAdminUnlocked');
  }, []);

  const handleStartInterview = () => {
    navigate('/interview');
  };

  const handleAdminPanel = () => {
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24 md:pb-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Interview Practice Dashboard</h1>
            <p className="text-muted-foreground">
              Prepare for your asylum interview with AI-powered practice sessions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/profile')}>
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleAdminPanel}>
                    <Shield className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Admin Panel</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </header>

        <div className="mb-8">
          <UserScoreCard />
        </div>

        <div className="mb-8">
          <PersonaCarousel />
        </div>

        <div className="mb-8">
          <SkillsScroller />
        </div>
      </div>

      {/* Fixed Start Interview Button */}
      <div className="fixed bottom-4 left-4 right-4 md:relative md:bottom-auto md:left-auto md:right-auto md:max-w-6xl md:mx-auto">
        <Button 
          size="lg" 
          onClick={handleStartInterview}
          className="w-full"
          disabled={skillsSelected.length === 0}
        >
          <Play className="w-5 h-5 mr-2" />
          Start Interview
          {skillsSelected.length > 0 && (
            <span className="ml-2 text-xs">({skillsSelected.length} skills)</span>
          )}
        </Button>
        {skillsSelected.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            Select at least one skill to begin
          </p>
        )}
      </div>
    </div>
  );
}
