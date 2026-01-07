-- Fix calculate_schedule_c_summary function to use updated category enum values
-- The function was still referencing old category names like 'Meals' instead of 'Meals & Entertainment'

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
      category::text AS category,
      SUM(amount) AS total
    FROM expenses
    WHERE user_id = p_user_id
      AND date >= p_start_date
      AND date <= p_end_date
    GROUP BY category::text
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
  -- Map expense categories to Schedule C lines
  -- UPDATED: Use new enum values (e.g., 'Meals & Entertainment' instead of 'Meals')
  SELECT 
    CASE category
      -- Updated category names
      WHEN 'Meals & Entertainment' THEN 'Meals and Entertainment'
      WHEN 'Travel' THEN 'Travel'
      WHEN 'Lodging' THEN 'Travel'
      WHEN 'Supplies' THEN 'Supplies'
      WHEN 'Marketing/Promotion' THEN 'Advertising'
      WHEN 'Education/Training' THEN 'Education and Training'
      WHEN 'Software/Subscriptions' THEN 'Office Expense'
      WHEN 'Professional Fees' THEN 'Legal and Professional Services'
      WHEN 'Equipment/Gear' THEN 'Depreciation'
      WHEN 'Rent/Studio' THEN 'Rent or Lease'
      -- Legacy category names (for backward compatibility)
      WHEN 'Meals' THEN 'Meals and Entertainment'
      WHEN 'Marketing' THEN 'Advertising'
      WHEN 'Education' THEN 'Education and Training'
      WHEN 'Software' THEN 'Office Expense'
      WHEN 'Fees' THEN 'Legal and Professional Services'
      WHEN 'Equipment' THEN 'Depreciation'
      WHEN 'Rent' THEN 'Rent or Lease'
      ELSE 'Other Expenses'
    END AS line_name,
    -- Meals are 50% deductible
    CASE 
      WHEN category IN ('Meals & Entertainment', 'Meals') THEN ROUND(total * 0.5, 2)
      ELSE total
    END AS amount
  FROM expenses_by_category
  UNION ALL
  SELECT * FROM mileage_deduction
  ORDER BY line_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_schedule_c_summary TO authenticated;

-- Add comment
COMMENT ON FUNCTION calculate_schedule_c_summary IS 'Calculate Schedule C summary with updated category enum values. Casts category to text to avoid enum validation errors.';
