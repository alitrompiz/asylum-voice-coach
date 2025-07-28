/**
 * Audio cues utility for providing audio feedback without asset files
 * Uses Web Audio API oscillator tones for iOS-safe user feedback
 */

export class AudioCues {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  constructor() {
    // Initialize within user gesture when first called
  }

  private async ensureAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    this.isInitialized = true;
    return this.audioContext;
  }

  private async playTone(frequency: number, duration: number, volume: number = 0.3): Promise<void> {
    try {
      const audioContext = await this.ensureAudioContext();
      
      // Create oscillator and gain nodes
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Connect the nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure the oscillator
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      
      // Configure the gain with fade in/out
      const fadeTime = 0.01; // 10ms fade
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + fadeTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration - fadeTime);
      
      // Start and stop the oscillator
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
      
      // Return promise that resolves when the tone is done
      return new Promise(resolve => {
        oscillator.onended = () => resolve();
      });
    } catch (error) {
      console.warn('Audio cue failed:', error);
      // Silently fail - don't block the UI if audio fails
    }
  }

  /**
   * Play confirmation beep when recording starts
   */
  async playStartRecording(): Promise<void> {
    return this.playTone(880, 0.12, 0.2); // 880 Hz for 120ms
  }

  /**
   * Play confirmation beep when recording stops
   */
  async playStopRecording(): Promise<void> {
    return this.playTone(587, 0.14, 0.2); // 587 Hz for 140ms (lower tone)
  }

  /**
   * Play soft click for tap acknowledgment
   */
  async playTapConfirm(): Promise<void> {
    return this.playTone(1200, 0.05, 0.1); // Brief high tone
  }

  /**
   * Check if audio cues are available
   */
  canPlayAudioCues(): boolean {
    return 'AudioContext' in window || 'webkitAudioContext' in window;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.isInitialized = false;
    }
  }
}

// Create singleton instance
export const audioCues = new AudioCues();