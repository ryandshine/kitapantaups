ALTER TABLE public.aduan
  ADD COLUMN IF NOT EXISTS pic_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS pic_name text;
