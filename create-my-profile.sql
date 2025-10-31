-- Run this AFTER the main migration to create your profile
-- Replace 'your-user-id' with your actual user ID from auth.users

-- First, find your user ID:
SELECT id, email FROM auth.users;

-- Then create your profile (replace the ID below):
INSERT INTO profiles (id, email, state_code, filing_status)
VALUES (
  'YOUR-USER-ID-HERE',  -- Replace with your ID from above query
  'your-email@example.com',  -- Replace with your email
  'TN',  -- Your state (TN for Tennessee)
  'single'  -- Your filing status
);

-- Or if you want to create for ALL existing users at once:
INSERT INTO profiles (id, email, state_code, filing_status)
SELECT 
  id,
  email,
  'TN',  -- Default state
  'single'  -- Default filing status
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
);
