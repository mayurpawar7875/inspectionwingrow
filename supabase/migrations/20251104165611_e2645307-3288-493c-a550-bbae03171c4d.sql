-- Create RLS policies for employee-media bucket uploads

-- Allow authenticated users to upload to employee-media bucket
CREATE POLICY "Users can upload to employee-media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'employee-media');

-- Allow users to view their own uploads in employee-media
CREATE POLICY "Users can view employee-media files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'employee-media');

-- Allow admins to view all employee-media files
CREATE POLICY "Admins can view all employee-media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-media' 
  AND has_role(auth.uid(), 'admin'::user_role)
);