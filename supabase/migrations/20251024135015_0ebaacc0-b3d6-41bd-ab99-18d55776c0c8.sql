-- Add indexes for Live Market Monitor performance
CREATE INDEX IF NOT EXISTS idx_sessions_market_date_status 
ON sessions(market_id, session_date, status);

CREATE INDEX IF NOT EXISTS idx_stall_confirmations_market_date 
ON stall_confirmations(market_id, market_date, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_is_late 
ON media(is_late);

CREATE INDEX IF NOT EXISTS idx_media_session_created 
ON media(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_events_session_created 
ON task_events(session_id, created_at DESC);