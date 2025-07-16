import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useVoiceInterview } from '../useVoiceInterview';
import { useMinutesStore } from '@/stores/minutesStore';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/tracking';

// Mock dependencies
vi.mock('@/stores/minutesStore', () => ({
  useMinutesStore: vi.fn()
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn()
}));

// Mock Web APIs
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstop: null
};

const mockStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }])
};

const mockAudio = {
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  src: '',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// Setup global mocks
beforeEach(() => {
  vi.clearAllMocks();
  
  // Mock MediaRecorder
  const MockMediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder) as any;
  MockMediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true);
  (global as any).MediaRecorder = MockMediaRecorder;
  
  // Mock getUserMedia
  const mockNavigator = {
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue(mockStream)
    }
  };
  Object.defineProperty(global, 'navigator', {
    value: mockNavigator,
    writable: true
  });
  
  // Mock Audio
  (global as any).Audio = vi.fn().mockImplementation(() => mockAudio);
  
  // Mock FileReader
  const MockFileReader = vi.fn().mockImplementation(() => ({
    readAsDataURL: vi.fn(function(this: any) {
      this.onloadend();
    }),
    result: 'data:audio/webm;base64,mockbase64data'
  })) as any;
  MockFileReader.EMPTY = 0;
  MockFileReader.LOADING = 1;
  MockFileReader.DONE = 2;
  (global as any).FileReader = MockFileReader;
  
  // Mock Blob
  (global as any).Blob = vi.fn().mockImplementation((chunks, options) => ({
    size: chunks.length > 0 ? 1000 : 0,
    type: options?.type || 'audio/webm'
  }));
  
  // Mock minutes store
  const mockMinutesStore = {
    currentMinutes: 30,
    decrementMinutes: vi.fn(),
    fetchMinutesBalance: vi.fn().mockResolvedValue(undefined)
  };
  (useMinutesStore as any).mockReturnValue(mockMinutesStore);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('useVoiceInterview', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useVoiceInterview());
    
    expect(result.current.isRecording).toBe(false);
    expect(result.current.subtitlesText).toBe('');
    expect(result.current.messages).toEqual([]);
    expect(result.current.minutesRemaining).toBe(30);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.subtitlesEnabled).toBe(true);
  });
  
  it('should start interview and track event', async () => {
    const mockAiResponse = {
      text: 'Hello, I am your interview officer. Please tell me about yourself.',
      usage: { total_tokens: 50 }
    };
    
    const mockSpeechResponse = {
      audioContent: 'base64audiodata',
      contentType: 'audio/mpeg'
    };
    
    (supabase.functions.invoke as any)
      .mockResolvedValueOnce({ data: mockAiResponse, error: null })
      .mockResolvedValueOnce({ data: mockSpeechResponse, error: null });
    
    const { result } = renderHook(() => useVoiceInterview({
      personaId: 'professional',
      language: 'en',
      skills: ['communication']
    }));
    
    await act(async () => {
      await result.current.startInterview();
    });
    
    expect(trackEvent).toHaveBeenCalledWith('interview_start', expect.objectContaining({
      personaId: 'professional',
      language: 'en',
      skills: ['communication'],
      minutesRemaining: 30
    }));
    
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toEqual({
      role: 'assistant',
      text: mockAiResponse.text,
      ts: expect.any(Number)
    });
  });
  
  it('should process audio and get AI response', async () => {
    const mockWhisperResponse = {
      text: 'This is my story about persecution',
      confidence: 0.95
    };
    
    const mockAiResponse = {
      text: 'Thank you for sharing. Can you tell me more about the specific incidents?',
      usage: { total_tokens: 75 }
    };
    
    const mockSpeechResponse = {
      audioContent: 'base64audiodata',
      contentType: 'audio/mpeg'
    };
    
    (supabase.functions.invoke as any)
      .mockResolvedValueOnce({ data: mockAiResponse, error: null }) // Initial AI greeting
      .mockResolvedValueOnce({ data: mockSpeechResponse, error: null }) // Initial speech
      .mockResolvedValueOnce({ data: mockWhisperResponse, error: null }) // Whisper transcription
      .mockResolvedValueOnce({ data: mockAiResponse, error: null }) // AI response
      .mockResolvedValueOnce({ data: mockSpeechResponse, error: null }); // Speech synthesis
    
    const { result } = renderHook(() => useVoiceInterview());
    
    await act(async () => {
      await result.current.startInterview();
    });
    
    expect(supabase.functions.invoke).toHaveBeenCalledWith('voice-to-text', {
      body: {
        audio: expect.any(String),
        language: 'en'
      }
    });
  });
  
  it('should toggle subtitles', () => {
    const { result } = renderHook(() => useVoiceInterview());
    
    expect(result.current.subtitlesEnabled).toBe(true);
    
    act(() => {
      result.current.toggleSubtitles();
    });
    
    expect(result.current.subtitlesEnabled).toBe(false);
    expect(result.current.subtitlesText).toBe('');
  });
  
  it('should pause interview', () => {
    vi.useFakeTimers();
    
    const { result } = renderHook(() => useVoiceInterview());
    
    act(() => {
      result.current.pause();
    });
    
    expect(result.current.isRecording).toBe(false);
    
    vi.useRealTimers();
  });
  
  it('should end interview and track event', () => {
    const { result } = renderHook(() => useVoiceInterview({
      personaId: 'professional',
      language: 'en',
      skills: ['communication']
    }));
    
    act(() => {
      result.current.end();
    });
    
    expect(trackEvent).toHaveBeenCalledWith('interview_end', expect.objectContaining({
      personaId: 'professional',
      language: 'en',
      skills: ['communication'],
      minutesRemaining: 30,
      messageCount: 0
    }));
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.subtitlesText).toBe('');
  });
  
  it('should handle zero minutes and call onZeroMinutes', () => {
    const onZeroMinutesMock = vi.fn();
    
    const mockMinutesStore = {
      currentMinutes: 0,
      decrementMinutes: vi.fn(),
      fetchMinutesBalance: vi.fn().mockResolvedValue(undefined)
    };
    (useMinutesStore as any).mockReturnValue(mockMinutesStore);
    
    renderHook(() => useVoiceInterview({
      onZeroMinutes: onZeroMinutesMock
    }));
    
    expect(onZeroMinutesMock).toHaveBeenCalled();
  });
  
  it('should handle API errors gracefully', async () => {
    const errorMessage = 'API Error';
    (supabase.functions.invoke as any).mockRejectedValueOnce(new Error(errorMessage));
    
    const { result } = renderHook(() => useVoiceInterview());
    
    await act(async () => {
      await result.current.startInterview();
    });
    
    expect(result.current.error).toBe(errorMessage);
  });
  
  it('should decrement minutes over time', async () => {
    vi.useFakeTimers();
    
    const decrementMinutesMock = vi.fn();
    const mockMinutesStore = {
      currentMinutes: 30,
      decrementMinutes: decrementMinutesMock,
      fetchMinutesBalance: vi.fn().mockResolvedValue(undefined)
    };
    (useMinutesStore as any).mockReturnValue(mockMinutesStore);
    
    (supabase.functions.invoke as any)
      .mockResolvedValueOnce({ data: { text: 'Hello' }, error: null })
      .mockResolvedValueOnce({ data: { audioContent: 'base64' }, error: null });
    
    const { result } = renderHook(() => useVoiceInterview());
    
    await act(async () => {
      await result.current.startInterview();
    });
    
    // Fast-forward 1 minute
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    
    expect(decrementMinutesMock).toHaveBeenCalled();
    
    vi.useRealTimers();
  });
  
  it('should handle getUserMedia errors', async () => {
    const mockNavigator = {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied'))
      }
    };
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    });
    
    const { result } = renderHook(() => useVoiceInterview());
    
    await act(async () => {
      await result.current.startInterview();
    });
    
    expect(result.current.error).toBe('Permission denied');
  });
  
  it('should start and stop recording', async () => {
    const { result } = renderHook(() => useVoiceInterview());
    
    await act(async () => {
      await result.current.startInterview();
    });
    
    act(() => {
      result.current.stopRecording();
    });
    
    expect(result.current.isRecording).toBe(false);
  });
});