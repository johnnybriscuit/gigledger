ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS business_structure TEXT NOT NULL DEFAULT 'individual';
