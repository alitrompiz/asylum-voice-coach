import { useState, useRef, useCallback, useEffect } from 'react';
import { wrap, Remote, transfer } from 'comlink';
import type { AudioWorkerAPI } from '@/workers/audioWorker';
import { pickAudioFormat } from '@/lib/audio/formats';

export interface AudioRecordingResult {
  audioBlob: Blob;
  duration: number;
  base64Audio: string;
}

export const useAudioRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmFramesRef = useRef<Float32Array[] | null>(null);
  const inputSampleRateRef = useRef<number | null>(null);
  const workerRef = useRef<Remote<AudioWorkerAPI> | null>(null);
  const workerInstanceRef = useRef<Worker | null>(null);
  const getWorker = () => {
    if (!workerRef.current) {
      const worker = new Worker(new URL('../workers/audioWorker.ts', import.meta.url), { type: 'module' });
      workerInstanceRef.current = worker;
      workerRef.current = wrap<AudioWorkerAPI>(worker);
    }
    return workerRef.current!;
  };

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100, // Higher sample rate for better quality
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      chunksRef.current = [];
      
      // Create MediaRecorder with supported format (prioritize formats OpenAI accepts)
      const supportedMimeTypes = [
        'audio/mp3',
        'audio/mpeg',
        'audio/wav',
        'audio/ogg;codecs=opus',
        'audio/webm;codecs=opus'
      ];

      // Find the first supported MIME type
      let selectedMimeType = null;
      for (const mimeType of supportedMimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        selectedMimeType = ''; // Use browser default if none of our preferred types are supported
      }

      console.log('Using audio MIME type:', selectedMimeType);
      
      // Create MediaRecorder with optimal options
      const options = selectedMimeType ? { mimeType: selectedMimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = mediaRecorder;

      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      inputSampleRateRef.current = audioContextRef.current.sampleRate;
      pcmFramesRef.current = [];
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Capture PCM frames for worker-side VAD (no UI changes)
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const frame = new Float32Array(input.length);
        frame.set(input);
        pcmFramesRef.current?.push(frame);
        try {
          const worker = getWorker();
          // Fire-and-forget VAD computation with transferable using a separate copy
          const vadFrame = new Float32Array(input.length);
          vadFrame.set(input);
          void worker.simpleVadFrame(transfer(vadFrame, [vadFrame.buffer]));
        } catch (err) {
          // ignore worker errors
        }
      };
      source.connect(processorRef.current);
      // Ensure processor runs
      processorRef.current.connect(audioContextRef.current.destination);
      
      // Start audio level monitoring
      const monitorAudioLevel = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume level (more sensitive)
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        const normalizedLevel = Math.min(1, (average / 128) * 2); // More sensitive scaling
        
        console.log('Audio level:', normalizedLevel); // Debug log
        setAudioLevel(normalizedLevel);
        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
      };
      
      monitorAudioLevel();

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  }, []);

  const stopRecording = useCallback((): Promise<AudioRecordingResult> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current || !isRecording) {
        reject(new Error('No recording in progress'));
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        try {
          // Clear timer
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          // Encode from captured PCM frames using worker (prefer Opus when available)
          const frames = pcmFramesRef.current || [];
          const inRate = inputSampleRateRef.current || 44100;
          performance.mark?.('rec:concat:start');
          let total = 0;
          for (const f of frames) total += f.length;
          const pcm = new Float32Array(total);
          let off = 0;
          for (const f of frames) { pcm.set(f, off); off += f.length; }
          performance.mark?.('rec:concat:end');
          performance.measure?.('rec:concat', 'rec:concat:start', 'rec:concat:end');

          const fmt = pickAudioFormat();
          const audioWorker = getWorker();
          performance.mark?.('rec:encode:start');
          const enc = (fmt.ext === 'ogg' || fmt.ext === 'webm')
            ? await audioWorker.encodeOpusWebMFromPCM(transfer(pcm, [pcm.buffer]), inRate)
            : await audioWorker.encodeWavFromPCM(transfer(pcm, [pcm.buffer]), inRate, 16000);
          performance.mark?.('rec:encode:end');
          performance.measure?.('rec:encode', 'rec:encode:start', 'rec:encode:end');

          const finalBlob = enc.blob;
          const mimeType = enc.mime;
          console.log('Final audio blob type:', mimeType, 'size:', finalBlob.size);

          // Clean up analysis nodes
          if (processorRef.current) {
            try { processorRef.current.disconnect(); } catch {}
            processorRef.current.onaudioprocess = null as any;
            processorRef.current = null;
          }
          if (analyserRef.current) {
            try { analyserRef.current.disconnect(); } catch {}
            analyserRef.current = null;
          }
          if (audioContextRef.current) {
            try { await audioContextRef.current.close(); } catch {}
            audioContextRef.current = null;
          }
          pcmFramesRef.current = null;
          
          // Convert to base64 for API (offloaded to worker)
          performance.mark?.('rec:base64:start');
          const { getMediaWorker } = await import('@/lib/mediaWorkerClient');
          const mediaWorker = getMediaWorker();
          const base64Audio = await mediaWorker.blobToBase64(finalBlob);
          performance.mark?.('rec:base64:end');
          performance.measure?.('rec:base64', 'rec:base64:start', 'rec:base64:end');

          const result: AudioRecordingResult = {
            audioBlob: finalBlob,
            duration,
            base64Audio
          };

          setIsRecording(false);
          resolve(result);

        } catch (err) {
          console.error('Error processing recording:', err);
          reject(err);
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [isRecording, duration]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      setIsRecording(false);
      setDuration(0);
      setAudioLevel(0);
      
      // Clean up audio monitoring
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      try { workerRef.current?.dispose?.(); } catch {}
      if (workerInstanceRef.current) {
        try { workerInstanceRef.current.terminate(); } catch {}
        workerInstanceRef.current = null;
      }
    };
  }, []);

  return {
    isRecording,
    duration,
    error,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording
  };
};

