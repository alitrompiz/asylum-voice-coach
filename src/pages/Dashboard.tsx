import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, Shield } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserScoreCard } from '@/components/UserScoreCard';
import { PersonaCarousel } from '@/components/PersonaCarousel';
import { LanguageSelector } from '@/components/LanguageSelector';
import { SkillsScroller } from '@/components/SkillsScroller';
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { StoryCard } from '@/components/dashboard/StoryCard';
import { SubscriptionCard } from '@/components/dashboard/SubscriptionCard';
import { useSkillsStore } from '@/stores/personaStore';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ensureAudioContextReady } from '@/utils/audioContext';
import { GeneralFeedbackModal } from '@/components/GeneralFeedbackModal';
export default function Dashboard() {
  const navigate = useNavigate();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const {
    t
  } = useTranslation();
  const {
    skillsSelected
  } = useSkillsStore();
  const {
    isAdmin,
    loading,
    error
  } = useAdminAccess();

  // Clean up old localStorage admin code on component mount
  useEffect(() => {
    localStorage.removeItem('isAdminUnlocked');
  }, []);

  // Debug logging to help identify the issue
  useEffect(() => {
    console.log('Admin access status:', {
      isAdmin,
      loading,
      error
    });
  }, [isAdmin, loading, error]);

  // Handle Start Interview button click and initialize AudioContext for mobile browsers
  const handleStartInterview = async () => {
    try {
      // Initialize global AudioContext with user gesture
      await ensureAudioContextReady();
      console.log('✅ AudioContext initialized from Start Interview button');
    } catch (error) {
      console.warn('⚠️ Could not initialize AudioContext:', error);
    }

    // Navigate to interview
    navigate('/interview');
  };
  const handleAdminPanel = () => {
    navigate('/admin');
  };
  return <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-2 pb-16 md:pb-2">
      {/* Dark gradient overlay for visual consistency */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20 pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1 text-white">{t('app.name')}</h1>
            <p className="text-gray-300 text-sm">
              {t('app.tagline')}
            </p>
          </div>
          <HamburgerMenu onHelpClick={() => setShowFeedbackModal(true)} />
        </header>

        {/* New Dashboard Cards - Side by side layout */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StoryCard />
          <SubscriptionCard />
        </div>

        <div className="mb-3">
          <PersonaCarousel />
        </div>

        <div className="mb-3 -mt-2">
          <SkillsScroller />
        </div>
      </div>

      {/* Fixed Start Interview Button */}
      <div className="fixed bottom-2 left-2 right-2 md:relative md:bottom-auto md:left-auto md:right-auto md:max-w-6xl md:mx-auto">
        <Button size="lg" onClick={handleStartInterview} className="w-full shadow-lg bg-primary hover:bg-primary/90" disabled={skillsSelected.length === 0}>
          <Play className="w-5 h-5 mr-2" />
          {t('interview.start')}
          {skillsSelected.length > 0 && <span className="ml-2 text-xs">({t('interview.areas_count', {
            count: skillsSelected.length
          })})</span>}
        </Button>
        {skillsSelected.length === 0 && <p className="text-sm text-gray-400 text-center mt-1">
            {t('interview.select_areas')}
          </p>}
      </div>

      {/* Admin Panel Button - Fixed position bottom right */}
      {!loading && isAdmin && <div className="fixed bottom-14 right-2 md:bottom-2 md:right-2 z-50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleAdminPanel} className="w-11 h-11 rounded-full shadow-lg border-2 border-gray-600 bg-gray-800/50 text-white hover:bg-gray-700">
                <Shield className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('navigation.admin_panel')}</p>
            </TooltipContent>
          </Tooltip>
        </div>}

      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development'}

      {/* General Feedback Modal */}
      <GeneralFeedbackModal 
        open={showFeedbackModal}
        onOpenChange={setShowFeedbackModal}
      />
    </div>;
}