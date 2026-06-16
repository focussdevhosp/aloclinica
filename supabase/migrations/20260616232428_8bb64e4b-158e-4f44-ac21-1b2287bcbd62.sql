-- Enable Realtime on site_blocks for live Studio sync (Wave 8)
ALTER TABLE public.site_blocks REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'site_blocks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_blocks;
  END IF;
END $$;