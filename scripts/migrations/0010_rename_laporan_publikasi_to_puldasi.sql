UPDATE public.master_jenis_tl
SET nama_jenis_tl = 'Laporan Puldasi'
WHERE nama_jenis_tl = 'Laporan Publikasi';

UPDATE public.tindak_lanjut
SET jenis_tl = 'Laporan Puldasi'
WHERE jenis_tl = 'Laporan Publikasi';

UPDATE public.app_activities
SET
  metadata = CASE
    WHEN metadata ? 'jenisTL' AND metadata->>'jenisTL' = 'Laporan Publikasi'
      THEN jsonb_set(metadata, '{jenisTL}', to_jsonb('Laporan Puldasi'::text), true)
    ELSE metadata
  END,
  description = REPLACE(description, 'Laporan Publikasi', 'Laporan Puldasi')
WHERE
  (metadata ? 'jenisTL' AND metadata->>'jenisTL' = 'Laporan Publikasi')
  OR description LIKE '%Laporan Publikasi%';
