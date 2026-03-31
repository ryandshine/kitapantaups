BEGIN;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS refresh_token_hash text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sessions'
      AND column_name = 'refresh_token'
  ) THEN
    EXECUTE $sql$
      UPDATE public.sessions
      SET refresh_token_hash = encode(digest(refresh_token, 'sha256'), 'hex')
      WHERE refresh_token_hash IS NULL
        AND refresh_token IS NOT NULL
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE refresh_token_hash IS NULL
  ) THEN
    RAISE EXCEPTION 'sessions.refresh_token_hash masih NULL; migrasi tidak bisa melanjutkan';
  END IF;
END $$;

ALTER TABLE public.sessions
  ALTER COLUMN refresh_token_hash SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sessions_refresh_token_hash_key'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_refresh_token_hash_key UNIQUE (refresh_token_hash);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash
  ON public.sessions(refresh_token_hash);

ALTER TABLE public.sessions
  DROP COLUMN IF EXISTS refresh_token;

COMMIT;
