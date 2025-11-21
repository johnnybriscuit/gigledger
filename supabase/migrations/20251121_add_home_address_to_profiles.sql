-- Add home address fields to profiles table for mileage auto-calculation
-- Migration: 20251121_add_home_address_to_profiles

alter table profiles
  add column if not exists home_address_full text,
  add column if not exists home_address_place_id text,
  add column if not exists home_address_lat double precision,
  add column if not exists home_address_lng double precision;

-- Add comment for documentation
comment on column profiles.home_address_full is 'Full formatted address from Google Places';
comment on column profiles.home_address_place_id is 'Google Places ID for the home address';
comment on column profiles.home_address_lat is 'Latitude of home address for distance calculations';
comment on column profiles.home_address_lng is 'Longitude of home address for distance calculations';
