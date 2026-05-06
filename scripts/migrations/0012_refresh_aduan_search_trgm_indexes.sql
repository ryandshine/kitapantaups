CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP INDEX IF EXISTS public.idx_aduan_search_trgm;
CREATE INDEX IF NOT EXISTS idx_aduan_search_trgm
  ON public.aduan
  USING gin (
    (concat_ws(' ',
      surat_nomor,
      pengadu_nama,
      pengadu_instansi,
      kategori_masalah,
      ringkasan_masalah,
      nomor_tiket,
      surat_asal_perihal,
      lokasi_prov,
      lokasi_kab,
      lokasi_kec,
      lokasi_desa
    )) gin_trgm_ops
  );

DROP INDEX IF EXISTS public.idx_kps_search_trgm;
CREATE INDEX IF NOT EXISTS idx_kps_search_trgm
  ON public.kps
  USING gin (
    (concat_ws(' ',
      id::text,
      nama_lembaga,
      surat_keputusan,
      skema,
      raw_payload->>'nama_balai',
      raw_payload->>'seksi_wilayah',
      provinsi,
      kabupaten,
      kecamatan,
      desa
    )) gin_trgm_ops
  );
