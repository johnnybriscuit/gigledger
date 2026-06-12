ALTER TABLE public.shared_schedule_links
ADD COLUMN IF NOT EXISTS share_window_days INTEGER NOT NULL DEFAULT 90;
