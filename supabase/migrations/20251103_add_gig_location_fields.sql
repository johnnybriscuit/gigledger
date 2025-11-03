-- Add location fields to gigs table for map visualization
-- Migration: 20251103_add_gig_location_fields

-- Add country and state columns
alter table public.gigs
  add column if not exists country_code text,     -- ISO-2, e.g., 'US', 'CA', 'GB'
  add column if not exists state_code text;       -- US 2-letter (e.g., 'TN', 'CA'), nullable for non-US

-- Add indexes for efficient filtering
create index if not exists idx_gigs_country on public.gigs(country_code);
create index if not exists idx_gigs_state on public.gigs(state_code);
create index if not exists idx_gigs_country_state on public.gigs(country_code, state_code);

-- Add comment for documentation
comment on column public.gigs.country_code is 'ISO 3166-1 alpha-2 country code (e.g., US, CA, GB)';
comment on column public.gigs.state_code is 'US state 2-letter code (e.g., TN, CA) or province/region code for other countries';

-- Create view for US states aggregation
create or replace view public.v_map_us_states as
select 
  g.state_code,
  count(*) as gigs_count,
  sum(
    coalesce(g.gross_amount, 0) + 
    coalesce(g.tips, 0) + 
    coalesce(g.per_diem, 0) + 
    coalesce(g.other_income, 0) - 
    coalesce(g.fees, 0)
  ) as total_income,
  array_agg(distinct p.name order by p.name) filter (where p.name is not null) as top_payers,
  max(g.date) as last_gig_date,
  g.user_id
from public.gigs g
left join public.payers p on g.payer_id = p.id
where g.country_code = 'US' and g.state_code is not null
group by g.state_code, g.user_id;

-- Add RLS policy for the view
alter view public.v_map_us_states set (security_invoker = true);

-- Create view for world countries aggregation
create or replace view public.v_map_world as
select 
  g.country_code,
  count(*) as gigs_count,
  sum(
    coalesce(g.gross_amount, 0) + 
    coalesce(g.tips, 0) + 
    coalesce(g.per_diem, 0) + 
    coalesce(g.other_income, 0) - 
    coalesce(g.fees, 0)
  ) as total_income,
  array_agg(distinct p.name order by p.name) filter (where p.name is not null) as top_payers,
  max(g.date) as last_gig_date,
  g.user_id
from public.gigs g
left join public.payers p on g.payer_id = p.id
where g.country_code is not null
group by g.country_code, g.user_id;

-- Add RLS policy for the view
alter view public.v_map_world set (security_invoker = true);

-- Grant access to authenticated users
grant select on public.v_map_us_states to authenticated;
grant select on public.v_map_world to authenticated;
