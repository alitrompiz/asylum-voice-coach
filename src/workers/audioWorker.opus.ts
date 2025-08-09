// Dynamically imported Opus encoder stub.
// This file is split into its own chunk and only loaded if Opus is requested.
// Replace the implementation with a real WASM-based Ogg Opus encoder when approved.

export async function encodeOggOpus(
  pcm: Float32Array,
  sampleRate: number
): Promise<{ blob: Blob; mime: string; ext: string }> {
  // Placeholder: throw to trigger WAV fallback in caller
  throw new Error('Opus encoder WASM not available');
}
