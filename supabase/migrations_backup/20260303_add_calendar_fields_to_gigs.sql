-- Add calendar integration fields to gigs table
-- Adds start_time, end_time, and calendar_event_id for calendar integration

ALTER TABLE gigs ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

-- Create index for calendar_event_id lookups
CREATE INDEX IF NOT EXISTS gigs_calendar_event_id_idx ON gigs(calendar_event_id) WHERE calendar_event_id IS NOT NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Added calendar fields to gigs table!';
END $$;
