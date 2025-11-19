-- Make employee-media bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'employee-media';

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all media" ON storage.objects;
DROP POLICY IF EXISTS "BDO and Market Managers can view all media" ON storage.objects;

-- Create RLS policies for storage.objects
CREATE POLICY "Users can view their own media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'employee-media' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR
   has_role(auth.uid(), 'admin'::user_role) OR
   has_role(auth.uid(), 'bdo'::user_role) OR
   has_role(auth.uid(), 'market_manager'::user_role))
);

CREATE POLICY "Users can upload their own media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'employee-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'employee-media' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR
   has_role(auth.uid(), 'admin'::user_role))
);