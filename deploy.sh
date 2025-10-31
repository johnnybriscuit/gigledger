#!/bin/bash

# Quick deploy script for GigLedger
# Usage: ./deploy.sh "Your commit message"

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 GigLedger Quick Deploy${NC}"
echo "================================"

# Check if commit message provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠️  No commit message provided${NC}"
    read -p "Enter commit message: " COMMIT_MSG
else
    COMMIT_MSG="$1"
fi

# Show what's changed
echo -e "\n${BLUE}📝 Changed files:${NC}"
git status --short

# Confirm
read -p "Deploy these changes? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

# Add all changes
echo -e "\n${BLUE}📦 Adding files...${NC}"
git add .

# Commit
echo -e "${BLUE}💾 Committing...${NC}"
git commit -m "$COMMIT_MSG"

# Push
echo -e "${BLUE}🚀 Pushing to GitHub...${NC}"
git push

echo -e "\n${GREEN}✅ Pushed to GitHub!${NC}"
echo -e "${YELLOW}⏳ Vercel is building... (check https://vercel.com/dashboard)${NC}"
echo -e "${GREEN}🎉 Your changes will be live in ~2-3 minutes!${NC}"
