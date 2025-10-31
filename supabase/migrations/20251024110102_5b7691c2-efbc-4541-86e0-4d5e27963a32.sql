-- Add is_late field to media table to track late uploads
ALTER TABLE public.media 
ADD COLUMN is_late boolean NOT NULL DEFAULT false;