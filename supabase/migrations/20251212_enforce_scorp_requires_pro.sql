CREATE OR REPLACE FUNCTION check_business_structure_plan()
RETURNS TRIGGER AS $$
DECLARE
  user_plan TEXT;
  subscription_tier TEXT;
  subscription_status TEXT;
BEGIN
  IF NEW.business_structure = 'llc_scorp' THEN
    SELECT s.tier, s.status INTO subscription_tier, subscription_status
    FROM subscriptions s
    WHERE s.user_id = NEW.id;
    
    IF subscription_tier IS NULL OR subscription_tier = 'free' OR 
       (subscription_status != 'active' AND subscription_status != 'trialing') THEN
      RAISE EXCEPTION 'SCORP_REQUIRES_PRO: S-Corp mode requires an active Pro subscription'
        USING HINT = 'Please upgrade to GigLedger Pro to use S-Corp business structure';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_scorp_plan ON profiles;
CREATE TRIGGER enforce_scorp_plan
  BEFORE INSERT OR UPDATE OF business_structure ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_business_structure_plan();
