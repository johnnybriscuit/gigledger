-- Migration: Create Tours/Runs and Settlements feature
-- Date: 2026-02-12
-- Description: Add tour_runs, settlements tables and extend gigs/expenses for tour grouping

-- ============================================================================
-- 1. CREATE tour_runs TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tour_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  artist_name TEXT,
  notes TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tour_runs_user_id ON tour_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_runs_dates ON tour_runs(user_id, start_date, end_date);

-- Add comment
COMMENT ON TABLE tour_runs IS 'Tours/runs that group multiple gigs together for tour-level accounting';
COMMENT ON COLUMN tour_runs.start_date IS 'Computed from gigs, but can be manually set';
COMMENT ON COLUMN tour_runs.end_date IS 'Computed from gigs, but can be manually set';

-- ============================================================================
-- 2. ADD tour_id TO gigs TABLE
-- ============================================================================
ALTER TABLE gigs 
  ADD COLUMN IF NOT EXISTS tour_id UUID REFERENCES tour_runs(id) ON DELETE SET NULL;

-- Add index for tour queries
CREATE INDEX IF NOT EXISTS idx_gigs_tour_id ON gigs(user_id, tour_id);

COMMENT ON COLUMN gigs.tour_id IS 'Optional reference to tour_runs - allows grouping gigs into tours';

-- ============================================================================
-- 3. CREATE settlements TABLE (tour-level and gig-level payouts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tour_runs(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  paid_at DATE,
  payer_name TEXT,
  notes TEXT,
  allocation_mode TEXT NOT NULL DEFAULT 'even' CHECK (allocation_mode IN ('even', 'custom', 'weighted', 'none')),
  allocation_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_settlements_user_id ON settlements(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_tour_id ON settlements(tour_id);

-- Add comments
COMMENT ON TABLE settlements IS 'Tour-level payouts that can be allocated across gigs in a tour';
COMMENT ON COLUMN settlements.allocation_mode IS 'How to distribute: even (equal split), custom (user-defined), weighted (by guarantee), none (tour-only)';
COMMENT ON COLUMN settlements.allocation_json IS 'Stores per-gig allocations: {gigId: amount, ...}';

-- ============================================================================
-- 4. EXTEND expenses TABLE for tour-level expenses
-- ============================================================================
ALTER TABLE expenses 
  ADD COLUMN IF NOT EXISTS tour_id UUID REFERENCES tour_runs(id) ON DELETE CASCADE;

-- Add index for tour expense queries
CREATE INDEX IF NOT EXISTS idx_expenses_tour_id ON expenses(user_id, tour_id);

COMMENT ON COLUMN expenses.tour_id IS 'Optional reference to tour_runs - allows shared tour expenses';

-- Add allocation columns to expenses for shared cost distribution
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS allocation_mode TEXT DEFAULT 'none' CHECK (allocation_mode IN ('even', 'custom', 'weighted', 'none')),
  ADD COLUMN IF NOT EXISTS allocation_json JSONB;

COMMENT ON COLUMN expenses.allocation_mode IS 'For tour expenses: how to distribute across gigs';
COMMENT ON COLUMN expenses.allocation_json IS 'Stores per-gig expense allocations: {gigId: amount, ...}';

-- ============================================================================
-- 5. ENABLE RLS
-- ============================================================================
ALTER TABLE tour_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS POLICIES for tour_runs
-- ============================================================================
CREATE POLICY "Users can view own tours"
  ON tour_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tours"
  ON tour_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tours"
  ON tour_runs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tours"
  ON tour_runs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. RLS POLICIES for settlements
-- ============================================================================
CREATE POLICY "Users can view own settlements"
  ON settlements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settlements"
  ON settlements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settlements"
  ON settlements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settlements"
  ON settlements FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 8. TRIGGERS for updated_at
-- ============================================================================
CREATE TRIGGER update_tour_runs_updated_at 
  BEFORE UPDATE ON tour_runs
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settlements_updated_at 
  BEFORE UPDATE ON settlements
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. HELPER FUNCTION: Auto-update tour date range from gigs
-- ============================================================================
CREATE OR REPLACE FUNCTION update_tour_date_range()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the tour's start_date and end_date based on gigs
  -- Only update if dates are NULL (user hasn't manually set them)
  UPDATE tour_runs
  SET 
    start_date = COALESCE(start_date, (
      SELECT MIN(date) FROM gigs WHERE tour_id = NEW.tour_id
    )),
    end_date = COALESCE(end_date, (
      SELECT MAX(date) FROM gigs WHERE tour_id = NEW.tour_id
    ))
  WHERE id = NEW.tour_id
    AND NEW.tour_id IS NOT NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update tour dates when gigs are added/updated
CREATE TRIGGER update_tour_dates_on_gig_change
  AFTER INSERT OR UPDATE OF tour_id, date ON gigs
  FOR EACH ROW
  WHEN (NEW.tour_id IS NOT NULL)
  EXECUTE FUNCTION update_tour_date_range();

-- ============================================================================
-- 10. HELPER VIEW: Tour summary with gig counts and totals
-- ============================================================================
CREATE OR REPLACE VIEW v_tour_summary AS
SELECT 
  t.id,
  t.user_id,
  t.name,
  t.artist_name,
  t.notes,
  t.start_date,
  t.end_date,
  t.created_at,
  t.updated_at,
  COUNT(DISTINCT g.id) AS gig_count,
  COALESCE(MIN(g.date), t.start_date) AS computed_start_date,
  COALESCE(MAX(g.date), t.end_date) AS computed_end_date,
  COALESCE(SUM(g.gross_amount + COALESCE(g.tips, 0) + COALESCE(g.per_diem, 0) + COALESCE(g.other_income, 0)), 0) AS gigs_gross,
  COALESCE(SUM(g.fees), 0) AS gigs_fees,
  COALESCE(SUM(s.amount), 0) AS settlements_total,
  COALESCE(SUM(e.amount) FILTER (WHERE e.tour_id = t.id), 0) AS tour_expenses_total
FROM tour_runs t
LEFT JOIN gigs g ON g.tour_id = t.id
LEFT JOIN settlements s ON s.tour_id = t.id
LEFT JOIN expenses e ON e.tour_id = t.id
GROUP BY t.id, t.user_id, t.name, t.artist_name, t.notes, t.start_date, t.end_date, t.created_at, t.updated_at;

-- Enable RLS on view
ALTER VIEW v_tour_summary SET (security_invoker = true);

COMMENT ON VIEW v_tour_summary IS 'Aggregated tour data with gig counts and financial totals';
