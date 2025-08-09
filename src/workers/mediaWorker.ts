import { expose } from 'comlink';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk) as unknown as number[]);
  }
  // btoa is available in workers
  return btoa(binary);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

export type MediaWorkerAPI = {
  blobToBase64: (blob: Blob) => Promise<string>;
};

const api: MediaWorkerAPI = {
  blobToBase64,
};

expose(api);
