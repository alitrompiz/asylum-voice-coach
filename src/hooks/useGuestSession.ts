import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GuestSessionData {
  guestToken: string;
  guestName: string;
  sessionSecondsUsed: number;
  sessionSecondsLimit: number;
  createdAt: string;
  expiresAt: string;
  languagePreference?: string;
  selectedTestStoryId?: string;
  storyText?: string;
  storyFirstName?: string;
  storyLastName?: string;
  storySource?: 'upload' | 'paste' | 'mock';
}

const STORAGE_KEY = 'guest_session';

export const useGuestSession = () => {
  const [guestData, setGuestData] = useState<GuestSessionData | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    console.log('[useGuestSession] Initializing guest session hook');
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      console.log('[useGuestSession] Stored session data:', stored ? 'Found' : 'Not found');
      
      if (stored) {
        try {
          const data = JSON.parse(stored) as GuestSessionData;
          // Check if expired
          if (new Date(data.expiresAt) > new Date()) {
            console.log('[useGuestSession] Valid guest session loaded:', data.guestName);
            setGuestData(data);
          } else {
            console.log('[useGuestSession] Guest session expired, removing');
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (parseError) {
          console.error('[useGuestSession] Failed to parse guest session:', parseError);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('[useGuestSession] localStorage access error:', error);
      // If localStorage is blocked/unavailable, continue without guest session
    }
  }, []);

  const createGuestSession = (name: string = 'Guest User') => {
    console.log('[useGuestSession] Creating new guest session for:', name);
    try {
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
      console.log('[useGuestSession] Guest session created successfully');
    } catch (error) {
      console.error('[useGuestSession] Failed to create guest session:', error);
      // Continue without guest session if localStorage fails
    }
  };

  const updateSessionTime = (secondsUsed: number) => {
    if (!guestData) return;
    
    try {
      const updated = { ...guestData, sessionSecondsUsed: secondsUsed };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setGuestData(updated);
    } catch (error) {
      console.error('[useGuestSession] Failed to update session time:', error);
    }
  };

  const setTestStory = (testStoryId: string) => {
    if (!guestData) return;
    
    try {
      const updated = { ...guestData, selectedTestStoryId: testStoryId };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setGuestData(updated);
    } catch (error) {
      console.error('[useGuestSession] Failed to set test story:', error);
    }
  };

  const setStoryData = async (
    storyText: string, 
    firstName: string, 
    lastName: string, 
    source: 'upload' | 'paste' | 'mock'
  ) => {
    if (!guestData) return;
    
    try {
      const updated = { 
        ...guestData, 
        storyText, 
        storyFirstName: firstName, 
        storyLastName: lastName,
        storySource: source 
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setGuestData(updated);
      console.log('[useGuestSession] Story data saved for guest');
      
      // Sync to database
      await syncToDatabase(updated);
    } catch (error) {
      console.error('[useGuestSession] Failed to set story data:', error);
    }
  };

  const setLanguagePreference = (languageCode: string) => {
    if (!guestData) return;
    
    try {
      const updated = { ...guestData, languagePreference: languageCode };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setGuestData(updated);
      console.log('[useGuestSession] Language preference updated to:', languageCode);
    } catch (error) {
      console.error('[useGuestSession] Failed to set language preference:', error);
    }
  };

  const syncToDatabase = async (data: Partial<GuestSessionData>) => {
    if (!guestData?.guestToken) return;

    try {
      const { error } = await supabase.functions.invoke('guest-session-sync', {
        body: {
          guestToken: guestData.guestToken,
          guestName: data.guestName || guestData.guestName,
          expiresAt: data.expiresAt || guestData.expiresAt,
          storySource: data.storySource || guestData.storySource,
          storyText: data.storyText || guestData.storyText,
          storyFirstName: data.storyFirstName || guestData.storyFirstName,
          storyLastName: data.storyLastName || guestData.storyLastName,
          selectedTestStoryId: data.selectedTestStoryId || guestData.selectedTestStoryId,
        }
      });

      if (error) {
        console.error('[useGuestSession] Failed to sync to database:', error);
      } else {
        console.log('[useGuestSession] Successfully synced to database');
      }
    } catch (error) {
      console.error('[useGuestSession] Database sync error:', error);
    }
  };

  const clearGuestSession = () => {
    console.log('[useGuestSession] Clearing guest session');
    try {
      localStorage.removeItem(STORAGE_KEY);
      setGuestData(null);
    } catch (error) {
      console.error('[useGuestSession] Failed to clear guest session:', error);
    }
  };

  const isValid = guestData && new Date(guestData.expiresAt) > new Date();

  return {
    guestData,
    isGuest: !!isValid,
    createGuestSession,
    updateSessionTime,
    setTestStory,
    setStoryData,
    setLanguagePreference,
    clearGuestSession,
    syncToDatabase,
    remainingSeconds: isValid 
      ? Math.max(0, guestData.sessionSecondsLimit - guestData.sessionSecondsUsed)
      : 0,
  };
};
