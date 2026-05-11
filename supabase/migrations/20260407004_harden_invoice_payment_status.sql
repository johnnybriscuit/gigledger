-- Harden invoice payment integrity and status transitions.
-- 1. Prevent zero/negative payments and overpayments at the database layer.
-- 2. Keep overdue/viewed/sent status transitions consistent when payments change.

CREATE OR REPLACE FUNCTION validate_invoice_payment_change()
RETURNS TRIGGER AS $$
DECLARE
  target_invoice_id UUID;
  invoice_total NUMERIC(12,2);
  invoice_status TEXT;
  total_paid_excluding_current NUMERIC(12,2);
BEGIN
  target_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
      RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    SELECT total_amount, status
    INTO invoice_total, invoice_status
    FROM invoices
    WHERE id = target_invoice_id
    FOR UPDATE;

    IF invoice_total IS NULL THEN
      RAISE EXCEPTION 'Invoice not found';
    END IF;

    IF invoice_status = 'cancelled' THEN
      RAISE EXCEPTION 'Cannot record payments for a cancelled invoice';
    END IF;

    SELECT COALESCE(SUM(amount), 0)
    INTO total_paid_excluding_current
    FROM invoice_payments
    WHERE invoice_id = target_invoice_id
      AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

    IF total_paid_excluding_current + NEW.amount > invoice_total THEN
      RAISE EXCEPTION 'Payment amount exceeds the remaining invoice balance';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_invoice_payment_before_change ON invoice_payments;

CREATE TRIGGER validate_invoice_payment_before_change
BEFORE INSERT OR UPDATE ON invoice_payments
FOR EACH ROW
EXECUTE FUNCTION validate_invoice_payment_change();

CREATE OR REPLACE FUNCTION update_invoice_status_on_change()
RETURNS TRIGGER AS $$
DECLARE
  target_invoice_id UUID;
  total_paid NUMERIC(12,2);
  invoice_total NUMERIC(12,2);
  invoice_due_date DATE;
  invoice_sent_at TIMESTAMPTZ;
  invoice_viewed_at TIMESTAMPTZ;
  next_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_invoice_id := OLD.invoice_id;
  ELSE
    target_invoice_id := NEW.invoice_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO total_paid
  FROM invoice_payments
  WHERE invoice_id = target_invoice_id;

  SELECT total_amount, due_date, sent_at, viewed_at
  INTO invoice_total, invoice_due_date, invoice_sent_at, invoice_viewed_at
  FROM invoices
  WHERE id = target_invoice_id;

  IF invoice_total IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF total_paid >= invoice_total AND invoice_total > 0 THEN
    next_status := 'paid';
  ELSIF total_paid > 0 THEN
    next_status := CASE
      WHEN invoice_due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'partially_paid'
    END;
  ELSE
    next_status := CASE
      WHEN invoice_due_date < CURRENT_DATE AND (invoice_sent_at IS NOT NULL OR invoice_viewed_at IS NOT NULL) THEN 'overdue'
      WHEN invoice_viewed_at IS NOT NULL THEN 'viewed'
      WHEN invoice_sent_at IS NOT NULL THEN 'sent'
      ELSE 'draft'
    END;
  END IF;

  UPDATE invoices
  SET
    status = next_status,
    paid_at = CASE
      WHEN next_status = 'paid' THEN COALESCE(paid_at, NOW())
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = target_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invoice_status_on_payment ON invoice_payments;
DROP TRIGGER IF EXISTS update_invoice_status_on_payment_change ON invoice_payments;

CREATE TRIGGER update_invoice_status_on_payment_change
AFTER INSERT OR UPDATE OR DELETE ON invoice_payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_status_on_change();
