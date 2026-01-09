-- Add trigger to update invoice status when payment is deleted
-- This ensures the invoice status (paid/partially_paid/draft) updates correctly
-- when a payment is removed/undone

-- Update the function to handle both INSERT and DELETE
CREATE OR REPLACE FUNCTION update_invoice_status_on_change()
RETURNS TRIGGER AS $$
DECLARE
  total_paid DECIMAL(12,2);
  invoice_total DECIMAL(12,2);
  target_invoice_id UUID;
BEGIN
  -- Get the invoice_id from either NEW (INSERT) or OLD (DELETE)
  IF TG_OP = 'DELETE' THEN
    target_invoice_id := OLD.invoice_id;
  ELSE
    target_invoice_id := NEW.invoice_id;
  END IF;

  -- Get total paid for this invoice
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM invoice_payments
  WHERE invoice_id = target_invoice_id;

  -- Get invoice total
  SELECT total_amount INTO invoice_total
  FROM invoices
  WHERE id = target_invoice_id;

  -- Update invoice status based on total paid
  IF total_paid >= invoice_total THEN
    -- Fully paid
    UPDATE invoices
    SET status = 'paid', paid_at = NOW(), updated_at = NOW()
    WHERE id = target_invoice_id;
  ELSIF total_paid > 0 THEN
    -- Partially paid
    UPDATE invoices
    SET status = 'partially_paid', paid_at = NULL, updated_at = NOW()
    WHERE id = target_invoice_id;
  ELSE
    -- No payments, revert to sent or draft
    UPDATE invoices
    SET status = CASE 
      WHEN sent_at IS NOT NULL THEN 'sent'
      ELSE 'draft'
    END,
    paid_at = NULL,
    updated_at = NOW()
    WHERE id = target_invoice_id;
  END IF;

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger
DROP TRIGGER IF EXISTS update_invoice_status_on_payment ON invoice_payments;

-- Create new trigger for both INSERT and DELETE
CREATE TRIGGER update_invoice_status_on_payment_change
AFTER INSERT OR DELETE ON invoice_payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_status_on_change();
