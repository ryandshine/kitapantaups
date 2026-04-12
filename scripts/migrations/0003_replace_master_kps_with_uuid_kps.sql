CREATE EXTENSION IF NOT EXISTS dblink;

DO $$
BEGIN
  IF to_regclass('public.master_kps') IS NOT NULL AND to_regclass('public.master_kps_legacy') IS NULL THEN
    ALTER TABLE public.master_kps RENAME TO master_kps_legacy;
  END IF;

  IF to_regclass('public.master_kps2') IS NOT NULL AND to_regclass('public.master_kps2_legacy') IS NULL THEN
    ALTER TABLE public.master_kps2 RENAME TO master_kps2_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.kps (
  id                  uuid        NOT NULL DEFAULT uuid_generate_v4(),
  source_system       text        NOT NULL DEFAULT 'bigdatapps',
  source_table        text        NOT NULL DEFAULT 'KPS',
  source_skema        text,
  source_raw_id       text,
  source_row_checksum text        NOT NULL,
  nama_kps            text        NOT NULL,
  jenis_kps           text,
  kps_type            text,
  nomor_sk            text,
  tanggal_sk          date,
  skema_pemanfaatan   text,
  balai               text,
  sekwil              text,
  lokasi_prov         text,
  lokasi_kab          text,
  lokasi_kec          text,
  lokasi_desa         text,
  luas_lhl_ha         numeric     DEFAULT 0,
  luas_lhp_ha         numeric     DEFAULT 0,
  luas_lhpt_ha        numeric     DEFAULT 0,
  luas_lhpk_ha        numeric     DEFAULT 0,
  luas_lhk_ha         numeric     DEFAULT 0,
  luas_lapl_ha        numeric     DEFAULT 0,
  lokasi_luas_ha      numeric     DEFAULT 0,
  jumlah_kk           integer     DEFAULT 0,
  jumlah_laki_laki    integer     DEFAULT 0,
  jumlah_perempuan    integer     DEFAULT 0,
  has_skps            boolean     DEFAULT false,
  has_petaps          boolean     DEFAULT false,
  has_rkps            boolean     DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kps_pkey PRIMARY KEY (id),
  CONSTRAINT kps_source_row_checksum_key UNIQUE (source_row_checksum)
);

CREATE INDEX IF NOT EXISTS idx_kps_nama_kps ON public.kps (nama_kps);
CREATE INDEX IF NOT EXISTS idx_kps_nomor_sk ON public.kps (nomor_sk);
CREATE INDEX IF NOT EXISTS idx_kps_source_raw_id ON public.kps (source_raw_id);
CREATE INDEX IF NOT EXISTS idx_kps_source_skema ON public.kps (source_skema);
CREATE INDEX IF NOT EXISTS idx_kps_lokasi_prov ON public.kps (lokasi_prov);
CREATE INDEX IF NOT EXISTS idx_kps_lokasi_kab ON public.kps (lokasi_kab);

