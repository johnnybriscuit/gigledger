# Monthly Limits Reset Edge Function

This Edge Function resets the monthly usage counters for free tier users on the 1st of each month.

## Setup Instructions

### 1. Deploy the Edge Function

```bash
supabase functions deploy reset-monthly-limits
```

### 2. Set up Cron Job in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Extensions**
3. Enable the `pg_cron` extension if not already enabled
4. Go to **SQL Editor** and run:

```sql
-- Create a cron job to reset monthly limits on the 1st of every month at midnight UTC
SELECT cron.schedule(
  'reset-monthly-limits',           -- Job name
  '0 0 1 * *',                       -- Cron expression: At 00:00 on day 1 of every month
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/reset-monthly-limits',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

**Replace:**
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_ANON_KEY` with your Supabase anon/public key

### 3. Verify Cron Job

Check that the cron job was created:

```sql
SELECT * FROM cron.job WHERE jobname = 'reset-monthly-limits';
```

### 4. Test the Function Manually

You can test the function manually before the scheduled run:

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/reset-monthly-limits' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "message": "Reset limits for X free tier users",
  "resetCount": X
}
```

## What It Does

The function:
1. Finds all profiles with `plan = 'free'` AND `legacy_free_plan = false`
2. Resets their usage counters to 0:
   - `gigs_used_this_month`
   - `expenses_used_this_month`
   - `invoices_used_this_month`
   - `exports_used_this_month`
3. Updates `usage_period_start` to the current date
4. Returns the count of users reset

## Monitoring

View cron job execution history:

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reset-monthly-limits')
ORDER BY start_time DESC
LIMIT 10;
```

## Troubleshooting

If the cron job isn't running:

1. Check that `pg_cron` extension is enabled
2. Verify the Edge Function is deployed: `supabase functions list`
3. Check cron job logs in the SQL above
4. Ensure the function URL and authorization are correct
5. Test the function manually with curl to verify it works

## Uninstall

To remove the cron job:

```sql
SELECT cron.unschedule('reset-monthly-limits');
```
