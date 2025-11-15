-- Change stalls_accommodation_url to stalls_accommodation_count (number of stalls)
ALTER TABLE bdo_market_submissions
DROP COLUMN IF EXISTS stalls_accommodation_url;

ALTER TABLE bdo_market_submissions
ADD COLUMN IF NOT EXISTS stalls_accommodation_count INTEGER;

COMMENT ON COLUMN bdo_market_submissions.stalls_accommodation_count IS 'Number of stalls the BDO needs to communicate to admin';
