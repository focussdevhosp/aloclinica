DO $$
DECLARE r RECORD; ok int := 0; bad int := 0; errs text := '';
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'fn_expire_available_now',
    'fn_auto_close_resolved_tickets',
    'fn_expire_invite_codes',
    'fn_auto_pause_doctor_no_shows',
    'fn_release_doctor_payouts',
    'fn_suggest_price_increase'
  ]) AS name
  LOOP
    BEGIN
      EXECUTE 'SELECT public.' || r.name || '()';
      ok := ok + 1;
    EXCEPTION WHEN OTHERS THEN
      bad := bad + 1;
      errs := errs || r.name || ': ' || SQLERRM || E'\n';
    END;
  END LOOP;
  RAISE NOTICE 'OK: %, FAIL: %', ok, bad;
  IF bad > 0 THEN RAISE NOTICE '%', errs; END IF;
END $$;
SELECT 'fixed_functions_test' AS what, 'see notices above' AS status;
