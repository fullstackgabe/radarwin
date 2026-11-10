select cron.unschedule(jobname) from cron.job where jobname in ('radar-dispatch', 'radar-sync');

select cron.schedule(
  'radar-dispatch',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'radar-sync',
  '0 9,15 * * *',
  $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'CRON_SECRET'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
