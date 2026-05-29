INSERT INTO public.master_jenis_tl (nama_jenis_tl) VALUES
  ('Surat/Dokumen Pengadu'),
  ('Surat/Dokumen Pihak Terkait'),
  ('Surat Pemegang PS'),
  ('Surat/ND Internal'),
  ('TL Surat Jawaban'),
  ('TL Nota Dinas'),
  ('TL Notula Rapat'),
  ('TL BA Rapat Pembahasan'),
  ('TL Berita Acara Evaluasi'),
  ('TL Surat Teguran'),
  ('Laporan Pengawasan'),
  ('Laporan Puldasi'),
  ('Notula'),
  ('Berita Acara'),
  ('SK Perubahan'),
  ('SK Pembekuan'),
  ('SK Pencabutan Pembekuan'),
  ('SK Perpanjangan'),
  ('SK Tim Evaluasi'),
  ('Lainnya')
ON CONFLICT (nama_jenis_tl) DO NOTHING;

UPDATE public.tindak_lanjut
SET jenis_tl = CASE jenis_tl
  WHEN 'Telaah Administrasi' THEN 'Surat/Dokumen Pengadu'
  WHEN 'Hasil Telaah Dikembalikan' THEN 'Surat/Dokumen Pihak Terkait'
  WHEN 'Puldasi' THEN 'TL Surat Jawaban'
  WHEN 'Agenda Rapat Pembahasan' THEN 'TL BA Rapat Pembahasan'
  WHEN 'Agenda Evaluasi' THEN 'TL Berita Acara Evaluasi'
  WHEN 'Agenda Pembahasan Hasil Evaluasi' THEN 'TL Notula Rapat'
  WHEN 'ND Perubahan Persetujuan PS' THEN 'TL Nota Dinas'
  WHEN 'Respon pengadu/Pihak ketiga' THEN 'Surat/Dokumen Pihak Terkait'
  WHEN 'Surat Penolakan Aduan' THEN 'TL Surat Jawaban'
  WHEN 'Dokumen Lengkap / Puldasi' THEN 'TL Surat Jawaban'
  WHEN 'Sudah Puldasi / Agenda Rapat Pembahasan' THEN 'TL BA Rapat Pembahasan'
  WHEN 'Surat/Dokumen Pihak lain' THEN 'Surat/Dokumen Pihak Terkait'
  WHEN 'Berita Acara Evaluasi' THEN 'TL Berita Acara Evaluasi'
  ELSE jenis_tl
END
WHERE jenis_tl IN (
  'Telaah Administrasi',
  'Hasil Telaah Dikembalikan',
  'Puldasi',
  'Agenda Rapat Pembahasan',
  'Agenda Evaluasi',
  'Agenda Pembahasan Hasil Evaluasi',
  'ND Perubahan Persetujuan PS',
  'Respon pengadu/Pihak ketiga',
  'Surat Penolakan Aduan',
  'Dokumen Lengkap / Puldasi',
  'Sudah Puldasi / Agenda Rapat Pembahasan',
  'Surat/Dokumen Pihak lain',
  'Berita Acara Evaluasi'
);

