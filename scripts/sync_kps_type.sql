-- Sinkronisasi kolom kps_type dari master_kps2 ke master_kps
-- Jalankan script ini sekali di database yang sudah existing.

ALTER TABLE public.master_kps
ADD COLUMN IF NOT EXISTS kps_type text;

UPDATE public.master_kps mk
SET kps_type = mk2.kps_type
FROM public.master_kps2 mk2
WHERE mk.id_kps_api = mk2.id_kps_api
  AND mk2.kps_type IS NOT NULL
  AND btrim(mk2.kps_type) <> '';
