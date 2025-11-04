-- Add customer name, market, and video fields to bms_stall_feedbacks
ALTER TABLE bms_stall_feedbacks 
ADD COLUMN customer_name TEXT,
ADD COLUMN market_id UUID REFERENCES markets(id),
ADD COLUMN video_url TEXT;