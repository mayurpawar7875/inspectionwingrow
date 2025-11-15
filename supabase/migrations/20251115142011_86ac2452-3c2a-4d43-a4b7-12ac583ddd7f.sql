-- Add rent_amount column to stall_confirmations table
ALTER TABLE public.stall_confirmations
ADD COLUMN rent_amount numeric DEFAULT 0;