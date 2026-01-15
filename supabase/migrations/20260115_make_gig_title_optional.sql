-- Make gig title optional to reduce friction in gig entry
-- Display name will fall back to: Title -> Venue (location) -> Payer name

ALTER TABLE gigs
ALTER COLUMN title DROP NOT NULL;
