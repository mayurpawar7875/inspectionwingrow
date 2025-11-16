-- Add selfie_url column to bdo_punchout table
ALTER TABLE public.bdo_punchout 
ADD COLUMN IF NOT EXISTS selfie_url TEXT NOT NULL DEFAULT '';