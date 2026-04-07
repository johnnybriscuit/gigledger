# GigLedger

GigLedger is an Expo + React Native application for musicians and other self-employed workers to track gigs, expenses, mileage, invoices, subscriptions, and tax-prep exports on top of Supabase.

## Stack

- `Expo` / `React Native` for web + mobile surfaces
- `Supabase` for auth, Postgres, storage, and edge functions
- `React Query` for client data fetching and cache management
- `Stripe` for paid subscriptions

## Local Development

1. Install dependencies:

```bash
npm ci
```

2. Start the app:

```bash
npm run start:web
```

3. Run core verification:

```bash
npm run typecheck
npm run verify:schema
npm test -- --run
```

## Database Source Of Truth

- Active database changes belong in `supabase/migrations`.
- `supabase/schema.sql` is a checked-in bootstrap snapshot and should stay aligned with the active migrations.
- `src/types/database.types.ts` is the generated TypeScript contract for the database shape.
- `npm run verify:schema` checks that critical MFA/security objects exist in all three places.

## Tax And Export Notes

- Canonical tax-prep exports are built from `src/lib/exports/buildTaxExportPackage.ts`.
- Tax withholding values in the planning UI are estimates for reserve guidance unless the underlying jurisdiction data has been explicitly verified.
- Export files organize data for filing and CPA handoff, but they are not tax advice.

## Security Notes

- Stripe checkout/portal flows are handled by Supabase Edge Functions under `supabase/functions`.
- Legacy Vercel Stripe endpoints under `api` are retired.
- Google proxy endpoints under `api/places` and `api/distance.ts` enforce origin checks and shared rate limiting.
