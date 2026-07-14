# CLAUDE.md — gigledger (Bozzy)

React Native + Expo 54 · Supabase · Vercel · Stripe. iOS pre-submission
hardening in progress. Simulator: iPhone 17 Pro Max via ios-simulator-mcp/IDB.

## Working style
- Work in phases; one git commit per phase with a descriptive message.
- Minimal diffs: bug fixes and targeted changes only, no opportunistic
  refactors unless the task says so.
- Self-verify every phase in the simulator (screenshots to qa-screens/...).
  Cold-launch (terminate + launch) for launch-related checks, don't just
  reload. Coordinates from ui_describe are viewport-relative — scroll
  elements into view before tapping.
- End every session's report with: root causes found, anything you could not
  verify yourself, and confirmation that account data is back at baseline.

## Account baselines (verify before/after)
YTD-2026 (app UI): 24 gigs / $4,145 take-home / $635 saved · 9 expenses
($1,050.22) · 9 trips (397.6 mi).
All-time (DB): 106 gigs / 27 expenses / 10 trips (402.6 mi; the 10th is real
Oct 2025 history — keep it).
Any test data you create must be clearly labeled (TEST -) and deleted before
the session ends.

## Hard rules
- buildTaxExportPackage.ts is the ONLY Schedule C computation. Never add a
  parallel tax calculation, hook, or RPC. On-screen tax numbers must consume
  this same path.
- Tax-related copy is information-not-advice: "estimates only", "verify with
  your tax professional". Never "you should pay X".
- Heavy libraries (exceljs, jszip, pdf-lib, and anything Node-oriented) are
  dynamic import() at point of use — a static import of these once caused a
  native stack-overflow crash at launch (see commit 9b1ca84).
- All modal forms use the shared infra: useScrollFieldIntoView (keyboard
  avoidance), useSafeAreaInsets (never hardcoded padding), sanitizeAmountInput
  (currency fields). New forms must wire these, not reimplement.
- Expense categories, and any similar option lists, have ONE source of truth.
- Overnight gigs are valid: end time < start time = past midnight; the gig
  belongs to its START date; duration adds 24h when end <= start; end ==
  start means duration unset (never a 24h event).
- Do not modify Supabase schema, navigation structure, or the web app's
  layout unless the task explicitly says so.
- Never commit API keys or secrets. Env notes: EXPO_PUBLIC_SITE_URL points at
  the www host; server Google key lives in Vercel as GOOGLE_MAPS_API_KEY
  (Sensitive), restricted to Places API + Distance Matrix API.

## Session hygiene
- Prefer short, focused sessions over marathons; /compact at phase
  boundaries if the session runs long.
- If resuming after an interruption: run git status + git log --oneline -5
  first and report which phases are committed before continuing.
