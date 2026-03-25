-- SMART MILEAGE TRACKING IMPROVEMENTS
-- Migration: Add saved routes, location history, and enhanced mileage tracking
-- Created: 2026-01-19

-- ============================================================================
-- TABLE: saved_routes
-- Purpose: Store frequently used routes for quick mileage entry
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_location TEXT NOT NULL,
  end_location TEXT NOT NULL,
  distance_miles DECIMAL(10,2) NOT NULL CHECK (distance_miles >= 0),
  default_purpose TEXT,
  is_favorite BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0 CHECK (use_count >= 0),
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_saved_routes_user_id ON saved_routes(user_id);

-- Index for favorite routes (most commonly accessed)
CREATE INDEX IF NOT EXISTS idx_saved_routes_favorites ON saved_routes(user_id, is_favorite) WHERE is_favorite = true;

-- Index for most used routes
CREATE INDEX IF NOT EXISTS idx_saved_routes_usage ON saved_routes(user_id, use_count DESC);

-- RLS policies for saved_routes
ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_routes' AND policyname = 'Users can view their own saved routes') THEN
    CREATE POLICY "Users can view their own saved routes"
      ON saved_routes FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_routes' AND policyname = 'Users can insert their own saved routes') THEN
    CREATE POLICY "Users can insert their own saved routes"
      ON saved_routes FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_routes' AND policyname = 'Users can update their own saved routes') THEN
    CREATE POLICY "Users can update their own saved routes"
      ON saved_routes FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_routes' AND policyname = 'Users can delete their own saved routes') THEN
    CREATE POLICY "Users can delete their own saved routes"
      ON saved_routes FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- TABLE: location_history
-- Purpose: Track location usage frequency for autocomplete suggestions
-- ============================================================================
CREATE TABLE IF NOT EXISTS location_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  nickname TEXT, -- e.g., "Home", "Thunder Club", "Office"
  use_count INTEGER DEFAULT 1 CHECK (use_count >= 0),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, location) -- Prevent duplicate locations per user
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_location_history_user_id ON location_history(user_id);

-- Index for most used locations (for autocomplete)
CREATE INDEX IF NOT EXISTS idx_location_history_usage ON location_history(user_id, use_count DESC);

-- Index for recent locations
CREATE INDEX IF NOT EXISTS idx_location_history_recent ON location_history(user_id, last_used_at DESC);

-- RLS policies for location_history
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'location_history' AND policyname = 'Users can view their own location history') THEN
    CREATE POLICY "Users can view their own location history"
      ON location_history FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'location_history' AND policyname = 'Users can insert their own location history') THEN
    CREATE POLICY "Users can insert their own location history"
      ON location_history FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'location_history' AND policyname = 'Users can update their own location history') THEN
    CREATE POLICY "Users can update their own location history"
      ON location_history FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'location_history' AND policyname = 'Users can delete their own location history') THEN
    CREATE POLICY "Users can delete their own location history"
      ON location_history FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- ALTER TABLE: mileage
-- Purpose: Add new columns for enhanced tracking
-- ============================================================================

-- Add column to link mileage to specific gigs
ALTER TABLE mileage 
ADD COLUMN IF NOT EXISTS linked_gig_id UUID REFERENCES gigs(id) ON DELETE SET NULL;

-- Add column to track round trips
ALTER TABLE mileage 
ADD COLUMN IF NOT EXISTS is_round_trip BOOLEAN DEFAULT false;

-- Add column to reference saved route (for analytics)
ALTER TABLE mileage 
ADD COLUMN IF NOT EXISTS saved_route_id UUID REFERENCES saved_routes(id) ON DELETE SET NULL;

-- Add column to store calculated vs manual miles (for accuracy tracking)
ALTER TABLE mileage 
ADD COLUMN IF NOT EXISTS is_auto_calculated BOOLEAN DEFAULT false;

-- Create index for gig-linked mileage lookups
CREATE INDEX IF NOT EXISTS idx_mileage_linked_gig ON mileage(user_id, linked_gig_id) WHERE linked_gig_id IS NOT NULL;

-- Create index for saved route analytics
CREATE INDEX IF NOT EXISTS idx_mileage_saved_route ON mileage(saved_route_id) WHERE saved_route_id IS NOT NULL;

-- ============================================================================
-- FUNCTION: update_location_history
-- Purpose: Automatically track location usage when mileage is added
-- ============================================================================
CREATE OR REPLACE FUNCTION update_location_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert start_location
  INSERT INTO location_history (user_id, location, use_count, last_used_at)
  VALUES (NEW.user_id, NEW.start_location, 1, NOW())
  ON CONFLICT (user_id, location) 
  DO UPDATE SET 
    use_count = location_history.use_count + 1,
    last_used_at = NOW();

  -- Update or insert end_location
  INSERT INTO location_history (user_id, location, use_count, last_used_at)
  VALUES (NEW.user_id, NEW.end_location, 1, NOW())
  ON CONFLICT (user_id, location) 
  DO UPDATE SET 
    use_count = location_history.use_count + 1,
    last_used_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update location history
DROP TRIGGER IF EXISTS trigger_update_location_history ON mileage;
CREATE TRIGGER trigger_update_location_history
  AFTER INSERT ON mileage
  FOR EACH ROW
  EXECUTE FUNCTION update_location_history();

-- ============================================================================
-- FUNCTION: update_saved_route_usage
-- Purpose: Automatically increment route usage count when used
-- ============================================================================
CREATE OR REPLACE FUNCTION update_saved_route_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- If this mileage entry references a saved route, increment its usage
  IF NEW.saved_route_id IS NOT NULL THEN
    UPDATE saved_routes
    SET 
      use_count = use_count + 1,
      last_used_at = NOW()
    WHERE id = NEW.saved_route_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update saved route usage
DROP TRIGGER IF EXISTS trigger_update_saved_route_usage ON mileage;
CREATE TRIGGER trigger_update_saved_route_usage
  AFTER INSERT ON mileage
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_route_usage();

-- ============================================================================
-- FUNCTION: update_updated_at_timestamp
-- Purpose: Automatically update updated_at column
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for saved_routes updated_at
DROP TRIGGER IF EXISTS trigger_saved_routes_updated_at ON saved_routes;
CREATE TRIGGER trigger_saved_routes_updated_at
  BEFORE UPDATE ON saved_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

-- ============================================================================
-- COMMENTS (for documentation)
-- ============================================================================
COMMENT ON TABLE saved_routes IS 'Stores frequently used routes for quick mileage entry';
COMMENT ON TABLE location_history IS 'Tracks location usage frequency for autocomplete suggestions';
COMMENT ON COLUMN mileage.linked_gig_id IS 'Links mileage entry to a specific gig';
COMMENT ON COLUMN mileage.is_round_trip IS 'Indicates if miles represent a round trip (doubled)';
COMMENT ON COLUMN mileage.saved_route_id IS 'References the saved route used to create this entry';
COMMENT ON COLUMN mileage.is_auto_calculated IS 'Indicates if miles were auto-calculated vs manually entered';
