UPDATE public.app_activities
SET description = REPLACE(description, 'Menambahkan tindak lanjut:', 'Menambahkan dokumen tindak lanjut:')
WHERE type = 'create_tl'
  AND description LIKE 'Menambahkan tindak lanjut:%';

UPDATE public.app_activities
SET description = REPLACE(description, 'Memperbarui tindak lanjut:', 'Memperbarui dokumen tindak lanjut:')
WHERE type = 'update_tl'
  AND description LIKE 'Memperbarui tindak lanjut:%';
