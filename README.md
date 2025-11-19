# 💼 GigLedger

> A premium expense tracking and tax management platform for freelancers and gig workers, built with React Native and Supabase.

[![React Native](https://img.shields.io/badge/React%20Native-0.74-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-51-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)

## ✨ Features

### 📊 Premium Dashboard
- **Interactive Charts** - Monthly overview, cumulative net profit, expense breakdown, and top payers
- **Real-time Tax Estimates** - Automatic calculation of SE, federal, and state taxes
- **Drill-Through Analysis** - Click any chart to see detailed transactions
- **Smart Date Ranges** - YTD, Last 30/90 days, Last Year, or custom ranges
- **Light/Dark Theme** - Professional design system with theme support

### 💰 Gig Management
- **Inline Expenses & Mileage** - Add expenses and mileage directly when creating gigs
- **Automatic Mileage Calculation** - Google Maps Distance Matrix API integration
- **Live Net Calculator** - Real-time net profit calculation with tax estimates
- **Payer Tracking** - Manage clients and track 1099 expectations
- **Bulk Import** - CSV import for quick data entry

### 📉 Expense Tracking
- **7 Categories** - Travel, Meals, Lodging, Supplies, Equipment, Fees, Other
- **IRS Mileage Rate** - Automatic deduction calculation ($0.70/mile for 2025)
- **Receipt Storage** - Upload and attach receipts to expenses
- **Recurring Expenses** - Set up monthly/quarterly recurring expenses

### 📊 Export Center
- **Schedule C Export** - IRS-ready CSV format for tax filing
- **Custom Date Ranges** - Export any time period
- **TXF Format** - Compatible with TurboTax and other tax software
- **Detailed Reports** - Income, expenses, and mileage breakdowns

### 🎯 Tax Planning
- **Withholding Calculator** - Estimates based on filing status and state
- **Quarterly Reminders** - Track estimated tax payment deadlines
- **Effective Tax Rate** - See your real tax burden
- **Set Aside Recommendations** - Know how much to save from each gig

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio
- Supabase account (free tier works great)

### Installation

```bash
# Clone the repository
git clone https://github.com/johnnybriscuit/gigledger.git
cd gigledger

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start the development server
npm start
```

### Environment Setup

#### Local Development

Create a `.env.local` file with:

```env
# Supabase (Required)
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key

# Site URL (Required)
EXPO_PUBLIC_SITE_URL=http://localhost:8090

# Optional Features
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
EXPO_PUBLIC_DEFAULT_MILEAGE_RATE=0.70
EXPO_PUBLIC_ANTIBOT_ENABLED=false

# Optional: Redis for distributed rate limiting
# UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
# UPSTASH_REDIS_REST_TOKEN=your-token

# Optional: Cloudflare Turnstile (only if ANTIBOT_ENABLED=true)
# TURNSTILE_SECRET_KEY=your-secret-key
```

#### Staging Environment

```env
# Supabase (Required)
EXPO_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key

# Site URL (Required)
EXPO_PUBLIC_SITE_URL=https://staging.gigledger.com

# Optional Features
EXPO_PUBLIC_ANTIBOT_ENABLED=false
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

#### Production Environment

```env
# Supabase (Required)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key

# Site URL (Required)
EXPO_PUBLIC_SITE_URL=https://gigledger.com

# Optional Features
EXPO_PUBLIC_ANTIBOT_ENABLED=false
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Optional: Cloudflare Turnstile (only if ANTIBOT_ENABLED=true)
# TURNSTILE_SECRET_KEY=your-secret-key
```

### Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run migrations in order from `supabase/migrations/`
3. Enable Row Level Security (RLS) policies
4. Set up Storage bucket for receipts (optional)

See [SUPABASE_SETUP_CHECKLIST.md](./SUPABASE_SETUP_CHECKLIST.md) for detailed instructions.

## 🚀 Deployment

### Vercel Deployment

1. **Connect Repository**
   - Import your GitHub repository to Vercel
   - Select the `main` branch for production

2. **Configure Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Use production values for `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SITE_URL`

3. **Deploy**
   - Vercel will automatically build and deploy
   - Note your deployment URL (e.g., `https://gigledger.vercel.app`)

### Supabase Configuration

1. **Update Redirect URLs**
   - Go to Authentication → URL Configuration
   - Add redirect URLs:
     - `https://your-domain.com/auth/callback`
     - `https://your-domain.com/*`
   - For staging: `https://staging.your-domain.com/*`

2. **Email Templates**
   - Customize magic link email template
   - Update confirmation email template
   - Set sender name and email

3. **Rate Limits**
   - Configure Supabase rate limits if needed
   - Our app has additional rate limiting (5 req/10min per IP+email)

### Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Supabase redirect URLs configured
- [ ] Email templates customized
- [ ] Test magic link flow in production
- [ ] Test password signup flow
- [ ] Test MFA enrollment and challenge
- [ ] Verify rate limiting works
- [ ] Check CSRF protection (403 without token)
- [ ] Test tax profile banner appears for new users
- [ ] Monitor logs for audit events

## 🔒 Security Features

### Authentication
- **Hybrid Auth**: Magic link or email+password
- **TOTP MFA**: Enforced after first login with QR code enrollment
- **Email Verification**: Required before app access
- **Recovery Codes**: Generated during MFA setup

### Password Policy
- **Minimum Length**: 10 characters
- **Complexity**: At least one letter and one number
- **Strength Meter**: Real-time visual feedback
- **Server Validation**: Double-checked on backend

### CSRF Protection
- **Double-Submit Pattern**: HttpOnly cookie + header token
- **SameSite=Lax**: Cookie security
- **Token Verification**: All POST requests validated
- **403 on Failure**: Clear error codes

### Rate Limiting
- **5 requests per 10 minutes** per IP+email combination
- **Vercel-Aware**: Proper IP extraction from `x-forwarded-for`
- **Private IP Filtering**: Ignores local/private IPs
- **Redis-Backed**: Distributed rate limiting (with in-memory fallback)
- **429 Response**: Clear retry-after headers

### Audit Logging
- **Structured Logs**: JSON format for easy parsing
- **Privacy-Preserving**: Only hashed email/IP (no PII)
- **Event Tracking**: All auth events logged
  - `magic_link_start | success | rate_limited | csrf_failed | antibot_failed | error`
  - `signup_start | success | rate_limited | csrf_failed | antibot_failed | error`

### API Security
- **POST-Only**: Auth endpoints reject other methods (405)
- **Content-Type Validation**: Requires `application/json` (415)
- **Same-Origin CORS**: No external origins allowed
- **Cache-Control**: `no-store` on sensitive endpoints
- **Vary Header**: Proper cache key variation

### Optional: Anti-Bot Protection
- **Cloudflare Turnstile**: Server-side verification only
- **No UI Widget**: Seamless user experience
- **Toggle**: Enable via `EXPO_PUBLIC_ANTIBOT_ENABLED=true`
- **403 on Failure**: Clear error codes

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

- **Password Validation**: 13 tests
  - Minimum requirements
  - Strength calculation
  - Bonus points
  - Server/client consistency

- **Rate Limiting**: 18 tests
  - IP extraction (Vercel headers)
  - Private IP filtering
  - x-forwarded-for parsing
  - Fallback behavior

- **CSRF Protection**: 4 tests
  - Token generation
  - Verification logic
  - Missing/mismatched tokens
  - Edge cases

### Expected Output

```
Test Suites: X passed, X total
Tests:       35+ passed, 35+ total
Snapshots:   X total
Time:        X.XXX s
```

All tests should pass (green).

## 📱 Platform Support

- **Web** - Full-featured dashboard with Recharts
- **iOS** - Native app with optimized mobile UI
- **Android** - Native app with optimized mobile UI

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React Native + Expo
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: React Query (TanStack Query)
- **Charts**: Recharts (web) + Victory Native (mobile)
- **Styling**: React Native StyleSheet
- **Type Safety**: TypeScript throughout

### Project Structure
```
gigledger/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── dashboard/       # Premium dashboard components
│   │   ├── charts/          # Chart wrappers
│   │   └── gigs/            # Gig-specific components
│   ├── screens/             # Main app screens
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and helpers
│   │   ├── charts/          # Chart color tokens
│   │   └── tax/             # Tax calculation logic
│   ├── services/            # API services
│   ├── contexts/            # React contexts (Theme, etc.)
│   └── types/               # TypeScript definitions
├── supabase/
│   └── migrations/          # Database migrations
└── docs/                    # Additional documentation
```

## 📚 Documentation

- [Premium Dashboard Guide](./PREMIUM_DASHBOARD_SUMMARY.md) - Complete dashboard documentation
- [Quick Start Guide](./DASHBOARD_QUICKSTART.md) - Get started with the dashboard
- [Automatic Mileage](./AUTOMATIC_MILEAGE_SUMMARY.md) - Google Maps integration
- [Gig Form Upgrade](./GIGFORM_UPGRADE_SUMMARY.md) - Inline expenses & mileage
- [Export Center](./EXPORT_CENTER_COMPLETE.md) - Tax export features
- [CSV Import Guide](./CSV_IMPORT_GUIDE.md) - Bulk import instructions
- [Backup Guide](./BACKUP_GUIDE.md) - How to backup and restore

## 🎨 Screenshots

### Dashboard
*Premium dashboard with interactive charts and real-time tax estimates*

### Gig Management
*Inline expenses and automatic mileage calculation*

### Charts & Analytics
*Click any bar to drill through to detailed transactions*

> **Note**: Screenshots coming soon! The app is fully functional.

## 🔧 Development

### Available Scripts

```bash
npm start          # Start Expo dev server
npm run web        # Start web version
npm run ios        # Start iOS simulator
npm run android    # Start Android emulator
npm test           # Run tests (if configured)
```

### Key Features in Development

- [ ] Receipt OCR scanning
- [ ] Mobile push notifications for tax deadlines
- [ ] Multi-year tax comparisons
- [ ] Payer performance analytics
- [ ] Quarterly tax payment tracking

## 🤝 Contributing

This is a personal project, but suggestions and bug reports are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary. All rights reserved.

## 🙏 Acknowledgments

- [Expo](https://expo.dev/) - Amazing React Native framework
- [Supabase](https://supabase.com/) - Backend as a service
- [Recharts](https://recharts.org/) - Beautiful charts for React
- [React Query](https://tanstack.com/query) - Powerful data fetching
- [Google Maps API](https://developers.google.com/maps) - Mileage calculations

## 📞 Support

For questions or issues:
- Check the [documentation](./docs/)
- Review [existing issues](https://github.com/johnnybriscuit/gigledger/issues)
- Create a new issue with detailed information

## 🗺️ Roadmap

### Phase 1: Core Features ✅
- [x] User authentication
- [x] Gig management
- [x] Expense tracking
- [x] Mileage logging
- [x] Basic dashboard
- [x] Tax estimates

### Phase 2: Premium Dashboard ✅
- [x] Interactive charts
- [x] Drill-through analysis
- [x] Theme support
- [x] Date range filtering
- [x] Quick actions

### Phase 3: Advanced Features ✅
- [x] Inline expenses/mileage
- [x] Automatic mileage calculation
- [x] CSV import
- [x] Export center
- [ ] Receipt OCR
- [ ] Goal tracking

### Phase 4: Mobile Optimization 📱
- [ ] Victory Native charts
- [ ] Offline mode
- [ ] Push notifications
- [ ] Camera integration
- [ ] Biometric auth

### Phase 5: Analytics & Insights 📊
- [ ] Year-over-year comparisons
- [ ] Trend predictions
- [ ] Tax optimization suggestions
- [ ] Payer performance analysis

---

**Built with ❤️ for freelancers and gig workers**

*Last updated: October 31, 2025*
