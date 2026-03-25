# GigLedger Executive Summary (Draft v1)

## 1. Product Purpose

GigLedger (app package: `bozzy`) is a business operations platform for self-employed musicians and freelancers. It combines income tracking, deduction tracking, mileage, invoicing, tax preparation exports, and subscription monetization in one product.

### Why this exists
- Independent performers typically use fragmented tools (spreadsheets, invoicing apps, tax software).
- GigLedger unifies those workflows so users can capture data once and reuse it across earnings, profitability, invoicing, and tax prep.

---

## 2. Application Architecture

### Frontend
- Cross-platform app built with `React Native + Expo` (`web`, `iOS`, `Android`).
- Main route/orchestration is in `App.tsx`.
- Auth/session/bootstrap logic gates user flows before rendering the authenticated dashboard.

### Data Layer
- `React Query` handles cached queries and mutations.
- Domain hooks (`useGigs`, `useExpenses`, `useMileage`, `useInvoices`, etc.) provide feature-specific data operations.
- Shared auth caching (`sharedAuth`) reduces duplicate `getUser()` calls across hooks.

### Backend
- Supabase Postgres as primary database.
- Supabase Auth for identity/session.
- Supabase Storage for assets (receipts, avatars).
- Supabase Edge Functions for Stripe, OCR receipt processing, email delivery, and maintenance jobs.
- Vercel API routes for security-sensitive proxy endpoints (auth hardening, CSRF tokening, Google API proxying, Stripe webhook handling).

### Why this architecture
- Keeps client fast and cross-platform.
- Preserves strong data isolation via RLS.
- Splits responsibilities cleanly between client hooks, API endpoints, and edge/server automation.

---

## 3. Core User Experience Flow

1. Public landing and legal pages (`landing`, `terms`, `privacy`, `support`).
2. Authentication (magic link, password auth, reset, callback) with optional MFA challenge/setup.
3. Onboarding captures essentials (business + tax setup + first records).
4. Authenticated app shell provides tabs for Dashboard, Contacts, Gigs, Expenses, Mileage, Invoices, Exports, Subscription, Account.
5. Users can continuously track operations, then generate tax-ready exports.

### Why this flow
- Optimizes for fast time-to-value (record first gig/expense quickly).
- Gradually guides users into full compliance and tax readiness.

---

## 4. Feature Summary (What / How / Why)

## 4.1 Authentication & Security
**What:** Sign-in/sign-up, password reset, email verification, MFA (TOTP), backup codes, trusted devices, security event logging.

**How:**
- Screens: `AuthScreen`, `AuthCallbackScreen`, `ForgotPasswordScreen`, `ResetPasswordScreen`, `MFAOnboardingScreen`, `MFAChallengeScreen`, `SecuritySettingsScreen`.
- API hardening: CSRF token endpoint + CSRF validation, rate limiting, anti-bot checks.
- Security state persisted in DB tables (`security_events`, `trusted_devices`, backup code records).

**Why:**
- Protect user financial/tax data.
- Prevent abuse (credential stuffing, spam auth requests, bot traffic).

## 4.2 Dashboard & Navigation
**What:** Unified command center for earnings, expenses, taxes, and quick actions.

**How:**
- `DashboardScreen` renders feature tabs through `AppShell`.
- Uses shared context + aggregated queries for fast rendering.
- Includes onboarding tour and date-range controls.

**Why:**
- Gives users a single operational view and reduces navigation friction.

## 4.3 Gigs & Tours
**What:** Track jobs/gigs, earnings components, payment status, repeat gigs, bulk assignment to tours, calendar integration.

**How:**
- Hook-driven CRUD via `useGigs` and related mutations.
- Tour entities (`tour_runs`, `settlements`) support grouped financial analysis.
- Calendar integration via downloadable ICS on web and native calendar events on mobile.

**Why:**
- Gigs are the revenue source; they anchor all downstream reporting and tax prep.

