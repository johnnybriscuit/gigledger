-- =====================================================================
-- Income Allocation Engine - Phase 1: Database Schema
-- =====================================================================
-- Creates 4 tables for the Income Allocation Engine:
-- 1. allocation_buckets - User-configured allocation buckets
-- 2. allocation_transactions - Historical allocation records
-- 3. financial_tips_dismissed - Tracks dismissed tips
-- 4. rate_benchmarks - Market rate reference data
-- =====================================================================

-- =====================================================================
-- TABLE 1: allocation_buckets
-- =====================================================================
CREATE TABLE public.allocation_buckets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  emoji        TEXT NOT NULL DEFAULT '💰',
  bucket_type  TEXT NOT NULL CHECK (bucket_type IN ('federal_tax', 'state_tax', 'retirement', 'emergency_fund', 'debt', 'goal', 'spendable')),
  percentage   NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  color        TEXT DEFAULT '#2E86AB',
  goal_amount  NUMERIC(10,2),
  goal_name    TEXT,
  goal_date    DATE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- TABLE 2: allocation_transactions
-- =====================================================================
CREATE TABLE public.allocation_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_id           UUID REFERENCES public.gigs(id) ON DELETE SET NULL,
  bucket_id        UUID NOT NULL REFERENCES public.allocation_buckets(id),
  gross_amount     NUMERIC(10,2) NOT NULL,
  allocated_amount NUMERIC(10,2) NOT NULL,
  percentage_used  NUMERIC(5,2) NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- TABLE 3: financial_tips_dismissed
-- =====================================================================
CREATE TABLE public.financial_tips_dismissed (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tip_key      TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tip_key)
);

-- =====================================================================
-- TABLE 4: rate_benchmarks (admin-managed reference data)
-- =====================================================================
CREATE TABLE public.rate_benchmarks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_type     TEXT NOT NULL,
  market_tier  TEXT NOT NULL CHECK (market_tier IN ('major', 'mid', 'small')),
  rate_low     NUMERIC(10,2) NOT NULL,
  rate_high    NUMERIC(10,2) NOT NULL,
  rate_unit    TEXT NOT NULL CHECK (rate_unit IN ('hour', 'day', 'gig', 'song', 'month')),
  notes        TEXT,
  last_updated DATE NOT NULL DEFAULT CURRENT_DATE
);

-- =====================================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE public.allocation_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_tips_dismissed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_benchmarks ENABLE ROW LEVEL SECURITY;

-- allocation_buckets: users can only see and modify their own
CREATE POLICY "Users manage own buckets" ON public.allocation_buckets
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- allocation_transactions: users can only see their own
CREATE POLICY "Users view own transactions" ON public.allocation_transactions
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- financial_tips_dismissed: users manage their own
CREATE POLICY "Users manage own dismissed tips" ON public.financial_tips_dismissed
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- rate_benchmarks: public read, no user writes
CREATE POLICY "Anyone can read rate benchmarks" ON public.rate_benchmarks
  FOR SELECT USING (true);

-- =====================================================================
-- SEED DATA: rate_benchmarks
-- =====================================================================
-- NOTE: Market rates should be reviewed and updated annually.
-- Last updated: May 2026
-- All initial seeds use 'mid' market tier as baseline.
-- =====================================================================

INSERT INTO public.rate_benchmarks (gig_type, market_tier, rate_low, rate_high, rate_unit, notes) VALUES
  -- Music & Performance
  ('Session drumming', 'mid', 200.00, 350.00, 'day', 'Studio session work, typically 3-4 hour sessions'),
  ('Wedding band (per musician)', 'mid', 150.00, 300.00, 'gig', 'Standard 4-hour reception set, higher for ceremony + reception'),
  ('Corporate event', 'mid', 200.00, 400.00, 'gig', 'Includes setup/breakdown, AV requirements may increase rate'),
  ('Studio recording (general)', 'mid', 250.00, 500.00, 'day', 'Full day session, includes engineering and production'),
  ('Live performance (club/bar)', 'mid', 100.00, 250.00, 'gig', 'Typical 2-3 hour set, may include cover or door percentage'),
  ('Music production', 'mid', 500.00, 1500.00, 'song', 'Per-track production, mixing, and mastering'),
  ('Voice over', 'mid', 200.00, 400.00, 'hour', 'Commercial spots, e-learning, audiobooks have different scales'),
  
  -- Creative Services
  ('Graphic design', 'mid', 50.00, 100.00, 'hour', 'Brand identity projects often quoted flat rate $1500-4000'),
  ('Photography', 'mid', 100.00, 250.00, 'hour', 'Event photography, portraits, commercial work varies widely'),
  ('Videography', 'mid', 75.00, 200.00, 'hour', 'Includes editing time, final deliverable pricing varies'),
  ('Copywriting', 'mid', 50.00, 125.00, 'hour', 'Blog posts, web copy, technical writing at different rates'),
  
  -- Tech & Consulting
  ('Freelance web development', 'mid', 75.00, 125.00, 'hour', 'React/Next.js specialists command higher rates'),
  ('GA4/Analytics consulting', 'mid', 100.00, 175.00, 'hour', 'Implementation projects often $1500-4000 flat rate'),
  ('Social media management', 'mid', 500.00, 1200.00, 'month', 'Retainer-based, includes content creation and posting'),
  
  -- Education
  ('Tutoring/Teaching', 'mid', 40.00, 80.00, 'hour', 'Specialized subjects (music theory, test prep) command premium');

-- =====================================================================
-- INDEXES for performance
-- =====================================================================
CREATE INDEX idx_allocation_buckets_user_id ON public.allocation_buckets(user_id);
CREATE INDEX idx_allocation_buckets_user_active ON public.allocation_buckets(user_id, is_active);
CREATE INDEX idx_allocation_transactions_user_id ON public.allocation_transactions(user_id);
CREATE INDEX idx_allocation_transactions_gig_id ON public.allocation_transactions(gig_id);
CREATE INDEX idx_allocation_transactions_bucket_id ON public.allocation_transactions(bucket_id);
CREATE INDEX idx_allocation_transactions_date ON public.allocation_transactions(transaction_date);
CREATE INDEX idx_financial_tips_dismissed_user_id ON public.financial_tips_dismissed(user_id);
CREATE INDEX idx_rate_benchmarks_gig_type ON public.rate_benchmarks(gig_type, market_tier);
