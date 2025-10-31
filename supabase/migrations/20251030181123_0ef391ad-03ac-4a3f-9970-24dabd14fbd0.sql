-- Add collection_sheet_url to app_settings
ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS collection_sheet_url TEXT;

COMMENT ON COLUMN public.app_settings.collection_sheet_url IS 'Google Sheet URL for market collection data entry';