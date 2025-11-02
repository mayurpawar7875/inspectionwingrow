-- Make session_id nullable in media table to support BDO pan video uploads without active sessions
-- BDOs upload pan videos for new markets that don't yet exist in the system

ALTER TABLE public.media 
ALTER COLUMN session_id DROP NOT NULL;