CREATE TABLE IF NOT EXISTS public.aduan_kps (
  aduan_id    uuid        NOT NULL REFERENCES public.aduan(id) ON DELETE CASCADE,
  kps_id      uuid        NOT NULL REFERENCES public.kps(id) ON DELETE RESTRICT,
  position    integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aduan_kps_pkey PRIMARY KEY (aduan_id, kps_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_aduan_kps_position ON public.aduan_kps (aduan_id, position);
CREATE INDEX IF NOT EXISTS idx_aduan_kps_kps_id ON public.aduan_kps (kps_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_kps_updated_at'
  ) THEN
    DROP TRIGGER trg_kps_updated_at ON public.kps;
  END IF;
END $$;

CREATE TRIGGER trg_kps_updated_at
  BEFORE UPDATE ON public.kps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

WITH source_rows AS (
  SELECT DISTINCT ON (source_row_checksum)
    source_row_checksum,
    source_skema,
    source_raw_id,
    nama_kps,
    jenis_kps,
    kps_type,
    nomor_sk,
    tanggal_sk,
    skema_pemanfaatan,
    balai,
    sekwil,
    lokasi_prov,
    lokasi_kab,
    lokasi_kec,
    lokasi_desa,
    luas_lhl_ha,
    luas_lhp_ha,
    luas_lhpt_ha,
    luas_lhpk_ha,
    luas_lhk_ha,
    luas_lapl_ha,
    lokasi_luas_ha,
    jumlah_kk,
    jumlah_laki_laki,
    jumlah_perempuan,
    has_skps,
    has_petaps,
    has_rkps
  FROM dblink(
    'host=127.0.0.1 dbname=bigdatapps user=gealgeolgeo password=GeoSecure2026R3set',
    $$
      SELECT
        md5(concat_ws('|',
          coalesce(id, ''),
          coalesce(balai, ''),
          coalesce(sekwil, ''),
          coalesce(provinsi, ''),
          coalesce(kabupaten, ''),
          coalesce(kecamatan, ''),
          coalesce(desa, ''),
          coalesce(surat_keputusan, ''),
          coalesce(skema, ''),
          coalesce(skema_pemanfaatan, ''),
          coalesce(tanggal_sk, ''),
          coalesce(kelompok, ''),
          coalesce("LHL", ''),
          coalesce("LHP", ''),
          coalesce("LHPT", ''),
          coalesce("LHPK", ''),
          coalesce("LHK", ''),
          coalesce("LAPL", ''),
          coalesce(laki_laki, ''),
          coalesce(perempuan, ''),
          coalesce("SKPS", ''),
          coalesce("PETAPS", ''),
          coalesce("RKPS", '')
        )) AS source_row_checksum,
        NULLIF(btrim(skema), '') AS source_skema,
        NULLIF(btrim(id), '') AS source_raw_id,
        COALESCE(NULLIF(btrim(kelompok), ''), NULLIF(btrim(surat_keputusan), ''), concat('KPS ', coalesce(nullif(btrim(id), ''), 'UNKNOWN'))) AS nama_kps,
        NULLIF(btrim(skema), '') AS jenis_kps,
        CASE NULLIF(btrim(skema), '')
          WHEN 'HUTAN DESA' THEN 'PPHD'
          WHEN 'HUTAN KEMASYARAKATAN' THEN 'PPHKM'
          WHEN 'HUTAN TANAMAN RAKYAT' THEN 'PPHTR'
          WHEN 'KEMITRAAN KEHUTANAN' THEN 'PKK'
          WHEN 'HUTAN ADAT' THEN 'PHA'
          WHEN 'HUTAN RAKYAT' THEN 'PHR'
          ELSE NULLIF(btrim(skema), '')
        END AS kps_type,
        NULLIF(btrim(surat_keputusan), '') AS nomor_sk,
        CASE
          WHEN NULLIF(btrim(tanggal_sk), '') ~ '^\d{4}-\d{2}-\d{2}$' THEN NULLIF(btrim(tanggal_sk), '')::date
          ELSE NULL
        END AS tanggal_sk,
        NULLIF(btrim(skema_pemanfaatan), '') AS skema_pemanfaatan,
        NULLIF(btrim(balai), '') AS balai,
        NULLIF(btrim(sekwil), '') AS sekwil,
        NULLIF(btrim(provinsi), '') AS lokasi_prov,
        NULLIF(btrim(kabupaten), '') AS lokasi_kab,
        NULLIF(btrim(kecamatan), '') AS lokasi_kec,
        NULLIF(btrim(desa), '') AS lokasi_desa,
        COALESCE(NULLIF("LHL", '')::numeric, 0) AS luas_lhl_ha,
        COALESCE(NULLIF("LHP", '')::numeric, 0) AS luas_lhp_ha,
        COALESCE(NULLIF("LHPT", '')::numeric, 0) AS luas_lhpt_ha,
        COALESCE(NULLIF("LHPK", '')::numeric, 0) AS luas_lhpk_ha,
        COALESCE(NULLIF("LHK", '')::numeric, 0) AS luas_lhk_ha,
        COALESCE(NULLIF("LAPL", '')::numeric, 0) AS luas_lapl_ha,
        COALESCE(NULLIF("LHL", '')::numeric, 0)
          + COALESCE(NULLIF("LHP", '')::numeric, 0)
          + COALESCE(NULLIF("LHPT", '')::numeric, 0)
          + COALESCE(NULLIF("LHPK", '')::numeric, 0)
          + COALESCE(NULLIF("LHK", '')::numeric, 0)
          + COALESCE(NULLIF("LAPL", '')::numeric, 0) AS lokasi_luas_ha,
        COALESCE(NULLIF(laki_laki, '')::integer, 0) + COALESCE(NULLIF(perempuan, '')::integer, 0) AS jumlah_kk,
        COALESCE(NULLIF(laki_laki, '')::integer, 0) AS jumlah_laki_laki,
        COALESCE(NULLIF(perempuan, '')::integer, 0) AS jumlah_perempuan,
        COALESCE(NULLIF("SKPS", ''), 'N') = 'Y' AS has_skps,
        COALESCE(NULLIF("PETAPS", ''), 'N') = 'Y' AS has_petaps,
        COALESCE(NULLIF("RKPS", ''), 'N') = 'Y' AS has_rkps
      FROM public."KPS"
    $$
  ) AS source_data(
    source_row_checksum text,
    source_skema text,
    source_raw_id text,
    nama_kps text,
    jenis_kps text,
    kps_type text,
    nomor_sk text,
    tanggal_sk date,
    skema_pemanfaatan text,
    balai text,
    sekwil text,
    lokasi_prov text,
    lokasi_kab text,
    lokasi_kec text,
    lokasi_desa text,
    luas_lhl_ha numeric,
    luas_lhp_ha numeric,
    luas_lhpt_ha numeric,
    luas_lhpk_ha numeric,
    luas_lhk_ha numeric,
    luas_lapl_ha numeric,
    lokasi_luas_ha numeric,
    jumlah_kk integer,
    jumlah_laki_laki integer,
    jumlah_perempuan integer,
    has_skps boolean,
    has_petaps boolean,
    has_rkps boolean
  )
  ORDER BY source_row_checksum
)
INSERT INTO public.kps (
  id,
  source_system,
  source_table,
  source_skema,
  source_raw_id,
  source_row_checksum,
  nama_kps,
  jenis_kps,
  kps_type,
  nomor_sk,
  tanggal_sk,
  skema_pemanfaatan,
  balai,
  sekwil,
  lokasi_prov,
  lokasi_kab,
  lokasi_kec,
  lokasi_desa,
  luas_lhl_ha,
  luas_lhp_ha,
  luas_lhpt_ha,
  luas_lhpk_ha,
  luas_lhk_ha,
  luas_lapl_ha,
  lokasi_luas_ha,
  jumlah_kk,
  jumlah_laki_laki,
  jumlah_perempuan,
  has_skps,
  has_petaps,
  has_rkps
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'kitapantaups:kps:' || source_row_checksum),
  'bigdatapps',
  'KPS',
  source_skema,
  source_raw_id,
  source_row_checksum,
  nama_kps,
  jenis_kps,
  kps_type,
  nomor_sk,
  tanggal_sk,
  skema_pemanfaatan,
  balai,
  sekwil,
  lokasi_prov,
  lokasi_kab,
  lokasi_kec,
  lokasi_desa,
  luas_lhl_ha,
  luas_lhp_ha,
  luas_lhpt_ha,
  luas_lhpk_ha,
  luas_lhk_ha,
  luas_lapl_ha,
  lokasi_luas_ha,
  jumlah_kk,
  jumlah_laki_laki,
  jumlah_perempuan,
  has_skps,
  has_petaps,
  has_rkps
FROM source_rows
ON CONFLICT (source_row_checksum) DO UPDATE SET
  source_skema = EXCLUDED.source_skema,
  source_raw_id = EXCLUDED.source_raw_id,
  nama_kps = EXCLUDED.nama_kps,
  jenis_kps = EXCLUDED.jenis_kps,
  kps_type = EXCLUDED.kps_type,
  nomor_sk = EXCLUDED.nomor_sk,
  tanggal_sk = EXCLUDED.tanggal_sk,
  skema_pemanfaatan = EXCLUDED.skema_pemanfaatan,
  balai = EXCLUDED.balai,
  sekwil = EXCLUDED.sekwil,
  lokasi_prov = EXCLUDED.lokasi_prov,
  lokasi_kab = EXCLUDED.lokasi_kab,
  lokasi_kec = EXCLUDED.lokasi_kec,
  lokasi_desa = EXCLUDED.lokasi_desa,
  luas_lhl_ha = EXCLUDED.luas_lhl_ha,
  luas_lhp_ha = EXCLUDED.luas_lhp_ha,
  luas_lhpt_ha = EXCLUDED.luas_lhpt_ha,
  luas_lhpk_ha = EXCLUDED.luas_lhpk_ha,
  luas_lhk_ha = EXCLUDED.luas_lhk_ha,
  luas_lapl_ha = EXCLUDED.luas_lapl_ha,
  lokasi_luas_ha = EXCLUDED.lokasi_luas_ha,
  jumlah_kk = EXCLUDED.jumlah_kk,
  jumlah_laki_laki = EXCLUDED.jumlah_laki_laki,
  jumlah_perempuan = EXCLUDED.jumlah_perempuan,
  has_skps = EXCLUDED.has_skps,
  has_petaps = EXCLUDED.has_petaps,
  has_rkps = EXCLUDED.has_rkps,
  updated_at = now();
