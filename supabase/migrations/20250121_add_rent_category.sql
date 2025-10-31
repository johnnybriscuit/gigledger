-- Add 'Rent' to the expense_category enum (note: singular, not plural)
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'Rent';
