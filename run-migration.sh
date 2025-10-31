#!/bin/bash

# Simple script to run the tax withholding migration
# This connects directly to your Supabase database

echo "🚀 Running Tax Withholding Migration..."
echo ""
echo "Please enter your Supabase database connection details:"
echo ""
read -p "Project Reference ID (from Supabase URL): " PROJECT_REF
read -sp "Database Password: " DB_PASSWORD
echo ""
echo ""

# Construct the connection URL
DB_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo "Connecting to database..."

# Run the migration
psql "$DB_URL" -f supabase/migrations/20250120_add_tax_withholding_tables.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Update your .env.local file with tax variables"
    echo "2. Restart your dev server"
    echo "3. Update your profile with state_code and filing_status"
else
    echo ""
    echo "❌ Migration failed. See error above."
fi
