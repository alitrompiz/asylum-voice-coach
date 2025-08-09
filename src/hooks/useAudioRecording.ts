import { useState, useRef, useCallback } from 'react';
import { wrap, Remote } from 'comlink';
import type { AudioWorkerAPI } from '@/workers/audioWorker';

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
  const getWorker = () => {
    if (!workerRef.current) {
      const worker = new Worker(new URL('../workers/audioWorker.ts', import.meta.url), { type: 'module' });
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
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Capture PCM frames for worker-side VAD (no UI changes)
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input.length);
        copy.set(input);
        try {
          const worker = getWorker();
          // Fire-and-forget VAD computation
          void worker.simpleVadFrame(copy);
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

          // Create blob from chunks - use wav if possible, otherwise keep original
          const originalBlob = new Blob(chunksRef.current);
          let finalBlob;
          let mimeType = 'audio/wav';

          // Try to create a WAV blob, fallback to original if not supported
          if (chunksRef.current.length > 0 && chunksRef.current[0].type) {
            const originalType = chunksRef.current[0].type;
            console.log('Original audio type:', originalType);
            
            // If it's already a supported format, use it
            if (originalType.includes('wav') || originalType.includes('mp4') || 
                originalType.includes('mpeg') || originalType.includes('ogg')) {
              finalBlob = originalBlob;
              mimeType = originalType;
            } else {
              // For webm, we'll send it but update the edge function to handle it
              finalBlob = originalBlob;
              mimeType = originalType;
            }
          } else {
            finalBlob = originalBlob;
          }

          console.log('Final audio blob type:', mimeType, 'size:', finalBlob.size);
          
          // Convert to base64 for API (offloaded to worker)
          const { getMediaWorker } = await import('@/lib/mediaWorkerClient');
          const worker = getMediaWorker();
          const base64Audio = await worker.blobToBase64(finalBlob);

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