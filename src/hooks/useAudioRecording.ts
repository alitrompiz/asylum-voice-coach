import { useState, useRef, useCallback } from 'react';

export interface AudioRecordingResult {
  audioBlob: Blob;
  duration: number;
  base64Audio: string;
}

export const useAudioRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      chunksRef.current = [];
      
      // Create MediaRecorder with supported format
      let mediaRecorder;
      const supportedMimeTypes = [
        'audio/wav',
        'audio/mp4',
        'audio/mpeg',
        'audio/ogg',
        'audio/webm;codecs=opus'
      ];

      // Find the first supported MIME type
      let selectedMimeType = 'audio/webm;codecs=opus'; // fallback
      for (const mimeType of supportedMimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      console.log('Using MIME type:', selectedMimeType);
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;

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
          
          // Convert to base64 for API
          const base64Audio = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              // Remove data URL prefix
              const base64Data = base64.split(',')[1];
              resolve(base64Data);
            };
            reader.readAsDataURL(finalBlob);
          });

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
    }
  }, [isRecording]);

  return {
    isRecording,
    duration,
    error,
    startRecording,
    stopRecording,
    cancelRecording
  };
};