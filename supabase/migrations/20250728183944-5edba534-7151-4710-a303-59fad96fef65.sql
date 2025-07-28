-- Create admin entitlement grants table
CREATE TABLE public.admin_entitlement_grants (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    granted_by_admin_id uuid NOT NULL,
    start_at_utc timestamp with time zone NOT NULL DEFAULT now(),
    end_at_utc timestamp with time zone NOT NULL,
    reason text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_entitlement_grants ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage entitlement grants" 
ON public.admin_entitlement_grants 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for fast lookups
CREATE INDEX idx_admin_entitlement_grants_user_end 
ON public.admin_entitlement_grants (user_id, end_at_utc);

-- Create index for active grants
CREATE INDEX idx_admin_entitlement_grants_active 
ON public.admin_entitlement_grants (user_id) 
WHERE end_at_utc > now();

-- Add trigger for updated_at
CREATE TRIGGER update_admin_entitlement_grants_updated_at
BEFORE UPDATE ON public.admin_entitlement_grants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to grant Full Prep access
CREATE OR REPLACE FUNCTION public.grant_full_prep_access(
    target_user_id uuid,
    weeks_to_grant integer DEFAULT 1,
    grant_reason text DEFAULT 'Admin grant'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_end_time timestamp with time zone;
    new_end_time timestamp with time zone;
    admin_id uuid := auth.uid();
BEGIN
    -- Check if caller is admin
    IF NOT has_role(admin_id, 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Get the latest end time for existing grants
    SELECT COALESCE(MAX(end_at_utc), now()) 
    INTO current_end_time
    FROM public.admin_entitlement_grants 
    WHERE user_id = target_user_id;

    -- Calculate new end time (extend from max of now or existing end)
    new_end_time := GREATEST(now(), current_end_time) + (weeks_to_grant || ' weeks')::interval;

    -- Insert new grant
    INSERT INTO public.admin_entitlement_grants (
        user_id, 
        granted_by_admin_id, 
        start_at_utc,
        end_at_utc, 
        reason
    ) VALUES (
        target_user_id, 
        admin_id, 
        GREATEST(now(), current_end_time),
        new_end_time, 
        grant_reason
    );

    -- Log admin action
    INSERT INTO public.admin_actions (
        admin_user_id,
        target_user_id,
        action_type,
        action_details
    ) VALUES (
        admin_id,
        target_user_id,
        'grant_full_prep',
        jsonb_build_object(
            'weeks_granted', weeks_to_grant,
            'end_date', new_end_time,
            'reason', grant_reason
        )
    );
END;
$$;

-- Function to revoke Full Prep access
CREATE OR REPLACE FUNCTION public.revoke_full_prep_access(
    target_user_id uuid,
    revoke_reason text DEFAULT 'Admin revocation'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_id uuid := auth.uid();
BEGIN
    -- Check if caller is admin
    IF NOT has_role(admin_id, 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Set end_at_utc to now for all active grants
    UPDATE public.admin_entitlement_grants 
    SET 
        end_at_utc = now(),
        updated_at = now()
    WHERE user_id = target_user_id 
    AND end_at_utc > now();

    -- Log admin action
    INSERT INTO public.admin_actions (
        admin_user_id,
        target_user_id,
        action_type,
        action_details
    ) VALUES (
        admin_id,
        target_user_id,
        'revoke_full_prep',
        jsonb_build_object(
            'reason', revoke_reason,
            'revoked_at', now()
        )
    );
END;
$$;

-- Function to check if user has active entitlement
CREATE OR REPLACE FUNCTION public.user_has_active_entitlement(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
    -- Check if user has active subscription OR active admin grant
    SELECT (
        -- Check subscription
        EXISTS (
            SELECT 1 FROM public.subscribers 
            WHERE user_id = target_user_id 
            AND subscribed = true 
            AND (
                subscription_end IS NULL 
                OR subscription_end > now()
                OR (grace_period_end IS NOT NULL AND grace_period_end > now())
            )
        )
        OR
        -- Check admin grants
        EXISTS (
            SELECT 1 FROM public.admin_entitlement_grants
            WHERE user_id = target_user_id 
            AND end_at_utc > now()
        )
    );
$$;

-- Function to get user entitlement status
CREATE OR REPLACE FUNCTION public.get_user_entitlement_status(target_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
    SELECT CASE 
        WHEN user_has_active_entitlement(target_user_id) THEN 'full_prep'
        ELSE 'free_trial'
    END;
$$;