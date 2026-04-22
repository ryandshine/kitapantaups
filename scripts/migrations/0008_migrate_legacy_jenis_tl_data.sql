UPDATE public.tindak_lanjut
SET jenis_tl = CASE jenis_tl
  WHEN 'Telaah Administrasi' THEN 'Surat/Dokumen Pengadu'
  WHEN 'Hasil Telaah Dikembalikan' THEN 'Surat/Dokumen Pihak lain'
  WHEN 'Puldasi' THEN 'TL Surat Jawaban'
  WHEN 'Agenda Rapat Pembahasan' THEN 'TL BA Rapat Pembahasan'
  WHEN 'Agenda Evaluasi' THEN 'Berita Acara Evaluasi'
  WHEN 'Agenda Pembahasan Hasil Evaluasi' THEN 'TL Notula Rapat'
  WHEN 'ND Perubahan Persetujuan PS' THEN 'TL Nota Dinas'
  WHEN 'Respon pengadu/Pihak ketiga' THEN 'Surat/Dokumen Pihak lain'
  WHEN 'Surat Penolakan Aduan' THEN 'TL Surat Jawaban'
  WHEN 'Dokumen Lengkap / Puldasi' THEN 'TL Surat Jawaban'
  WHEN 'Sudah Puldasi / Agenda Rapat Pembahasan' THEN 'TL BA Rapat Pembahasan'
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
  'Sudah Puldasi / Agenda Rapat Pembahasan'
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
          WHEN 'Hasil Telaah Dikembalikan' THEN 'Surat/Dokumen Pihak lain'
          WHEN 'Puldasi' THEN 'TL Surat Jawaban'
          WHEN 'Agenda Rapat Pembahasan' THEN 'TL BA Rapat Pembahasan'
          WHEN 'Agenda Evaluasi' THEN 'Berita Acara Evaluasi'
          WHEN 'Agenda Pembahasan Hasil Evaluasi' THEN 'TL Notula Rapat'
          WHEN 'ND Perubahan Persetujuan PS' THEN 'TL Nota Dinas'
          WHEN 'Respon pengadu/Pihak ketiga' THEN 'Surat/Dokumen Pihak lain'
          WHEN 'Surat Penolakan Aduan' THEN 'TL Surat Jawaban'
          WHEN 'Dokumen Lengkap / Puldasi' THEN 'TL Surat Jawaban'
          WHEN 'Sudah Puldasi / Agenda Rapat Pembahasan' THEN 'TL BA Rapat Pembahasan'
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
                      REPLACE(description, 'Telaah Administrasi', 'Surat/Dokumen Pengadu'),
                      'Hasil Telaah Dikembalikan', 'Surat/Dokumen Pihak lain'
                    ),
                    'Puldasi', 'TL Surat Jawaban'
                  ),
                  'Agenda Rapat Pembahasan', 'TL BA Rapat Pembahasan'
                ),
                'Agenda Evaluasi', 'Berita Acara Evaluasi'
              ),
              'Agenda Pembahasan Hasil Evaluasi', 'TL Notula Rapat'
            ),
            'ND Perubahan Persetujuan PS', 'TL Nota Dinas'
          ),
          'Respon pengadu/Pihak ketiga', 'Surat/Dokumen Pihak lain'
        ),
        'Surat Penolakan Aduan', 'TL Surat Jawaban'
      ),
      'Dokumen Lengkap / Puldasi', 'TL Surat Jawaban'
    ),
    'Sudah Puldasi / Agenda Rapat Pembahasan', 'TL BA Rapat Pembahasan'
  )
WHERE metadata ? 'jenisTL'
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
    'Sudah Puldasi / Agenda Rapat Pembahasan'
  );
