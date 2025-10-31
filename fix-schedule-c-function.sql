-- Fix the calculate_schedule_c_summary function
-- The issue is ambiguous column references

DROP FUNCTION IF EXISTS calculate_schedule_c_summary(UUID, DATE, DATE, BOOLEAN, BOOLEAN);

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
        g.gross_amount + 
        CASE WHEN p_include_tips THEN COALESCE(g.tips, 0) ELSE 0 END +
        COALESCE(g.per_diem, 0) +
        COALESCE(g.other_income, 0)
      ), 0) AS amount
    FROM gigs g
    WHERE g.user_id = p_user_id
      AND g.date >= p_start_date
      AND g.date <= p_end_date
  ),
  fees_deduction AS (
    SELECT 
      'Returns and Allowances' AS line_name,
      COALESCE(SUM(CASE WHEN p_include_fees THEN COALESCE(g.fees, 0) ELSE 0 END), 0) AS amount
    FROM gigs g
    WHERE g.user_id = p_user_id
      AND g.date >= p_start_date
      AND g.date <= p_end_date
  ),
  expenses_by_category AS (
    SELECT 
      e.category,
      SUM(e.amount) AS total
    FROM expenses e
    WHERE e.user_id = p_user_id
      AND e.date >= p_start_date
      AND e.date <= p_end_date
    GROUP BY e.category
  ),
  mileage_deduction AS (
    SELECT 
      'Car and Truck Expenses' AS line_name,
      COALESCE(SUM(ROUND(m.miles * 0.67, 2)), 0) AS amount
    FROM mileage m
    WHERE m.user_id = p_user_id
      AND m.date >= p_start_date
      AND m.date <= p_end_date
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
