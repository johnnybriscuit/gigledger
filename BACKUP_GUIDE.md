# 🔒 GigLedger Backup & Recovery Guide

## ✅ Current Status
- **Local Git Commit**: ✅ Complete (135 files, 28,307 lines)
- **Commit Hash**: `8c1be9a`
- **Branch**: `main`

## 🚀 Recommended Backup Strategy

### 1. **GitHub (Primary - RECOMMENDED)**

#### Option A: Create New Repository
```bash
# 1. Go to github.com and create a new repository called "gigledger"
# 2. Don't initialize with README (we already have one)
# 3. Copy the repository URL, then run:

cd /Users/johnburkhardt/dev/gigledger
git remote add origin https://github.com/YOUR_USERNAME/gigledger.git
git branch -M main
git push -u origin main
```

#### Option B: Use GitHub CLI (Faster)
```bash
# Install GitHub CLI if not already installed
brew install gh

# Login to GitHub
gh auth login

# Create and push repository
gh repo create gigledger --private --source=. --remote=origin --push
```

**Benefits:**
- ✅ Version history preserved
- ✅ Easy collaboration
- ✅ Free private repositories
- ✅ Accessible from anywhere
- ✅ Built-in backup

---

### 2. **Local Backup (Secondary)**

#### Create Timestamped Backup
```bash
# Create backup directory
mkdir -p ~/Backups/gigledger

# Create compressed backup with timestamp
tar -czf ~/Backups/gigledger/gigledger-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  --exclude='node_modules' \
  --exclude='.expo' \
  --exclude='.git' \
  /Users/johnburkhardt/dev/gigledger

# Verify backup
ls -lh ~/Backups/gigledger/
```

**What's included:**
- All source code
- Configuration files
- Documentation
- Database migrations
- Environment examples

**What's excluded:**
- `node_modules` (can reinstall)
- `.expo` cache
- `.git` (use GitHub for version control)

---

### 3. **Cloud Storage (Tertiary)**

#### Option A: iCloud Drive
```bash
# Copy to iCloud
cp ~/Backups/gigledger/gigledger-backup-*.tar.gz ~/Library/Mobile\ Documents/com~apple~CloudDocs/
```

#### Option B: Dropbox
```bash
# Copy to Dropbox
cp ~/Backups/gigledger/gigledger-backup-*.tar.gz ~/Dropbox/
```

#### Option C: Google Drive
1. Open Google Drive in browser
2. Upload `gigledger-backup-*.tar.gz` from `~/Backups/gigledger/`

---

### 4. **Database Backup (CRITICAL)**

#### Backup Supabase Database
```bash
# Export all migrations (already in repo)
ls -la supabase/migrations/

# Export current database schema
# Go to Supabase Dashboard → SQL Editor → Run:
```

```sql
-- Copy this output and save as backup
SELECT * FROM pg_dump('your_database_name');
```

#### Manual Backup via Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings → Database → Connection string
4. Use `pg_dump` to export:

```bash
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" > ~/Backups/gigledger/database-backup-$(date +%Y%m%d).sql
```

---

## 📦 What's Been Saved

### Code (28,307 lines)
- ✅ All React Native components
- ✅ Dashboard with charts
- ✅ Hooks and services
- ✅ Database migrations
- ✅ Type definitions
- ✅ Configuration files

### Documentation (15 files)
- ✅ Premium Dashboard Summary
- ✅ Quick Start Guide
- ✅ Automatic Mileage Summary
- ✅ Gig Form Upgrade Summary
- ✅ Export Center Guide
- ✅ CSV Import Guide
- ✅ Testing guides
- ✅ Deployment guides

### Configuration
- ✅ Package.json with all dependencies
- ✅ TypeScript config
- ✅ Babel config
- ✅ Metro config
- ✅ Tailwind config
- ✅ Supabase config

---

## 🔄 Recovery Instructions

