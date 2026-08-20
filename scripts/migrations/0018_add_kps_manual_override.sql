-- Tandai koreksi admin agar tidak ditimpa oleh sinkronisasi GoKUPS berikutnya.
ALTER TABLE public.kps
  ADD COLUMN IF NOT EXISTS manual_override boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_kps_manual_override ON public.kps (manual_override);
