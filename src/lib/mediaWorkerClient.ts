import { wrap } from 'comlink';
import type { MediaWorkerAPI } from '@/workers/mediaWorker';

let mediaWorkerProxy: import('comlink').Remote<MediaWorkerAPI> | null = null;

export function getMediaWorker() {
  if (!mediaWorkerProxy) {
    const worker = new Worker(new URL('../workers/mediaWorker.ts', import.meta.url), { type: 'module' });
    mediaWorkerProxy = wrap<MediaWorkerAPI>(worker);
  }
  return mediaWorkerProxy as import('comlink').Remote<MediaWorkerAPI>;
}
