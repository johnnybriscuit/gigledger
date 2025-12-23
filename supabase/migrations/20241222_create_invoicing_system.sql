-- Invoice Settings Table (one per user)
CREATE TABLE invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  website TEXT,
  logo_url TEXT,
  tax_id TEXT,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
  next_invoice_number INTEGER NOT NULL DEFAULT 1,
  default_payment_terms TEXT DEFAULT 'Net 30',
  default_tax_rate DECIMAL(5,2),
  default_currency TEXT NOT NULL DEFAULT 'USD',
  color_scheme TEXT NOT NULL DEFAULT 'blue',
  font_style TEXT NOT NULL DEFAULT 'modern',
  layout_style TEXT NOT NULL DEFAULT 'classic',
  accepted_payment_methods JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Invoices Table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES payers(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_company TEXT,
  client_address TEXT,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2),
  tax_amount DECIMAL(12,2),
  discount_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_terms TEXT,
  notes TEXT,
  private_notes TEXT,
  accepted_payment_methods JSONB DEFAULT '[]'::jsonb,
  gig_id UUID REFERENCES gigs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  UNIQUE(user_id, invoice_number)
);

-- Invoice Line Items Table
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  rate DECIMAL(12,2) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoice Payments Table
CREATE TABLE invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);

-- RLS Policies
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- Invoice Settings Policies
CREATE POLICY "Users can view their own invoice settings"
  ON invoice_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoice settings"
  ON invoice_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoice settings"
  ON invoice_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Invoices Policies
CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
  ON invoices FOR DELETE
  USING (auth.uid() = user_id);

-- Invoice Line Items Policies
CREATE POLICY "Users can view line items for their invoices"
  ON invoice_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert line items for their invoices"
  ON invoice_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update line items for their invoices"
  ON invoice_line_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete line items for their invoices"
  ON invoice_line_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- Invoice Payments Policies
CREATE POLICY "Users can view payments for their invoices"
  ON invoice_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_payments.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments for their invoices"
  ON invoice_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_payments.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payments for their invoices"
  ON invoice_payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_payments.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payments for their invoices"
  ON invoice_payments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_payments.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- Function to update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid DECIMAL(12,2);
  invoice_total DECIMAL(12,2);
BEGIN
  -- Get total paid for this invoice
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM invoice_payments
  WHERE invoice_id = NEW.invoice_id;

  -- Get invoice total
  SELECT total_amount INTO invoice_total
  FROM invoices
  WHERE id = NEW.invoice_id;

  -- Update invoice status
  IF total_paid >= invoice_total THEN
    UPDATE invoices
    SET status = 'paid', paid_at = NOW(), updated_at = NOW()
    WHERE id = NEW.invoice_id;
  ELSIF total_paid > 0 THEN
    UPDATE invoices
    SET status = 'partially_paid', updated_at = NOW()
    WHERE id = NEW.invoice_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update invoice status when payment is added
CREATE TRIGGER update_invoice_status_on_payment
AFTER INSERT ON invoice_payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_status();

-- Function to update invoice updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_invoice_settings_updated_at
BEFORE UPDATE ON invoice_settings
FOR EACH ROW
EXECUTE FUNCTION update_invoice_updated_at();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_invoice_updated_at();

-- Function to check for overdue invoices
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS void AS $$
BEGIN
  UPDATE invoices
  SET status = 'overdue'
  WHERE due_date < CURRENT_DATE
  AND status IN ('sent', 'viewed', 'partially_paid');
END;
$$ LANGUAGE plpgsql;
