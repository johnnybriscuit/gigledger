-- Add link_type + explicit date range to shared_schedule_links
-- so a token can serve either a rolling upcoming schedule (existing)
-- or a fixed-range gig history share (new).

ALTER TABLE public.shared_schedule_links
  ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'schedule',
  ADD COLUMN IF NOT EXISTS share_start_date DATE,
  ADD COLUMN IF NOT EXISTS share_end_date DATE;

ALTER TABLE public.shared_schedule_links
  ADD CONSTRAINT shared_schedule_links_link_type_check
    CHECK (link_type IN ('schedule', 'history')),
  ADD CONSTRAINT shared_schedule_links_range_check
    CHECK (
      link_type = 'schedule'
      OR (
        share_start_date IS NOT NULL
        AND share_end_date IS NOT NULL
        AND share_start_date <= share_end_date
      )
    );

CREATE INDEX IF NOT EXISTS idx_shared_schedule_links_user_type
  ON public.shared_schedule_links (user_id, link_type)
  WHERE is_active = true;
