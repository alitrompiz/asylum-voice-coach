import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useTextToSpeech } from '../useTextToSpeech';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { audioContent: 'base64audio' },
        error: null
      })
    }
  }
}));

// Mock useLanguagePreference
vi.mock('../useLanguagePreference', () => ({
  useLanguagePreference: () => ({
    language: { name: 'English', code: 'en', primaryTTS: 'openai' },
    languageCode: 'en',
    getVoiceForTTS: () => 'alloy'
  })
}));

// Mock Audio
global.Audio = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  crossOrigin: '',
  preload: '',
  autoplay: false,
  volume: 1,
  currentTime: 0
}));

// Mock AudioContext
const mockAudioContext = {
  state: 'suspended',
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
  createMediaStreamSource: vi.fn().mockReturnValue({
    connect: vi.fn()
  }),
  createAnalyser: vi.fn().mockReturnValue({
    fftSize: 0,
    smoothingTimeConstant: 0,
    getByteFrequencyData: vi.fn()
  }),
  destination: {}
};

const originalAudioContext = window.AudioContext;
const originalCreateElement = document.createElement;

describe('useTextToSpeech', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock AudioContext constructor
    window.AudioContext = vi.fn().mockImplementation(() => mockAudioContext);
    (window as any).webkitAudioContext = vi.fn().mockImplementation(() => mockAudioContext);
    
    // Mock navigator.userAgent for iOS detection
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
      configurable: true
    });

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn()
      },
      writable: true
    });

    // Mock document.createElement for audio element creation
    document.createElement = vi.fn().mockImplementation((tag) => {
      if (tag === 'audio') {
        return {
          play: vi.fn().mockResolvedValue(undefined),
          autoplay: false
        };
      }
      return originalCreateElement.call(document, tag);
    });
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    document.createElement = originalCreateElement;
  });

  it('initializes AudioContext for iOS if not previously initialized', async () => {
    // Mock sessionStorage to indicate AudioContext is not initialized
    (window.sessionStorage.getItem as any).mockReturnValue(null);

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.speak('Hello world', {
        onStart: vi.fn(),
        onEnd: vi.fn(),
        onError: vi.fn()
      });
    });

    // Should attempt to create and resume AudioContext
    expect(window.AudioContext).toHaveBeenCalled();
    expect(mockAudioContext.resume).toHaveBeenCalled();
  });

  it('uses pre-initialized AudioContext from Start Interview button if available', async () => {
    // Mock sessionStorage to indicate AudioContext is already initialized
    (window.sessionStorage.getItem as any).mockReturnValue('true');

    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.speak('Hello world', {
        onStart: vi.fn(),
        onEnd: vi.fn(),
        onError: vi.fn()
      });
    });

    // Should NOT attempt to create a new AudioContext
    expect(window.AudioContext).not.toHaveBeenCalled();
    expect(mockAudioContext.resume).not.toHaveBeenCalled();
  });

  it('creates audio element with iOS optimizations when on iOS device', async () => {
    const { result } = renderHook(() => useTextToSpeech());

    await act(async () => {
      await result.current.speak('Hello world');
    });

    // Check that Audio was created with the right parameters
    expect(Audio).toHaveBeenCalledWith('data:audio/mpeg;base64,base64audio');
    
    // Check that play was called on the audio element
    const audioInstance = (Audio as any).mock.results[0].value;
    expect(audioInstance.play).toHaveBeenCalled();
  });
});