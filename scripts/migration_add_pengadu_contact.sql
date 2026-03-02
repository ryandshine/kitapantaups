ALTER TABLE public.aduan
  ADD COLUMN IF NOT EXISTS pengadu_telepon text,
  ADD COLUMN IF NOT EXISTS pengadu_email text;
