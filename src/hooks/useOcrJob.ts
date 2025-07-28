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
      console.log(`[OCR_POLL] Polling job ${id}...`);
      
      const { data, error } = await supabase
        .from('ocr_jobs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error(`[OCR_POLL] Error fetching job ${id}:`, error);
        throw error;
      }
      
      if (!data) {
        console.warn(`[OCR_POLL] Job ${id} not found in database`);
        return null;
      }
      
      console.log(`[OCR_POLL] Job ${id} status: ${data.status}, progress: ${data.progress}`);
      
      const jobData = {
        id: data.id,
        status: data.status as 'pending' | 'processing' | 'completed' | 'failed',
        progress: data.progress || 0,
        result: data.result,
        error_message: data.error_message,
        file_name: data.file_name
      };
      
      setJob(jobData);
      
      // Stop polling if job is completed or failed
      if (data.status === 'completed' || data.status === 'failed') {
        console.log(`[OCR_POLL] Job ${id} finished with status: ${data.status}`);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setLoading(false);
      }
      
      return data;
    } catch (error) {
      console.error(`[OCR_POLL] Error polling job ${id}:`, error);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setLoading(false);
      return null;
    }
  };

  const startPolling = (id: string) => {
    if (intervalRef.current) {
      console.log(`[OCR_POLL] Already polling job ${id}, skipping start`);
      return;
    }
    
    console.log(`[OCR_POLL] Starting to poll job ${id}`);
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