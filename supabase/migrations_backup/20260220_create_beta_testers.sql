-- Create beta_testers table for friends and family allowlist
-- This allows beta testers to bypass subscription paywalls

create table if not exists beta_testers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table beta_testers enable row level security;

-- Policy: Users can only see their own beta status
create policy "Users can view own beta status"
  on beta_testers for select
  using (email = auth.jwt() ->> 'email');

-- Policy: Service role can manage all beta testers (for admin operations)
create policy "Service role can manage beta testers"
  on beta_testers for all
  using (auth.role() = 'service_role');

-- Index for fast email lookups
create index if not exists idx_beta_testers_email on beta_testers(email);
create index if not exists idx_beta_testers_active on beta_testers(active);

-- Add updated_at trigger
create or replace function update_beta_testers_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger beta_testers_updated_at
  before update on beta_testers
  for each row
  execute function update_beta_testers_updated_at();

-- Add some helpful comments
comment on table beta_testers is 'Beta testers who can bypass subscription paywalls';
comment on column beta_testers.email is 'Email address of the beta tester (must match their auth email)';
comment on column beta_testers.active is 'Whether this beta tester currently has access';
comment on column beta_testers.notes is 'Optional notes about this beta tester (e.g., "Friend from college")';