## 4.4 Expenses & Receipt Assist
**What:** Track expenses, recurring templates, receipt uploads, OCR extraction/suggestions, deductible categorization.

**How:**
- CRUD hooks + recurring expense hooks.
- Receipt-first flow stores files in Supabase Storage.
- `process-receipt` edge function handles extraction and category suggestion.

**Why:**
- Expense capture drives tax savings and improves net-profit visibility.

## 4.5 Mileage
**What:** Track trip mileage and deduction value.

**How:**
- Mileage CRUD via `useMileage`.
- Distance helpers and Google Maps proxy endpoints support assisted entry.

**Why:**
- Mileage is a high-value deduction category for many users.

## 4.6 Contacts & 1099 Center
**What:** Manage payers and subcontractors, including 1099 workflows.

**How:**
- Contacts managed with `usePayers` and `useSubcontractors`.
- 1099 summaries and delivery flow supported by database views + `send-1099-email` edge function.

**Why:**
- Accurate payer/subcontractor records are essential for reconciliation and year-end compliance.

## 4.7 Invoicing
**What:** Create/send/manage invoices, line items, settings, and payment tracking.

**How:**
- Core screen: `InvoicesScreen` with list/form/template/settings/payment modal.
- DB model: `invoice_settings`, `invoices`, `invoice_line_items`, `invoice_payments`.
- Trigger-based status transitions (`draft`, `sent`, `partially_paid`, `paid`, etc.).

**Why:**
- Converts tracked work into collectible revenue with professional client-facing docs.

## 4.8 Exports & Tax Prep
**What:** Export operational and tax data to CPA-ready and software-specific formats.

**How:**
- `ExportsScreen` orchestrates CSV/Excel/JSON/PDF and tax software packs.
- Canonical tax package builder powers output consistency.
- Validation checks enforce export quality before final output.

**Why:**
- Turns bookkeeping activity into actionable tax filing inputs.

## 4.9 Subscriptions & Limits
**What:** Free/pro monetization with usage limits and Stripe billing.

**How:**
- Plan entitlements computed via `useEntitlements`.
- Checkout/portal via Supabase edge functions and Stripe APIs.
- Stripe webhook + sync routines keep plan state consistent in DB.

**Why:**
- Supports sustainable product economics while gating premium value.

## 4.10 Account & Profile Management
**What:** Profile editing, avatar uploads, address/tax setup, payment method details, sign out.

**How:**
- `AccountScreen` + profile/tax hooks + storage uploads.
- User bootstrap ensures required profile/settings records are created idempotently.

**Why:**
- Accurate user metadata powers automation (tax calculations, invoicing defaults, travel calculations).

---

## 5. Data & Security Model

- Data model is user-scoped across core entities (`gigs`, `expenses`, `mileage`, `payers`, `invoices`, `subscriptions`, etc.).
- RLS policies enforce `auth.uid()` ownership boundaries.
- Query keys and auth-cache invalidation reduce cross-user cache leakage risk.
- Additional controls: CSRF protection, rate limits, anti-bot checks, audit/security event logs.

### Why this matters
Financial and tax data requires strict isolation, reliable auditability, and predictable access boundaries.

---

## 6. Operational Automation

- Scheduled/triggered logic exists for invoice status management and overdue marking.
- Monthly free-tier usage reset is automated via edge function.
- Subscription synchronization and webhook processing keep billing and entitlement state aligned.
- Email delivery functions support invoice and 1099 communication workflows.

---

## 7. Current Draft Status

This `v1` draft intentionally captures the full feature map at concise depth.

## Next Expansion Plan (section-by-section)
1. Expand Architecture into component/module diagrams and runtime sequence.
2. Expand each feature section with complete function-level catalogs.
3. Expand Database section with table-by-table purpose and relationship map.
4. Expand API/Edge section with endpoint contracts and security rationale.
5. Add appendix mapping screens/hooks/services/functions to business outcomes.
