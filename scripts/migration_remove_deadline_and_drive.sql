ALTER TABLE public.aduan
  DROP COLUMN IF EXISTS drive_folder_id,
  DROP COLUMN IF EXISTS deadline;

ALTER TABLE public.tindak_lanjut
  DROP COLUMN IF EXISTS link_drive;
