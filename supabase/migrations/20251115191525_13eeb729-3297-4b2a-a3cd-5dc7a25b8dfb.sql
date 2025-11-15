-- Add farmer_name and stall_name to collections table
ALTER TABLE public.collections 
ADD COLUMN farmer_name TEXT,
ADD COLUMN stall_name TEXT;