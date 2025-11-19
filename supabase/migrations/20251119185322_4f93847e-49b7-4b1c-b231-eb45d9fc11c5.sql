-- Add stall_confirmation_id to collections table for proper linking
ALTER TABLE public.collections
ADD COLUMN stall_confirmation_id uuid REFERENCES public.stall_confirmations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_collections_stall_confirmation ON public.collections(stall_confirmation_id);

-- Add comment
COMMENT ON COLUMN public.collections.stall_confirmation_id IS 'Links collection to the specific stall confirmation';