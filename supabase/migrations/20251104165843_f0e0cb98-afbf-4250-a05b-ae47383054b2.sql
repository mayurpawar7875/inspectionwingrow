-- Make contact_phone nullable in market_land_search table
ALTER TABLE market_land_search ALTER COLUMN contact_phone DROP NOT NULL;