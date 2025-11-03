-- Backfill location data for existing gigs
-- This is a one-time script to add location data to gigs that don't have it

-- Example: Set all gigs without location to US/TN (Tennessee)
-- CUSTOMIZE THIS based on where your gigs actually are!

-- Update all gigs without country_code to US
update public.gigs
set country_code = 'US'
where country_code is null;

-- Update all US gigs without state_code to TN (CHANGE THIS to your state!)
update public.gigs
set state_code = 'TN'
where country_code = 'US' and state_code is null;

-- Verify the update
select 
  country_code,
  state_code,
  count(*) as gig_count
from public.gigs
group by country_code, state_code
order by country_code, state_code;