UPDATE public.app_activities
SET
  metadata = CASE
    WHEN metadata ? 'jenisTL' THEN jsonb_set(
      metadata,
      '{jenisTL}',
      to_jsonb(
        CASE metadata->>'jenisTL'
          WHEN 'Telaah Administrasi' THEN 'Surat/Dokumen Pengadu'
          WHEN 'Hasil Telaah Dikembalikan' THEN 'Surat/Dokumen Pihak Terkait'
          WHEN 'Puldasi' THEN 'TL Surat Jawaban'
          WHEN 'Agenda Rapat Pembahasan' THEN 'TL BA Rapat Pembahasan'
          WHEN 'Agenda Evaluasi' THEN 'TL Berita Acara Evaluasi'
          WHEN 'Agenda Pembahasan Hasil Evaluasi' THEN 'TL Notula Rapat'
          WHEN 'ND Perubahan Persetujuan PS' THEN 'TL Nota Dinas'
          WHEN 'Respon pengadu/Pihak ketiga' THEN 'Surat/Dokumen Pihak Terkait'
          WHEN 'Surat Penolakan Aduan' THEN 'TL Surat Jawaban'
          WHEN 'Dokumen Lengkap / Puldasi' THEN 'TL Surat Jawaban'
          WHEN 'Sudah Puldasi / Agenda Rapat Pembahasan' THEN 'TL BA Rapat Pembahasan'
          WHEN 'Surat/Dokumen Pihak lain' THEN 'Surat/Dokumen Pihak Terkait'
          WHEN 'Berita Acara Evaluasi' THEN 'TL Berita Acara Evaluasi'
          ELSE metadata->>'jenisTL'
        END
      ),
      true
    )
    ELSE metadata
  END,
  description = REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(
                    REPLACE(
                      REPLACE(
                        REPLACE(
                          REPLACE(description, 'Telaah Administrasi', 'Surat/Dokumen Pengadu'),
                          'Hasil Telaah Dikembalikan', 'Surat/Dokumen Pihak Terkait'
                        ),
                        'Puldasi', 'TL Surat Jawaban'
                      ),
                      'Agenda Rapat Pembahasan', 'TL BA Rapat Pembahasan'
                    ),
                    'Agenda Evaluasi', 'TL Berita Acara Evaluasi'
                  ),
                  'Agenda Pembahasan Hasil Evaluasi', 'TL Notula Rapat'
                ),
                'ND Perubahan Persetujuan PS', 'TL Nota Dinas'
              ),
              'Respon pengadu/Pihak ketiga', 'Surat/Dokumen Pihak Terkait'
            ),
            'Surat Penolakan Aduan', 'TL Surat Jawaban'
          ),
          'Dokumen Lengkap / Puldasi', 'TL Surat Jawaban'
        ),
        'Sudah Puldasi / Agenda Rapat Pembahasan', 'TL BA Rapat Pembahasan'
      ),
      'Surat/Dokumen Pihak lain', 'Surat/Dokumen Pihak Terkait'
    ),
    'Berita Acara Evaluasi', 'TL Berita Acara Evaluasi'
  )
WHERE
  (
    metadata ? 'jenisTL'
    AND metadata->>'jenisTL' IN (
      'Telaah Administrasi',
      'Hasil Telaah Dikembalikan',
      'Puldasi',
      'Agenda Rapat Pembahasan',
      'Agenda Evaluasi',
      'Agenda Pembahasan Hasil Evaluasi',
      'ND Perubahan Persetujuan PS',
      'Respon pengadu/Pihak ketiga',
      'Surat Penolakan Aduan',
      'Dokumen Lengkap / Puldasi',
      'Sudah Puldasi / Agenda Rapat Pembahasan',
      'Surat/Dokumen Pihak lain',
      'Berita Acara Evaluasi'
    )
  )
  OR description LIKE '%Telaah Administrasi%'
  OR description LIKE '%Hasil Telaah Dikembalikan%'
  OR description LIKE '%Puldasi%'
  OR description LIKE '%Agenda Rapat Pembahasan%'
  OR description LIKE '%Agenda Evaluasi%'
  OR description LIKE '%Agenda Pembahasan Hasil Evaluasi%'
  OR description LIKE '%ND Perubahan Persetujuan PS%'
  OR description LIKE '%Respon pengadu/Pihak ketiga%'
  OR description LIKE '%Surat Penolakan Aduan%'
  OR description LIKE '%Dokumen Lengkap / Puldasi%'
  OR description LIKE '%Sudah Puldasi / Agenda Rapat Pembahasan%'
  OR description LIKE '%Surat/Dokumen Pihak lain%'
  OR description LIKE '%Berita Acara Evaluasi%';

DELETE FROM public.master_jenis_tl
WHERE nama_jenis_tl IN (
  'Telaah Administrasi',
  'Hasil Telaah Dikembalikan',
  'Puldasi',
  'Agenda Rapat Pembahasan',
  'Agenda Evaluasi',
  'Agenda Pembahasan Hasil Evaluasi',
  'ND Perubahan Persetujuan PS',
  'Respon pengadu/Pihak ketiga',
  'Surat Penolakan Aduan',
  'Surat/Dokumen Pihak lain',
  'Berita Acara Evaluasi'
);
