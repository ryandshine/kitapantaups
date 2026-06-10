-- Create KUPS table and its indexes
CREATE TABLE IF NOT EXISTS public.kups (
  id               text        NOT NULL,
  lembaga_id       text        NOT NULL REFERENCES public.kps(id) ON DELETE CASCADE,
  nama_kups        text        NOT NULL,
  kelas            text,
  lintang          numeric,
  bujur            numeric,
  potensi          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  produk           jsonb       NOT NULL DEFAULT '[]'::jsonb,
  raw_payload      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  synced_at        timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kups_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_kups_lembaga_id ON public.kups (lembaga_id);
CREATE INDEX IF NOT EXISTS idx_kups_nama_kups ON public.kups (nama_kups);
CREATE INDEX IF NOT EXISTS idx_kups_kelas ON public.kups (kelas);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_kups_updated_at'
  ) THEN
    CREATE TRIGGER trg_kups_updated_at
      BEFORE UPDATE ON public.kups
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
