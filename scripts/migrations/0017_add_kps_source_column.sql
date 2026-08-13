-- Tandai asal data pada public.kps agar entri KPS lokal (dibuat manual dari
-- form Aduan Baru) tidak ikut terhapus saat sinkronisasi penuh GoKUPS berjalan.

ALTER TABLE public.kps
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'gokups',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id);

UPDATE public.kps SET source = 'gokups' WHERE source IS DISTINCT FROM 'gokups' AND source IS DISTINCT FROM 'local';

ALTER TABLE public.kps
  DROP CONSTRAINT IF EXISTS kps_source_check,
  ADD CONSTRAINT kps_source_check CHECK (source IN ('gokups', 'local'));

CREATE INDEX IF NOT EXISTS idx_kps_source ON public.kps (source);
