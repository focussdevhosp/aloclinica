SELECT
  j.jobid,
  j.jobname,
  j.schedule,
  j.active,
  d.last_run_finish_at::text AS last_finish,
  d.last_run_status
FROM cron.job j
LEFT JOIN LATERAL (
  SELECT MAX(end_time) AS last_run_finish_at,
         (array_agg(status ORDER BY end_time DESC NULLS LAST))[1] AS last_run_status
  FROM cron.job_run_details
  WHERE jobid = j.jobid
) d ON true
ORDER BY j.jobid;
