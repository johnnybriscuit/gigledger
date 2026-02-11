#!/bin/bash
set -e

echo "Checking out main branch..."
git checkout main

echo "Pulling latest changes..."
git pull origin main

echo "Merging feature/receipt-first-ux..."
git merge feature/receipt-first-ux --no-edit

echo "Pushing to main..."
git push origin main

echo "✅ Successfully merged and deployed to production!"
