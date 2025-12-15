# Performance Audit - Login to Dashboard Flow

## Part A: Current Load Path Analysis

### Authentication Flow
1. **App.tsx** - Initial session check (`getSession()`)
2. **Auth state listener** - Triggers on `SIGNED_IN`
3. **initializeUserData()** - Ensures profile + settings exist (2 queries)
4. **checkOnboarding()** - Fetches profile to check `onboarding_complete` (1 query)
5. **Dashboard mount** - Triggers multiple data fetches

### Dashboard Initial Render Queries

#### Critical Path (blocking render):
- **Profile** (`useQuery` in DashboardScreen) - `profiles` table, `full_name`
- **Tax Profile** (`useTaxProfile`) - `user_tax_profile` table

#### Data Queries (loaded by dashboard components):
- **Gigs** (`useGigs`) - `gigs` table with joins to `payers`, `expenses`, `mileage`
- **Payers** (`usePayers`) - `payers` table
- **Expenses** (`useExpenses`) - `expenses` table
- **Mileage** (`useMileage`) - `mileage` table
- **Recurring Expenses** (`useRecurringExpenses`) - `recurring_expenses` table

#### Computed Data (client-side):
- **Dashboard Data** (`useDashboardData`) - Aggregates gigs, expenses, mileage
- **Tax Calculation** (`useTaxCalculation`) - Computes taxes from net profit

### Identified Bottlenecks

#### 1. **Sequential Waterfall**
- Session check → initializeUserData → checkOnboarding → dashboard queries
- Each step waits for previous to complete
- Total: ~4-5 sequential round trips

#### 2. **Duplicate Queries**
- Profile fetched in `checkOnboarding()` (App.tsx line 93)
- Profile fetched again in `DashboardScreen` (line 64)
- Both query same data but not using shared cache key

#### 3. **Aggressive Invalidation**
- `SIGNED_IN` event calls `queryClient.invalidateQueries()` (App.tsx line 72)
- Invalidates ALL queries, forcing refetch even if data is fresh
- Causes unnecessary network requests

#### 4. **No Loading States**
- Dashboard shows blank until all data loads
- No skeletons or progressive rendering
- User sees nothing for 2-3 seconds

#### 5. **Heavy Initial Bundle**
- All screens imported at top level
- No code splitting or lazy loading
- Larger initial JS bundle

### Proposed Critical Path

**Optimized flow:**
1. Session check (required)
2. **Parallel bootstrap**: profile + settings + tax profile (3 queries in parallel)
3. Check onboarding status from cached profile
4. **Prefetch dashboard data**: gigs + payers (parallel, non-blocking)
5. Render dashboard with skeletons
6. Progressive hydration as data arrives

**Expected improvement:**
- Current: ~4-5 sequential round trips = 2-3s
- Optimized: ~2 parallel batches = 0.8-1.2s
- 50-60% reduction in time to interactive
