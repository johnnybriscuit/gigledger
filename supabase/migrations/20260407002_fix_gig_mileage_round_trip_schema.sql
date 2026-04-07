-- Ensure gig-linked mileage metadata exists in the canonical migration history.
-- The app already reads and writes these fields when editing gigs, but they were
-- only present in backup SQL and could be missing in drifted environments.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mileage'
      AND column_name = 'origin'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mileage'
      AND column_name = 'start_location'
  ) THEN
    ALTER TABLE public.mileage RENAME COLUMN origin TO start_location;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mileage'
      AND column_name = 'destination'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mileage'
      AND column_name = 'end_location'
  ) THEN
    ALTER TABLE public.mileage RENAME COLUMN destination TO end_location;
  END IF;
END $$;

ALTER TABLE public.mileage
  ADD COLUMN IF NOT EXISTS gig_id UUID REFERENCES public.gigs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_gig_id UUID REFERENCES public.gigs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_auto_calculated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_round_trip BOOLEAN DEFAULT false;

UPDATE public.mileage
SET gig_id = linked_gig_id
WHERE gig_id IS NULL
  AND linked_gig_id IS NOT NULL;

UPDATE public.mileage
SET linked_gig_id = gig_id
WHERE linked_gig_id IS NULL
  AND gig_id IS NOT NULL;

UPDATE public.mileage
SET is_round_trip = true
WHERE is_round_trip IS NULL
  AND COALESCE(notes, '') ILIKE '%(round trip)%';

UPDATE public.mileage
SET is_round_trip = false
WHERE is_round_trip IS NULL;

UPDATE public.mileage
SET is_auto_calculated = true
WHERE is_auto_calculated IS NULL
  AND COALESCE(notes, '') ILIKE 'Calculated via %';

UPDATE public.mileage
SET is_auto_calculated = false
WHERE is_auto_calculated IS NULL;

CREATE INDEX IF NOT EXISTS idx_mileage_gig_id
ON public.mileage(user_id, gig_id)
WHERE gig_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mileage_linked_gig_id
ON public.mileage(user_id, linked_gig_id)
WHERE linked_gig_id IS NOT NULL;
