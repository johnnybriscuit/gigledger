-- Rename "Meals & Entertainment" to "Meals" (post-TCJA, entertainment is not
-- generally deductible, so the category name should not invite logging it),
-- and add three new expense categories.
--
-- RENAME VALUE relabels the enum in place: every existing expenses.category
-- row that pointed at 'Meals & Entertainment' now reads 'Meals' automatically.
-- No per-row UPDATE is needed and there is no risk of orphaned/split rows.

ALTER TYPE expense_category RENAME VALUE 'Meals & Entertainment' TO 'Meals';

ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'Instrument Repair & Maintenance';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'Dues & Memberships';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'Insurance';

-- calculate_schedule_c_summary() already handled the 'Meals'/'Meals & Entertainment'
-- aliasing defensively (category is cast to text before the CASE, so the enum
-- rename above needs no change here). Add explicit Schedule C line mappings for
-- the 3 new categories so they don't fall into the generic "Other Expenses" bucket.
CREATE OR REPLACE FUNCTION public.calculate_schedule_c_summary(p_user_id uuid, p_start_date date, p_end_date date, p_include_tips boolean DEFAULT true, p_include_fees boolean DEFAULT true)
 RETURNS TABLE(line_name text, amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
      WHEN 'Instrument Repair & Maintenance' THEN 'Repairs and Maintenance'
      WHEN 'Insurance' THEN 'Insurance'
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
$function$;
