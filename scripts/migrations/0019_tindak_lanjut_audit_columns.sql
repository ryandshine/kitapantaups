-- Jejak audit untuk tindak_lanjut: kapan dan siapa terakhir mengubah.
-- Baris lama diisi updated_at = created_at supaya tidak tampak "baru diedit".
ALTER TABLE public.tindak_lanjut
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.users(id);

UPDATE public.tindak_lanjut SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE public.tindak_lanjut
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

DROP TRIGGER IF EXISTS trg_tindak_lanjut_updated_at ON public.tindak_lanjut;
CREATE TRIGGER trg_tindak_lanjut_updated_at
  BEFORE UPDATE ON public.tindak_lanjut
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
