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
  const buffer = await blob.arrayBuffer();
  return arrayBufferToBase64(buffer);
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

// Simple VAD on a single frame using RMS threshold
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
};

const api: AudioWorkerAPI = {
  base64ToUint8,
  blobToBase64,
  downsamplePCM,
  encodeWav,
  simpleVadFrame,
  simpleVadFlags,
};

expose(api);
