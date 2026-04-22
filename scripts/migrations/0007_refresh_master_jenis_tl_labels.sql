INSERT INTO public.master_jenis_tl (nama_jenis_tl) VALUES
  ('Surat/Dokumen Pengadu'),
  ('Surat/Dokumen Pihak lain'),
  ('TL Surat Jawaban'),
  ('TL Nota Dinas'),
  ('TL BA Rapat Pembahasan'),
  ('TL Notula Rapat'),
  ('Laporan Puldasi'),
  ('Berita Acara Evaluasi'),
  ('Lainnya')
ON CONFLICT (nama_jenis_tl) DO NOTHING;
