-- Export Views for Tax-Ready Data Exports
-- Copy and paste this entire file into Supabase SQL Editor and click Run

-- 1. Gigs Export View
CREATE OR REPLACE VIEW v_gigs_export AS
SELECT 
  g.user_id,
  g.date,
  p.name AS payer,
  CONCAT_WS(', ', NULLIF(g.city, ''), NULLIF(g.state, '')) AS city_state,
  g.gross_amount,
  g.per_diem,
  g.tips,
  g.fees,
  g.other_income,
  g.net_amount,
  g.notes
FROM gigs g
LEFT JOIN payers p ON g.payer_id = p.id
ORDER BY g.date DESC;

ALTER VIEW v_gigs_export SET (security_invoker = on);

-- 2. Expenses Export View
CREATE OR REPLACE VIEW v_expenses_export AS
SELECT 
  e.user_id,
  e.date,
  e.category,
  e.vendor,
  e.description,
  e.amount,
  e.receipt_url,
  e.notes,
  e.recurring_expense_id
FROM expenses e
ORDER BY e.date DESC;

ALTER VIEW v_expenses_export SET (security_invoker = on);

-- 3. Mileage Export View
CREATE OR REPLACE VIEW v_mileage_export AS
SELECT 
  m.user_id,
  m.date,
  m.start_location AS origin,
  m.end_location AS destination,
  m.purpose,
  m.miles,
  ROUND(m.miles * 0.67, 2) AS deduction_amount,
  m.notes
FROM mileage m
ORDER BY m.date DESC;

ALTER VIEW v_mileage_export SET (security_invoker = on);

-- 4. Payers Export View
CREATE OR REPLACE VIEW v_payers_export AS
SELECT 
  p.user_id,
  p.name,
  p.type,
  p.contact_email,
  p.expect_1099,
  p.notes
FROM payers p
ORDER BY p.name;

ALTER VIEW v_payers_export SET (security_invoker = on);

-- 5. Schedule C Summary Function
CREATE OR REPLACE FUNCTION calculate_schedule_c_summary(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_include_tips BOOLEAN DEFAULT true,
  p_include_fees BOOLEAN DEFAULT true
)
RETURNS TABLE (
  line_name TEXT,
  amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH income AS (
    SELECT 
      'Gross Receipts' AS line_name,
      COALESCE(SUM(
        gross_amount + 
        CASE WHEN p_include_tips THEN COALESCE(tips, 0) ELSE 0 END +
        COALESCE(per_diem, 0) +
        COALESCE(other_income, 0)
      ), 0) AS amount
    FROM gigs
    WHERE user_id = p_user_id
      AND date >= p_start_date
      AND date <= p_end_date
  ),
  fees_deduction AS (
    SELECT 
      'Returns and Allowances' AS line_name,
      COALESCE(SUM(CASE WHEN p_include_fees THEN COALESCE(fees, 0) ELSE 0 END), 0) AS amount
    FROM gigs
    WHERE user_id = p_user_id
      AND date >= p_start_date
      AND date <= p_end_date
  ),
  expenses_by_category AS (
    SELECT 
      category,
      SUM(amount) AS total
    FROM expenses
    WHERE user_id = p_user_id
      AND date >= p_start_date
      AND date <= p_end_date
    GROUP BY category
  ),
  mileage_deduction AS (
    SELECT 
      'Car and Truck Expenses' AS line_name,
      COALESCE(SUM(ROUND(miles * 0.67, 2)), 0) AS amount
    FROM mileage
    WHERE user_id = p_user_id
      AND date >= p_start_date
      AND date <= p_end_date
  )
  SELECT * FROM income
  UNION ALL
  SELECT * FROM fees_deduction
  UNION ALL
  SELECT 
    CASE category
      WHEN 'Travel' THEN 'Travel'
      WHEN 'Meals' THEN 'Meals and Entertainment'
      WHEN 'Lodging' THEN 'Travel'
      WHEN 'Supplies' THEN 'Supplies'
      WHEN 'Marketing' THEN 'Advertising'
      WHEN 'Education' THEN 'Education and Training'
      WHEN 'Software' THEN 'Office Expense'
      WHEN 'Fees' THEN 'Legal and Professional Services'
      WHEN 'Equipment' THEN 'Depreciation'
      WHEN 'Rent' THEN 'Rent or Lease'
      ELSE 'Other Expenses'
    END AS line_name,
    CASE 
      WHEN category = 'Meals' THEN ROUND(total * 0.5, 2)
      ELSE total
    END AS amount
  FROM expenses_by_category
  UNION ALL
  SELECT * FROM mileage_deduction
  ORDER BY line_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_schedule_c_summary TO authenticated;

-- 6. Tax Year Helper Function
CREATE OR REPLACE FUNCTION get_tax_year_range(p_year INTEGER)
RETURNS TABLE (
  start_date DATE,
  end_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    MAKE_DATE(p_year, 1, 1) AS start_date,
    MAKE_DATE(p_year, 12, 31) AS end_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

GRANT EXECUTE ON FUNCTION get_tax_year_range TO authenticated;
