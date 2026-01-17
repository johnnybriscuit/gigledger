-- Setup cron job to reset monthly limits on the 1st of every month
-- Run this in your Supabase SQL Editor

-- First, ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the cron job
SELECT cron.schedule(
  'reset-monthly-limits',           -- Job name
  '0 0 1 * *',                       -- Cron expression: At 00:00 UTC on day 1 of every month
  $$
  SELECT
    net.http_post(
      url:='https://jvostkeswuhfwntbrfzl.supabase.co/functions/v1/reset-monthly-limits',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2b3N0a2Vzd3VoZndudGJyZnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjg4NDksImV4cCI6MjA3NjIwNDg0OX0.tzh6vU2bfxMk-rqUTtX9JaYwzp_DAaVaU_5G-VPEchg"}'::jsonb
    ) as request_id;
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'reset-monthly-limits';

-- To view execution history later:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reset-monthly-limits')
-- ORDER BY start_time DESC LIMIT 10;

-- To manually test the edge function now:
-- SELECT net.http_post(
--   url:='https://jvostkeswuhfwntbrfzl.supabase.co/functions/v1/reset-monthly-limits',
--   headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2b3N0a2Vzd3VoZndudGJyZnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjg4NDksImV4cCI6MjA3NjIwNDg0OX0.tzh6vU2bfxMk-rqUTtX9JaYwzp_DAaVaU_5G-VPEchg"}'::jsonb
-- );
