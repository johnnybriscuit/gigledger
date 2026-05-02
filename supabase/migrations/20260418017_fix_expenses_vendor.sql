-- Make vendor column nullable in expenses table
ALTER TABLE expenses ALTER COLUMN vendor DROP NOT NULL;
