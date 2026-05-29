SELECT j.jobname, j.command, d.return_message, d.end_time::text
FROM cron.job j
JOIN LATERAL (
  SELECT return_message, end_time
  FROM cron.job_run_details
  WHERE jobid = j.jobid AND status = 'failed'
  ORDER BY end_time DESC LIMIT 1
) d ON true
WHERE j.jobname IN ('expire-available-now','auto-close-resolved-tickets','expire-invite-codes','suggest-price-increase','auto-pause-doctors','release-doctor-payouts')
ORDER BY j.jobname;
