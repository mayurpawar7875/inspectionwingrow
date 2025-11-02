-- Update RLS policy on media table to allow BDO users to insert media without session
-- This is needed for pan video uploads where BDOs submit new market locations

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage media in their sessions" ON public.media;

-- Create new policy that allows:
-- 1. Users to manage media in their own sessions
-- 2. BDO users to insert their own media even without a session (for pan videos)
CREATE POLICY "Users can manage their media"
ON public.media
FOR ALL
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = media.session_id
    AND sessions.user_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
);