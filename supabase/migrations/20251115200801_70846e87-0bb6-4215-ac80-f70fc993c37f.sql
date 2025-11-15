-- Add document fields to bdo_market_submissions for post-approval uploads
ALTER TABLE bdo_market_submissions 
ADD COLUMN IF NOT EXISTS service_agreement_url TEXT,
ADD COLUMN IF NOT EXISTS stalls_accommodation_url TEXT,
ADD COLUMN IF NOT EXISTS documents_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS documents_status TEXT DEFAULT 'pending' CHECK (documents_status IN ('pending', 'uploaded', 'not_required'));