import { useState, useEffect } from 'react';

interface GuestSessionData {
  guestToken: string;
  guestName: string;
  sessionSecondsUsed: number;
  sessionSecondsLimit: number;
  createdAt: string;
  expiresAt: string;
  selectedTestStoryId?: string;
}

const STORAGE_KEY = 'guest_session';

export const useGuestSession = () => {
  const [guestData, setGuestData] = useState<GuestSessionData | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as GuestSessionData;
        // Check if expired
        if (new Date(data.expiresAt) > new Date()) {
          setGuestData(data);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.error('Failed to parse guest session:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const createGuestSession = (name: string = 'Guest User') => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    
    const sessionData: GuestSessionData = {
      guestToken: crypto.randomUUID(),
      guestName: name,
      sessionSecondsUsed: 0,
      sessionSecondsLimit: 1800, // 30 minutes
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    setGuestData(sessionData);
  };

  const updateSessionTime = (secondsUsed: number) => {
    if (!guestData) return;
    
    const updated = { ...guestData, sessionSecondsUsed: secondsUsed };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setGuestData(updated);
  };

  const setTestStory = (testStoryId: string) => {
    if (!guestData) return;
    
    const updated = { ...guestData, selectedTestStoryId: testStoryId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setGuestData(updated);
  };

  const clearGuestSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setGuestData(null);
  };

  const isValid = guestData && new Date(guestData.expiresAt) > new Date();

  return {
    guestData,
    isGuest: !!isValid,
    createGuestSession,
    updateSessionTime,
    setTestStory,
    clearGuestSession,
    remainingSeconds: isValid 
      ? Math.max(0, guestData.sessionSecondsLimit - guestData.sessionSecondsUsed)
      : 0,
  };
};
