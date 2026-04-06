-- Align mileage exports and Schedule C summaries with year-specific IRS rates.
-- This preserves historical 2023/2024 mileage while keeping 2025 entries on the
-- current configured rate used by the app.

CREATE OR REPLACE VIEW v_mileage_export AS
SELECT
  m.user_id,
  m.date,
  m.start_location AS origin,
  m.end_location AS destination,
  m.purpose,
  m.miles,
  ROUND(
    m.miles * CASE EXTRACT(YEAR FROM m.date)::INT
      WHEN 2023 THEN 0.655
      WHEN 2024 THEN 0.67
      WHEN 2025 THEN 0.70
      ELSE 0.725
    END,
    2
  ) AS deduction_amount,
  m.notes
FROM mileage m
ORDER BY m.date DESC;

ALTER VIEW v_mileage_export SET (security_invoker = on);

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
      SUM(expenses.amount) AS total
    FROM expenses
    WHERE user_id = p_user_id
      AND date >= p_start_date
      AND date <= p_end_date
    GROUP BY category::text
  ),
  mileage_deduction AS (
    SELECT
      'Car and Truck Expenses' AS line_name,
      COALESCE(SUM(ROUND(
        miles * CASE EXTRACT(YEAR FROM date)::INT
          WHEN 2023 THEN 0.655
          WHEN 2024 THEN 0.67
          WHEN 2025 THEN 0.70
          ELSE 0.725
        END,
        2
      )), 0) AS amount
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
      WHEN 'Meals' THEN 'Meals and Entertainment'
      WHEN 'Marketing' THEN 'Advertising'
      WHEN 'Education' THEN 'Education and Training'
      WHEN 'Software' THEN 'Office Expense'
      WHEN 'Fees' THEN 'Legal and Professional Services'
      WHEN 'Equipment' THEN 'Depreciation'
      WHEN 'Rent' THEN 'Rent or Lease'
      ELSE 'Other Expenses'
    END AS line_name,
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

GRANT EXECUTE ON FUNCTION calculate_schedule_c_summary TO authenticated;
