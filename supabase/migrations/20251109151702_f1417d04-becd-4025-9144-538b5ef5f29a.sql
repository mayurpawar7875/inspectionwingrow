-- Fix employees table RLS policy - remove public access
-- The get_employee_by_username() function already provides secure username lookup

DROP POLICY IF EXISTS "Public can check username for login" ON public.employees;

-- Ensure we have proper policies for authenticated users
-- (Admin and self-access policies already exist based on the schema)

-- Add input validation constraints to critical tables
ALTER TABLE public.stalls 
  ADD CONSTRAINT stalls_farmer_name_length CHECK (char_length(farmer_name) <= 200 AND char_length(farmer_name) > 0),
  ADD CONSTRAINT stalls_stall_name_length CHECK (char_length(stall_name) <= 200 AND char_length(stall_name) > 0),
  ADD CONSTRAINT stalls_stall_no_length CHECK (char_length(stall_no) <= 50 AND char_length(stall_no) > 0);

ALTER TABLE public.stall_confirmations
  ADD CONSTRAINT stall_confirmations_farmer_name_length CHECK (char_length(farmer_name) <= 200 AND char_length(farmer_name) > 0),
  ADD CONSTRAINT stall_confirmations_stall_name_length CHECK (char_length(stall_name) <= 200 AND char_length(stall_name) > 0),
  ADD CONSTRAINT stall_confirmations_stall_no_length CHECK (char_length(stall_no) <= 50 AND char_length(stall_no) > 0);

ALTER TABLE public.organiser_feedback
  ADD CONSTRAINT organiser_feedback_feedback_length CHECK (feedback IS NULL OR char_length(feedback) <= 2000),
  ADD CONSTRAINT organiser_feedback_difficulties_length CHECK (difficulties IS NULL OR char_length(difficulties) <= 2000);

ALTER TABLE public.non_available_commodities
  ADD CONSTRAINT non_available_commodities_name_length CHECK (char_length(commodity_name) <= 200 AND char_length(commodity_name) > 0),
  ADD CONSTRAINT non_available_commodities_notes_length CHECK (notes IS NULL OR char_length(notes) <= 1000);

ALTER TABLE public.offers
  ADD CONSTRAINT offers_commodity_name_length CHECK (char_length(commodity_name) <= 200 AND char_length(commodity_name) > 0),
  ADD CONSTRAINT offers_category_length CHECK (char_length(category) <= 100 AND char_length(category) > 0),
  ADD CONSTRAINT offers_notes_length CHECK (notes IS NULL OR char_length(notes) <= 1000);

-- Add comment to document the security improvement
COMMENT ON FUNCTION public.get_employee_by_username IS 'Secure username lookup for authentication. This function bypasses RLS to check username existence without exposing all employee data.';