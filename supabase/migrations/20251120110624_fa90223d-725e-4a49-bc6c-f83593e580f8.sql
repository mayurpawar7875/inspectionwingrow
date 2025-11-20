-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Add screenshot_url column to collections table
ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS screenshot_url text;

-- Add comment
COMMENT ON COLUMN public.collections.screenshot_url IS 'URL of payment screenshot for online payments';

-- Create RLS policies for payment screenshots bucket
CREATE POLICY "Employees can upload their payment screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Employees can view their payment screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all payment screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-screenshots' AND
  has_role(auth.uid(), 'admin'::user_role)
);