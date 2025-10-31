# 💼 GigLedger

> A premium expense tracking and tax management platform for freelancers and gig workers, built with React Native and Supabase.

[![React Native](https://img.shields.io/badge/React%20Native-0.74-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-51-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)

## ✨ Features
- 📱 Works on Web and iOS (via Expo Go)
- 🔐 Secure authentication with Supabase
- 📎 Receipt uploads with private storage
- 🎯 Tax-year tracking and reporting

## Prerequisites

- Node.js 18+ (use `nvm use` if you have .nvmrc)
- npm or yarn
- Expo CLI
- Supabase account
- iOS Simulator (for iOS testing)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema in Supabase SQL Editor:
   - Copy contents from `supabase/schema.sql`
   - Execute in your Supabase project
3. Create a storage bucket named `receipts`:
   - Go to Storage in Supabase Dashboard
   - Create new bucket: `receipts`
   - Make it **private**
   - Set file size limit: 5MB
   - Allowed types: `image/*`, `application/pdf`
4. Configure Auth redirects in Supabase Dashboard > Authentication > URL Configuration:
   - Add these to "Redirect URLs":
     ```
     gigledger://auth-callback
     http://localhost:8090
     http://localhost:8090/auth-callback
     exp://localhost:19000/--/auth-callback
     exp://*.exp.direct/--/auth-callback
     ```

### 3. Environment Variables

1. Copy the example env file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your Supabase credentials in `.env.local`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   EXPO_PUBLIC_DEEP_LINK_SCHEME=gigledger
   EXPO_PUBLIC_DEFAULT_MILEAGE_RATE=0.67
   ```

### 4. Generate TypeScript Types (Optional)

If you have Supabase CLI installed:

```bash
npm run supabase:types
```

## Running the App

### Web (Recommended for Development)

```bash
npm run start:web
```

Then open: http://localhost:8090

### iOS Simulator

```bash
npm run start:ios
```

In the Expo terminal:
- Press `s` to switch to Expo Go
- Press `i` to open iOS Simulator

### Standard Expo Start

```bash
npm start
```

## Project Structure

```
gigledger/
├── src/
│   ├── app/              # Navigation and screens
│   ├── components/       # Reusable UI components
│   ├── features/         # Feature modules (gigs, expenses, etc.)
│   ├── lib/              # Supabase client, utilities
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Helper functions
│   └── types/            # TypeScript types
├── supabase/
│   └── schema.sql        # Database schema and RLS policies
├── App.tsx               # App entry point
└── index.ts              # Root entry with polyfills
```

## Key Technologies

- **Expo** - Cross-platform development
- **React Native** - Mobile UI framework
- **Supabase** - Backend (Auth, Database, Storage)
- **TanStack Query** - Data fetching and caching
- **React Navigation** - Navigation
- **NativeWind** - Tailwind CSS for React Native
- **Zod** - Schema validation
- **TypeScript** - Type safety

## Development Commands

- `npm start` - Start Expo dev server
- `npm run start:web` - Start web on port 8090
- `npm run start:ios` - Start with iOS focus
- `npm run typecheck` - Run TypeScript checks
- `npm run supabase:types` - Generate DB types

## Troubleshooting

### Metro bundler issues
```bash
# Clear all caches
npx expo start --clear
watchman watch-del-all
rm -rf node_modules/.cache
```

### Web 500 errors
- Ensure polyfills are imported at app entry (`index.ts`)
- Check that config files use `.cjs` extension
- Verify environment variables are set

### Authentication not working
- Check Supabase redirect URLs are configured
- Verify deep link scheme matches in `app.json`
- Check `.env.local` has correct Supabase credentials

## License

MIT
