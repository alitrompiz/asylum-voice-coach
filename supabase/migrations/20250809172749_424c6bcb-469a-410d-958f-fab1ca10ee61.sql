-- 2B-2: Rate limiting infrastructure
-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  route text NOT NULL,
  subject text NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0,
  CONSTRAINT edge_rate_limits_pkey PRIMARY KEY (route, subject, window_start)
);

-- Enable RLS and restrict direct modifications
ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow only admins to view; do not allow insert/update/delete for regular roles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'edge_rate_limits' AND policyname = 'Admins can view edge rate limits'
  ) THEN
    CREATE POLICY "Admins can view edge rate limits"
    ON public.edge_rate_limits
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- SECURITY DEFINER wrapper to update counters atomically and (by owner) bypass RLS for writes
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_route text,
  p_subject text,
  p_limit int,
  p_window_seconds int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $$
DECLARE
  v_window_start timestamptz;
  v_new_count int;
BEGIN
  IF p_limit IS NULL OR p_limit <= 0 THEN
    RETURN true;
  END IF;

  -- Floor now() to the start of the window
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  -- Upsert and increment atomically; return whether under limit
  INSERT INTO public.edge_rate_limits(route, subject, window_start, count)
  VALUES (p_route, p_subject, v_window_start, 1)
  ON CONFLICT (route, subject, window_start)
  DO UPDATE SET count = public.edge_rate_limits.count + 1
  RETURNING count INTO v_new_count;

  RETURN v_new_count <= p_limit;
END;
$$;

-- Helpful index for window pruning/analytics
CREATE INDEX IF NOT EXISTS idx_edge_rate_limits_window_start ON public.edge_rate_limits(window_start);

-- Ensure RPC accessibility
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, text, int, int) TO anon, authenticated, service_role;