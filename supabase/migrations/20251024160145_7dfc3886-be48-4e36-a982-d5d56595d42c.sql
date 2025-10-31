-- Add userId, marketId, and marketDate columns to media table for direct filtering
ALTER TABLE public.media 
ADD COLUMN user_id uuid REFERENCES auth.users(id),
ADD COLUMN market_id uuid REFERENCES public.markets(id),
ADD COLUMN market_date date;

-- Create index for faster filtering
CREATE INDEX idx_media_market_date ON public.media(market_id, market_date);
CREATE INDEX idx_media_user_id ON public.media(user_id);

-- Create a function to backfill missing userId, marketId, marketDate from sessions
CREATE OR REPLACE FUNCTION backfill_media_metadata()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.media m
  SET 
    user_id = s.user_id,
    market_id = s.market_id,
    market_date = COALESCE(s.market_date, s.session_date)
  FROM public.sessions s
  WHERE m.session_id = s.id
    AND (m.user_id IS NULL OR m.market_id IS NULL OR m.market_date IS NULL);
END;
$$;

-- Run the backfill immediately
SELECT backfill_media_metadata();

-- Create a trigger to automatically populate these fields on insert
CREATE OR REPLACE FUNCTION set_media_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_data RECORD;
BEGIN
  -- Get session data if not already provided
  IF NEW.user_id IS NULL OR NEW.market_id IS NULL OR NEW.market_date IS NULL THEN
    SELECT user_id, market_id, COALESCE(market_date, session_date) as date
    INTO session_data
    FROM public.sessions
    WHERE id = NEW.session_id;
    
    NEW.user_id := COALESCE(NEW.user_id, session_data.user_id);
    NEW.market_id := COALESCE(NEW.market_id, session_data.market_id);
    NEW.market_date := COALESCE(NEW.market_date, session_data.date);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_media_metadata
BEFORE INSERT ON public.media
FOR EACH ROW
EXECUTE FUNCTION set_media_metadata();

-- Update RLS policies for media table to allow admin filtering by market_id and date
DROP POLICY IF EXISTS "Admins can view all media" ON public.media;

CREATE POLICY "Admins can view all media"
ON public.media
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Ensure stall_confirmations can be queried efficiently
CREATE INDEX IF NOT EXISTS idx_stall_confirmations_market_date 
ON public.stall_confirmations(market_id, market_date);