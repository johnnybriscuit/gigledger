-- Fix existing gigs that have full state names instead of codes
-- This maps common state names to their 2-letter codes

update public.gigs
set state_code = 'NC'
where (state = 'North Carolina' or state_code = 'North Carolina')
  and (state_code is null or state_code = 'North Carolina');

update public.gigs
set state_code = 'OK'
where (state = 'Oklahoma' or state_code = 'Oklahoma')
  and (state_code is null or state_code = 'Oklahoma');

update public.gigs
set state_code = 'TN'
where (state = 'Tennessee' or state_code = 'Tennessee')
  and (state_code is null or state_code = 'Tennessee');

update public.gigs
set state_code = 'NY'
where (state = 'New York' or state_code = 'New York')
  and (state_code is null or state_code = 'New York');

update public.gigs
set state_code = 'CA'
where (state = 'California' or state_code = 'California')
  and (state_code is null or state_code = 'California');

update public.gigs
set state_code = 'TX'
where (state = 'Texas' or state_code = 'Texas')
  and (state_code is null or state_code = 'Texas');

-- Add more states as needed...

-- Verify the fix
select 
  state,
  state_code,
  count(*) as gig_count
from public.gigs
group by state, state_code
order by state_code;
