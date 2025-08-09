// Small audio format helpers (no UI changes)
// Prefer Opus (Ogg/WebM) when available, fallback to WAV

export function canPlayAudioType(mime: string): boolean {
  try {
    const audio = document.createElement('audio');
    // canPlayType returns '', 'maybe', or 'probably'
    const res = (audio as any).canPlayType?.(mime) || '';
    return res === 'probably' || res === 'maybe';
  } catch {
    return false;
  }
}

export function getPreferredOpusMime(): string | null {
  const candidates = ['audio/ogg; codecs=opus', 'audio/webm; codecs=opus'];
  for (const m of candidates) {
    if (canPlayAudioType(m)) return m;
  }
  return null;
}

export function extensionForMime(mime: string): string {
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mpeg') || mime.includes('mp3') || mime.includes('mpga')) return 'mp3';
  return 'bin';
}

export type AudioFormatChoice = { mime: string; ext: string };

// Decide best recording/encoding target for this browser
// We prefer Opus container (OGG/WebM) when the browser can play it; otherwise WAV.
export function pickAudioFormat(): AudioFormatChoice {
  const opus = getPreferredOpusMime();
  if (opus) {
    return { mime: opus, ext: extensionForMime(opus) };
  }
  return { mime: 'audio/wav', ext: 'wav' };
}
