-- Allow guest OCR job creation by making user_id nullable
ALTER TABLE public.ocr_jobs ALTER COLUMN user_id DROP NOT NULL;