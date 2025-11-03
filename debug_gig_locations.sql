-- Debug: Check gig locations
-- Run this in Supabase SQL Editor to see what states have gigs

select 
  state_code,
  count(*) as gig_count,
  array_agg(distinct p.name) as payers,
  min(g.date) as first_gig,
  max(g.date) as last_gig
from public.gigs g
left join public.payers p on g.payer_id = p.id
where state_code is not null
group by state_code
order by state_code;

-- Also check if any gigs are missing state_code
select 
  count(*) as gigs_without_state,
  array_agg(distinct p.name) as payers
from public.gigs g
left join public.payers p on g.payer_id = p.id
where state_code is null or state_code = '';

-- Check specific states you mentioned
select 
  id,
  date,
  state_code,
  country_code,
  (select name from payers where id = gigs.payer_id) as payer_name
from public.gigs
where state_code in ('OK', 'NC')
order by date desc;
