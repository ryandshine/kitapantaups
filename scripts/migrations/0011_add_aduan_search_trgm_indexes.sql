CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_aduan_search_trgm
  ON public.aduan
  USING gin (
    (concat_ws(' ',
      pengadu_nama,
      ringkasan_masalah,
      nomor_tiket,
      surat_asal_perihal,
      lokasi_prov,
      lokasi_kab,
      lokasi_kec,
      lokasi_desa
    )) gin_trgm_ops
  );

CREATE INDEX IF NOT EXISTS idx_kps_search_trgm
  ON public.kps
  USING gin (
    (concat_ws(' ',
      id::text,
      nama_lembaga,
      surat_keputusan,
      skema,
      provinsi,
      kabupaten
    )) gin_trgm_ops
  );
