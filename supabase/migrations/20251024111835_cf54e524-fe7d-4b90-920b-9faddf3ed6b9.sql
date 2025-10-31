-- Add new media types to the media_type enum
ALTER TYPE media_type ADD VALUE IF NOT EXISTS 'rate_board';
ALTER TYPE media_type ADD VALUE IF NOT EXISTS 'market_video';
ALTER TYPE media_type ADD VALUE IF NOT EXISTS 'cleaning_video';