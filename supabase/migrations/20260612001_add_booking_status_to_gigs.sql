-- Add booking_status separate from payment status
-- payment status (paid/unpaid) = has money been received
-- booking_status = is the gig confirmed or tentative

ALTER TABLE public.gigs
ADD COLUMN IF NOT EXISTS booking_status TEXT
  NOT NULL DEFAULT 'confirmed'
  CHECK (booking_status IN ('tentative', 'confirmed'));

-- Default all existing gigs to confirmed since they were already logged (implied confirmation)
UPDATE public.gigs
SET booking_status = 'confirmed'
WHERE booking_status IS NULL;
