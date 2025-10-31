#!/bin/bash

# GigLedger Backup Script
# Creates a compressed backup excluding node_modules and cache

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 GigLedger Backup Script${NC}"
echo "================================"

# Create backup directory
BACKUP_DIR="$HOME/Backups/gigledger"
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/gigledger-backup-$TIMESTAMP.tar.gz"

echo -e "\n${BLUE}📦 Creating backup...${NC}"
echo "Source: /Users/johnburkhardt/dev/gigledger"
echo "Destination: $BACKUP_FILE"

# Create compressed backup
tar -czf "$BACKUP_FILE" \
  --exclude='node_modules' \
  --exclude='.expo' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  -C /Users/johnburkhardt/dev gigledger

# Get file size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo -e "\n${GREEN}✅ Backup created successfully!${NC}"
echo "File: $BACKUP_FILE"
echo "Size: $SIZE"

# List recent backups
echo -e "\n${BLUE}📋 Recent backups:${NC}"
ls -lht "$BACKUP_DIR" | head -6

# Optional: Copy to iCloud
read -p "Copy to iCloud Drive? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    ICLOUD_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/GigLedger-Backups"
    mkdir -p "$ICLOUD_DIR"
    cp "$BACKUP_FILE" "$ICLOUD_DIR/"
    echo -e "${GREEN}✅ Copied to iCloud Drive${NC}"
fi

echo -e "\n${GREEN}🎉 Backup complete!${NC}"
echo "To restore: tar -xzf $BACKUP_FILE"
