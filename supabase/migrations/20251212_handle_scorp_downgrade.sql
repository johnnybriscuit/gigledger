CREATE OR REPLACE FUNCTION handle_subscription_downgrade()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.tier = 'monthly' OR OLD.tier = 'yearly') AND 
     (NEW.tier = 'free' OR NEW.status NOT IN ('active', 'trialing')) THEN
    
    UPDATE profiles
    SET business_structure = 'individual'
    WHERE id = NEW.user_id
      AND business_structure = 'llc_scorp';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_subscription_downgrade ON subscriptions;
CREATE TRIGGER on_subscription_downgrade
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  WHEN (OLD.tier IS DISTINCT FROM NEW.tier OR OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_subscription_downgrade();
