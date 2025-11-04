-- Enable CASCADE delete for markets
-- Only update tables that actually have market_id foreign keys

-- Sessions
ALTER TABLE public.sessions 
DROP CONSTRAINT IF EXISTS sessions_market_id_fkey;

ALTER TABLE public.sessions 
ADD CONSTRAINT sessions_market_id_fkey 
  FOREIGN KEY (market_id) 
  REFERENCES public.markets(id) 
  ON DELETE CASCADE;

-- Media
ALTER TABLE public.media 
DROP CONSTRAINT IF EXISTS media_market_id_fkey;

ALTER TABLE public.media 
ADD CONSTRAINT media_market_id_fkey 
  FOREIGN KEY (market_id) 
  REFERENCES public.markets(id) 
  ON DELETE CASCADE;

-- Stall confirmations
ALTER TABLE public.stall_confirmations 
DROP CONSTRAINT IF EXISTS stall_confirmations_market_id_fkey;

ALTER TABLE public.stall_confirmations 
ADD CONSTRAINT stall_confirmations_market_id_fkey 
  FOREIGN KEY (market_id) 
  REFERENCES public.markets(id) 
  ON DELETE CASCADE;

-- Collections
ALTER TABLE public.collections 
DROP CONSTRAINT IF EXISTS collections_market_id_fkey;

ALTER TABLE public.collections 
ADD CONSTRAINT collections_market_id_fkey 
  FOREIGN KEY (market_id) 
  REFERENCES public.markets(id) 
  ON DELETE CASCADE;

-- Offers
ALTER TABLE public.offers 
DROP CONSTRAINT IF EXISTS offers_market_id_fkey;

ALTER TABLE public.offers 
ADD CONSTRAINT offers_market_id_fkey 
  FOREIGN KEY (market_id) 
  REFERENCES public.markets(id) 
  ON DELETE CASCADE;

-- Non-available commodities
ALTER TABLE public.non_available_commodities 
DROP CONSTRAINT IF EXISTS non_available_commodities_market_id_fkey;

ALTER TABLE public.non_available_commodities 
ADD CONSTRAINT non_available_commodities_market_id_fkey 
  FOREIGN KEY (market_id) 
  REFERENCES public.markets(id) 
  ON DELETE CASCADE;

-- Organiser feedback
ALTER TABLE public.organiser_feedback 
DROP CONSTRAINT IF EXISTS organiser_feedback_market_id_fkey;

ALTER TABLE public.organiser_feedback 
ADD CONSTRAINT organiser_feedback_market_id_fkey 
  FOREIGN KEY (market_id) 
  REFERENCES public.markets(id) 
  ON DELETE CASCADE;

-- Stall inspections
ALTER TABLE public.stall_inspections 
DROP CONSTRAINT IF EXISTS stall_inspections_market_id_fkey;

ALTER TABLE public.stall_inspections 
ADD CONSTRAINT stall_inspections_market_id_fkey 
  FOREIGN KEY (market_id) 
  REFERENCES public.markets(id) 
  ON DELETE CASCADE;

-- Market schedule
ALTER TABLE public.market_schedule 
DROP CONSTRAINT IF EXISTS market_schedule_market_id_fkey;

ALTER TABLE public.market_schedule 
ADD CONSTRAINT market_schedule_market_id_fkey 
  FOREIGN KEY (market_id) 
  REFERENCES public.markets(id) 
  ON DELETE CASCADE;