// Dev-only quick stress test to verify encoding and cleanup without UI hooks
if (import.meta.env.DEV) {
  (globalThis as any).__audioEncodeSelfTest = async () => {
    try {
      const worker = (await (async () => {
        const w = new Worker(new URL('../workers/audioWorker.ts', import.meta.url), { type: 'module' });
        const { wrap } = await import('comlink');
        return (wrap as any)(w) as import('comlink').Remote<import('@/workers/audioWorker').AudioWorkerAPI>;
      })());

      const clips = 10;
      const sr = 44100;
      const length = 2048;
      const urls: string[] = [];
      const getMem = () => (performance as any).memory?.usedJSHeapSize || 0;
      const mem0 = getMem();

      for (let c = 0; c < clips; c++) {
        const pcm = new Float32Array(length);
        for (let i = 0; i < length; i++) pcm[i] = Math.sin((2 * Math.PI * i) / 64) * 0.25;
        const res = await worker.encodeWavFromPCM(pcm, sr, 16000);
        const url = URL.createObjectURL(res.blob);
        urls.push(url);
        // Simulate quick revoke after load
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
      }

      const mem1 = getMem();
      const growth = mem0 ? ((mem1 - mem0) / mem0) * 100 : 0;
      console.log(`[DEV] audio self test: heap growth ~${growth.toFixed(2)}%`);
      if (growth > 5) console.warn('[DEV] memory growth exceeded 5%');

      // Mid-encode cancel simulation: start an encode and immediately resolve by ignoring result
      const pcm = new Float32Array(length);
      const pending = worker.encodeWavFromPCM(pcm, sr, 16000);
      // simulate cancel: forget the promise; no side effects expected
      void pending;
    } catch (e) {
      console.warn('[DEV] audio self test error', e);
    }
  };
}
