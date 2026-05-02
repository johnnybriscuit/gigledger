-- Prevent duplicate Stripe webhook processing
-- Stripe retries webhooks for up to 72 hours; this table deduplicates them
CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  event_id     TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stripe_events_processed_at
  ON processed_stripe_events (processed_at);

ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;

-- Service role only; no user-facing RLS needed
CREATE POLICY "service_role_only" ON public.processed_stripe_events
  USING (false);
