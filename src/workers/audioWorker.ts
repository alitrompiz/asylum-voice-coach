import { expose, transfer } from 'comlink';

// Utility: base64 <-> bytes
function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]);
  }
  return btoa(binary);
}

async function blobToBase64(blob: Blob): Promise<string> {
  try {
    performance.mark('aw:blobToBase64:start');
  } catch {}
  const buffer = await blob.arrayBuffer();
  const out = arrayBufferToBase64(buffer);
  try {
    performance.mark('aw:blobToBase64:end');
    performance.measure('aw:blobToBase64', 'aw:blobToBase64:start', 'aw:blobToBase64:end');
  } catch {}
  return out;
}

// DSP: downsample Float32 PCM using linear interpolation
function downsamplePCM(input: Float32Array, inRate: number, outRate = 16000): Float32Array {
  if (outRate === inRate) return input.slice();
  const ratio = inRate / outRate;
  const outLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outLength);
  let pos = 0;
  for (let i = 0; i < outLength; i++) {
    const index = i * ratio;
    const i0 = Math.floor(index);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = index - i0;
    output[pos++] = input[i0] + (input[i1] - input[i0]) * frac;
  }
  return output;
}

// WAV (PCM16 LE) encoder
function encodeWav(pcm: Float32Array, sampleRate: number): Uint8Array {
  // Convert Float32 [-1,1] to PCM16 LE
  const pcm16 = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm16.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;

  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    offset += str.length;
  };

  writeString('RIFF');
  view.setUint32(offset, 36 + dataSize, true); offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true); offset += 4; // PCM chunk size
  view.setUint16(offset, 1, true); offset += 2; // PCM format
  view.setUint16(offset, numChannels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2; // bits per sample
  writeString('data');
  view.setUint32(offset, dataSize, true); offset += 4;

  new Uint8Array(buffer, 44).set(new Uint8Array(pcm16.buffer));
  return new Uint8Array(buffer);
}

// Helper: concatenate frames
function concatFloat32(frames: Float32Array[]): Float32Array {
  const total = frames.reduce((n, f) => n + f.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const f of frames) {
    out.set(f, off);
    off += f.length;
  }
  return out;
}

// Encode WAV from PCM using worker
async function encodeWavFromPCM(
  pcm: Float32Array,
  inRate: number,
  outRate = 16000
): Promise<{ blob: Blob; mime: string; ext: string }> {
  try { performance.mark('aw:encode:start'); } catch {}
  try { performance.mark('aw:downsample:start'); } catch {}
  const ds = downsamplePCM(pcm, inRate, outRate);
  try {
    performance.mark('aw:downsample:end');
    performance.measure('aw:downsample', 'aw:downsample:start', 'aw:downsample:end');
  } catch {}
  const wavBytes = encodeWav(ds, outRate);
  const blob = new Blob([wavBytes], { type: 'audio/wav' });
  try {
    performance.mark('aw:encode:end');
    performance.measure('aw:encode', 'aw:encode:start', 'aw:encode:end');
  } catch {}
  return { blob, mime: 'audio/wav', ext: 'wav' };
}

// Optional: WebCodecs-based Opus (WebM) encoding. Fallbacks to WAV if unsupported.
async function supportsOpusWebCodecs(): Promise<boolean> {
  try {
    const AudioEncoderAny: any = (self as any).AudioEncoder;
    if (!AudioEncoderAny || typeof AudioEncoderAny.isConfigSupported !== 'function') return false;
    const support = await AudioEncoderAny.isConfigSupported({
      codec: 'opus',
      sampleRate: 48000,
      numberOfChannels: 1,
      bitrate: 64000,
    });
    return !!support?.supported;
  } catch {
    return false;
  }
}

async function encodeOpusWebMFromPCM(
  pcm: Float32Array,
  inRate: number
): Promise<{ blob: Blob; mime: string; ext: string }> {
  // Dynamically import a separate encoder module (WASM-backed in future).
  try {
    performance.mark?.('aw:opus-import:start');
    const mod = await import('./audioWorker.opus');
    performance.mark?.('aw:opus-import:end');
    performance.measure?.('aw:opus-import', 'aw:opus-import:start', 'aw:opus-import:end');

    performance.mark?.('aw:opus-encode:start');
    const res = await mod.encodeOggOpus(pcm, inRate);
    performance.mark?.('aw:opus-encode:end');
    performance.measure?.('aw:opus-encode', 'aw:opus-encode:start', 'aw:opus-encode:end');
    return res;
  } catch (e) {
    // Fallback path: WAV 16 kHz mono suitable for STT
  }
  return encodeWavFromPCM(pcm, inRate, 16000);
}

function simpleVadFrame(frame: Float32Array, threshold = 0.015): boolean {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    const s = frame[i];
    sum += s * s;
  }
  const rms = Math.sqrt(sum / frame.length);
  return rms > threshold;
}

// Batch VAD over frames
function simpleVadFlags(pcm: Float32Array, sampleRate: number, frameMs = 30, threshold = 0.015): boolean[] {
  const frameSize = Math.floor((sampleRate * frameMs) / 1000);
  const flags: boolean[] = [];
  for (let i = 0; i + frameSize <= pcm.length; i += frameSize) {
    const f = pcm.subarray(i, i + frameSize);
    flags.push(simpleVadFrame(f, threshold));
  }
  return flags;
}

export type AudioWorkerAPI = {
  base64ToUint8: (base64: string) => Uint8Array;
  blobToBase64: (blob: Blob) => Promise<string>;
  downsamplePCM: (pcm: Float32Array, inRate: number, outRate?: number) => Float32Array;
  encodeWav: (pcm: Float32Array, sampleRate: number) => Uint8Array;
  simpleVadFrame: (frame: Float32Array, threshold?: number) => boolean;
  simpleVadFlags: (pcm: Float32Array, sampleRate: number, frameMs?: number, threshold?: number) => boolean[];
  concatFloat32: (frames: Float32Array[]) => Float32Array;
  encodeWavFromPCM: (pcm: Float32Array, inRate: number, outRate?: number) => Promise<{ blob: Blob; mime: string; ext: string }>;
  supportsOpusWebCodecs: () => Promise<boolean>;
  encodeOpusWebMFromPCM: (pcm: Float32Array, inRate: number) => Promise<{ blob: Blob; mime: string; ext: string }>;
  dispose: () => void;
};

const api: AudioWorkerAPI = {
  base64ToUint8,
  blobToBase64,
  downsamplePCM,
  encodeWav,
  simpleVadFrame,
  simpleVadFlags,
  concatFloat32,
  encodeWavFromPCM,
  supportsOpusWebCodecs,
  encodeOpusWebMFromPCM,
  dispose: () => {
    // Placeholder for future encoder cleanup
  },
};

expose(api);
