CREATE TABLE public.shared_schedule_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) 
                ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  show_amounts  BOOLEAN NOT NULL DEFAULT true,
  show_venues   BOOLEAN NOT NULL DEFAULT true,
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed TIMESTAMPTZ,
  access_count  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_shared_schedule_links_token 
  ON public.shared_schedule_links (token) 
  WHERE is_active = true;

CREATE INDEX idx_shared_schedule_links_user_id 
  ON public.shared_schedule_links (user_id);

ALTER TABLE public.shared_schedule_links 
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own share links"
  ON public.shared_schedule_links
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
