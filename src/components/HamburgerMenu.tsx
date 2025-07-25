import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, User, MessageSquare, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HamburgerMenuProps {
  onHelpClick: () => void;
}

export function HamburgerMenu({ onHelpClick }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handlePastSessionsClick = () => {
    setIsOpen(false);
    navigate('/profile', { state: { scrollToFeedback: true } });
  };

  const handleHelpUsImproveClick = () => {
    setIsOpen(false);
    onHelpClick();
  };

  const handleMyProfileClick = () => {
    setIsOpen(false);
    navigate('/profile');
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Hamburger Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-300 hover:text-white hover:bg-gray-700/50 p-2"
        aria-label="Menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 z-50 animate-fade-in">
          <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-lg overflow-hidden">
            {/* Past Sessions Feedback */}
            <button
              onClick={handlePastSessionsClick}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Past Sessions Feedback</span>
            </button>

            {/* Help us improve */}
            <button
              onClick={handleHelpUsImproveClick}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
            >
              <Heart className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Help us improve this project 🙏🏼</span>
            </button>

            {/* My Profile */}
            <button
              onClick={handleMyProfileClick}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors border-t border-gray-600"
            >
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{t('navigation.profile')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}