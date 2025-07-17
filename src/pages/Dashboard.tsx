
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
  const { isAdmin, loading, error } = useAdminAccess();

  // Clean up old localStorage admin code on component mount
  useEffect(() => {
    localStorage.removeItem('isAdminUnlocked');
  }, []);

  // Debug logging to help identify the issue
  useEffect(() => {
    console.log('Admin access status:', { isAdmin, loading, error });
  }, [isAdmin, loading, error]);

  const handleStartInterview = () => {
    navigate('/interview');
  };

  const handleAdminPanel = () => {
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-background p-2 pb-16 md:pb-2">
      <div className="max-w-6xl mx-auto">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">AsylumPrep</h1>
            <p className="text-muted-foreground text-sm">
              Speak your truth — with confidence
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
          </div>
        </header>

        <div className="mb-3">
          <UserScoreCard />
        </div>

        <div className="mb-3">
          <PersonaCarousel />
        </div>

        <div className="mb-3">
          <SkillsScroller />
        </div>
      </div>

      {/* Fixed Start Interview Button */}
      <div className="fixed bottom-2 left-2 right-2 md:relative md:bottom-auto md:left-auto md:right-auto md:max-w-6xl md:mx-auto">
        <Button 
          size="lg" 
          onClick={handleStartInterview}
          className="w-full shadow-lg"
          disabled={skillsSelected.length === 0}
        >
          <Play className="w-5 h-5 mr-2" />
          Start Interview
          {skillsSelected.length > 0 && (
            <span className="ml-2 text-xs">({skillsSelected.length} areas)</span>
          )}
        </Button>
        {skillsSelected.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-1">
            Select at least one area of focus to begin
          </p>
        )}
      </div>

      {/* Admin Panel Button - Fixed position bottom right */}
      {!loading && isAdmin && (
        <div className="fixed bottom-14 right-2 md:bottom-2 md:right-2 z-50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleAdminPanel}
                className="w-11 h-11 rounded-full shadow-lg border-2"
              >
                <Shield className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Admin Panel</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-black/80 text-white p-2 rounded text-xs">
          Admin: {loading ? 'Loading...' : isAdmin ? 'Yes' : 'No'}
          {error && <div className="text-red-400">Error: {error}</div>}
        </div>
      )}
    </div>
  );
}
