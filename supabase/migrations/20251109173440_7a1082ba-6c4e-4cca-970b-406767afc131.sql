-- Add read status to notifications table
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_target_user_read 
ON public.notifications(target_user_id, read, created_at DESC);

-- Update RLS policy to allow users to update their own notifications
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications"
ON public.notifications
FOR UPDATE
USING ((target_user_id IS NULL) OR (target_user_id = auth.uid()))
WITH CHECK ((target_user_id IS NULL) OR (target_user_id = auth.uid()));