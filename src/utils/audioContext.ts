// Global AudioContext management for mobile browser compatibility
declare global {
  interface Window {
    audioContext?: AudioContext;
  }
}

export async function ensureAudioContextReady(): Promise<void> {
  try {
    // Create global AudioContext if it doesn't exist
    if (!window.audioContext) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        window.audioContext = new AudioContext();
        console.log('🔊 Global AudioContext created');
      }
    }

    // Resume AudioContext if suspended
    if (window.audioContext && window.audioContext.state === 'suspended') {
      await window.audioContext.resume();
      console.log('🔊 AudioContext resumed');
      
      // Play silent audio to ensure audio system is unlocked (especially for iOS)
      const buffer = window.audioContext.createBuffer(1, 1, 22050);
      const source = window.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(window.audioContext.destination);
      source.start(0);
      console.log('🔇 Silent audio played to unlock audio system');
    }
  } catch (error) {
    console.error('❌ Error ensuring AudioContext ready:', error);
  }
}

export function getOrCreateAudioElement(): HTMLAudioElement {
  let audio = document.getElementById('tts-audio') as HTMLAudioElement;
  
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'tts-audio';
    audio.preload = 'auto';
    audio.volume = 1.0;
    audio.muted = false;
    document.body.appendChild(audio);
    console.log('🔊 Created persistent audio element');
  }
  
  return audio;
}

export async function playAudioWithContext(audioSrc: string): Promise<void> {
  await ensureAudioContextReady();
  
  const audio = getOrCreateAudioElement();
  audio.src = audioSrc;
  
  return new Promise((resolve, reject) => {
    const handleEnded = () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      resolve();
    };
    
    const handleError = (e: any) => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      reject(new Error(`Audio playback failed: ${e.message || 'Unknown error'}`));
    };
    
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    audio.play().catch(reject);
  });
}