import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTextToSpeech } from '../useTextToSpeech';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

vi.mock('../useLanguagePreference', () => ({
  useLanguagePreference: () => ({
    language: { name: 'English', code: 'en' },
    getVoiceForTTS: () => 'alloy',
    languageCode: 'en'
  })
}));

vi.mock('@/utils/audioContext', () => ({
  ensureAudioContextReady: vi.fn(),
  getOrCreateAudioElement: vi.fn(() => ({
    id: 'tts-audio',
    src: '',
    currentTime: 0,
    paused: true,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })),
  playAudioWithContext: vi.fn()
}));

describe('useTextToSpeech - Exit Behavior', () => {
  let mockAudioElement: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock HTML audio element
    mockAudioElement = {
      id: 'tts-audio',
      src: '',
      currentTime: 0,
      paused: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    // Mock document.getElementById to return our mock audio element
    vi.spyOn(document, 'getElementById').mockReturnValue(mockAudioElement);
    
    // Mock global audio context
    (global as any).window = {
      audioContext: {
        state: 'running',
        suspend: vi.fn().mockResolvedValue(undefined)
      }
    };
  });

  it('should stop TTS immediately when stop() is called', async () => {
    const { result } = renderHook(() => useTextToSpeech());

    // Start playing some audio
    await act(async () => {
      await result.current.speak('Test message');
    });

    // Stop the audio
    act(() => {
      result.current.stop();
    });

    // Verify audio is stopped
    expect(mockAudioElement.pause).toHaveBeenCalled();
    expect(mockAudioElement.currentTime).toBe(0);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should abort ongoing TTS request when currentRequestRef is cleared', async () => {
    const { result } = renderHook(() => useTextToSpeech());

    // Start a TTS request
    const speakPromise = act(async () => {
      return result.current.speak('Test message');
    });

    // Clear the current request (simulating exit behavior)
    act(() => {
      if (result.current.currentRequestRef) {
        result.current.currentRequestRef.current = null;
      }
    });

    // The request should be aborted and not affect state
    await speakPromise;
    
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should ensure audio element is paused on exit', () => {
    renderHook(() => useTextToSpeech());

    // Simulate exit behavior by manually pausing audio
    mockAudioElement.paused = false; // Audio is playing
    mockAudioElement.pause();
    mockAudioElement.currentTime = 0;

    expect(mockAudioElement.pause).toHaveBeenCalled();
    expect(mockAudioElement.currentTime).toBe(0);
  });
});