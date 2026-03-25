-- Create recurring_expenses table
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  vendor TEXT,
  notes TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday (for weekly)
  day_of_month INT CHECK (day_of_month BETWEEN 1 AND 31), -- for monthly
  month_of_year INT CHECK (month_of_year BETWEEN 1 AND 12), -- for yearly
  next_due_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for user_id
CREATE INDEX idx_recurring_expenses_user_id ON recurring_expenses(user_id);

-- Add index for next_due_date to find upcoming expenses
CREATE INDEX idx_recurring_expenses_next_due_date ON recurring_expenses(next_due_date) WHERE is_active = true;

-- Enable RLS
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own recurring expenses"
  ON recurring_expenses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring expenses"
  ON recurring_expenses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring expenses"
  ON recurring_expenses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring expenses"
  ON recurring_expenses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add recurring_expense_id to expenses table to track which expenses came from templates
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS recurring_expense_id UUID REFERENCES recurring_expenses(id) ON DELETE SET NULL;

-- Add index for recurring_expense_id
CREATE INDEX IF NOT EXISTS idx_expenses_recurring_expense_id ON expenses(recurring_expense_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_recurring_expenses_updated_at
  BEFORE UPDATE ON recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_expenses_updated_at();

-- Function to calculate next due date
CREATE OR REPLACE FUNCTION calculate_next_due_date(
  p_frequency TEXT,
  p_day_of_week INT,
  p_day_of_month INT,
  p_month_of_year INT,
  p_from_date DATE DEFAULT CURRENT_DATE
)
RETURNS DATE AS $$
DECLARE
  v_next_date DATE;
BEGIN
  CASE p_frequency
    WHEN 'weekly' THEN
      -- Find next occurrence of the specified day of week
      v_next_date := p_from_date + ((p_day_of_week - EXTRACT(DOW FROM p_from_date)::INT + 7) % 7);
      IF v_next_date <= p_from_date THEN
        v_next_date := v_next_date + 7;
      END IF;
    
    WHEN 'monthly' THEN
      -- Find next occurrence of the specified day of month
      v_next_date := DATE_TRUNC('month', p_from_date) + (p_day_of_month - 1);
      IF v_next_date <= p_from_date THEN
        v_next_date := DATE_TRUNC('month', p_from_date + INTERVAL '1 month') + (p_day_of_month - 1);
      END IF;
    
    WHEN 'yearly' THEN
      -- Find next occurrence of the specified month and day
      v_next_date := MAKE_DATE(EXTRACT(YEAR FROM p_from_date)::INT, p_month_of_year, p_day_of_month);
      IF v_next_date <= p_from_date THEN
        v_next_date := MAKE_DATE(EXTRACT(YEAR FROM p_from_date)::INT + 1, p_month_of_year, p_day_of_month);
      END IF;
  END CASE;
  
  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