### From GitHub (Recommended)
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/gigledger.git
cd gigledger

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm start
```

### From Local Backup
```bash
# Extract backup
cd ~
tar -xzf ~/Backups/gigledger/gigledger-backup-TIMESTAMP.tar.gz

# Navigate to project
cd gigledger

# Install dependencies
npm install

# Start development server
npm start
```

### From Cloud Storage
1. Download `gigledger-backup-*.tar.gz`
2. Follow "From Local Backup" steps above

---

## 🔐 Environment Variables Backup

**IMPORTANT**: Never commit `.env` to Git!

Create a secure backup of your environment variables:

```bash
# Encrypt .env file (macOS)
openssl enc -aes-256-cbc -salt -in .env -out ~/Backups/gigledger/.env.encrypted

# To decrypt later:
openssl enc -d -aes-256-cbc -in ~/Backups/gigledger/.env.encrypted -out .env
```

Or manually save these values securely:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GOOGLE_MAPS_API_KEY`

---

## 📅 Backup Schedule (Recommended)

### Daily (Automated)
```bash
# Add to crontab (run: crontab -e)
0 2 * * * cd /Users/johnburkhardt/dev/gigledger && git add . && git commit -m "Daily backup $(date +\%Y-\%m-\%d)" && git push
```

### Weekly (Manual)
- Create local compressed backup
- Upload to cloud storage
- Verify backups are accessible

### Monthly (Manual)
- Export database dump
- Review and clean old backups
- Test recovery process

---

## ✅ Verification Checklist

After backing up, verify:
- [ ] Git commit shows all files: `git log --stat`
- [ ] GitHub repository is accessible (if pushed)
- [ ] Local backup file exists and is not corrupted
- [ ] Cloud storage backup is uploaded
- [ ] Environment variables are saved securely
- [ ] Database migrations are in `supabase/migrations/`
- [ ] Documentation files are included

---

## 🆘 Emergency Recovery

If you lose everything except GitHub:

```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/gigledger.git

# 2. Install dependencies
cd gigledger && npm install

# 3. Recreate .env from memory or password manager
echo "SUPABASE_URL=your_url" > .env
echo "SUPABASE_ANON_KEY=your_key" >> .env

# 4. Run migrations on Supabase
# Go to Supabase Dashboard → SQL Editor
# Run each file in supabase/migrations/ in order

# 5. Start app
npm start
```

---

## 📞 Quick Reference

### Current Backup Locations
1. **Git**: `/Users/johnburkhardt/dev/gigledger/.git`
2. **Local**: `~/Backups/gigledger/` (create this)
3. **GitHub**: (set up recommended)
4. **Cloud**: (optional)

### Important Files to Never Lose
- `package.json` - Dependencies
- `supabase/migrations/*` - Database schema
- `src/` - All source code
- `.env.example` - Environment template
- `*.md` - Documentation

### Recovery Time Estimates
- **From GitHub**: 5-10 minutes
- **From Local Backup**: 10-15 minutes
- **From Cloud Storage**: 15-20 minutes
- **From Scratch**: 40+ hours (don't do this!)

---

## 🎯 Next Steps (DO THIS NOW)

1. **Set up GitHub** (5 minutes)
   ```bash
   gh repo create gigledger --private --source=. --remote=origin --push
   ```

2. **Create Local Backup** (2 minutes)
   ```bash
   mkdir -p ~/Backups/gigledger
   tar -czf ~/Backups/gigledger/gigledger-backup-$(date +%Y%m%d).tar.gz \
     --exclude='node_modules' --exclude='.expo' --exclude='.git' \
     /Users/johnburkhardt/dev/gigledger
   ```

3. **Upload to Cloud** (3 minutes)
   - Copy backup to iCloud/Dropbox/Google Drive

4. **Verify** (1 minute)
   ```bash
   git log --oneline -5
   ls -lh ~/Backups/gigledger/
   ```

---

**Your work is safe in Git!** ✅  
Just push to GitHub for complete peace of mind. 🚀

