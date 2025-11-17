-- Fix Maryland county constraint to allow null during onboarding
-- Users can set their county later in tax settings if they're in Maryland

-- Drop the old constraint
ALTER TABLE user_tax_profile
  DROP CONSTRAINT IF EXISTS check_md_county;

-- Add a more lenient constraint that allows null county
-- (Users will be prompted to set county in tax settings if needed)
ALTER TABLE user_tax_profile
  ADD CONSTRAINT check_md_county
  CHECK (
    -- Allow any state with null county (will be set later if needed)
    county IS NULL OR
    -- Or if county is set, state must be MD
    (county IS NOT NULL AND state = 'MD')
  );

-- Add helpful comment
COMMENT ON CONSTRAINT check_md_county ON user_tax_profile IS 
  'Ensures county is only set for Maryland residents. County can be null during onboarding and set later in tax settings.';
