import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OcrJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error_message?: string;
  file_name: string;
}

export const useOcrJob = (jobId: string | null) => {
  const [job, setJob] = useState<OcrJob | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const pollJob = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('ocr_jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setJob({
        id: data.id,
        status: data.status as 'pending' | 'processing' | 'completed' | 'failed',
        progress: data.progress,
        result: data.result,
        error_message: data.error_message,
        file_name: data.file_name
      });
      
      // Stop polling if job is completed or failed
      if (data.status === 'completed' || data.status === 'failed') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setLoading(false);
      }
      
      return data;
    } catch (error) {
      console.error('Error polling job:', error);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setLoading(false);
      return null;
    }
  };

  const startPolling = (id: string) => {
    if (intervalRef.current) return;
    
    setLoading(true);
    
    // Poll immediately
    pollJob(id);
    
    // Then poll every 2 seconds
    intervalRef.current = setInterval(() => {
      pollJob(id);
    }, 2000);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setLoading(false);
  };

  useEffect(() => {
    if (jobId) {
      startPolling(jobId);
    } else {
      stopPolling();
      setJob(null);
    }

    return () => stopPolling();
  }, [jobId]);

  return {
    job,
    loading,
    pollJob,
    startPolling,
    stopPolling
  };
};