-- Replace KPS master with the GoKUPS schema and text-based external IDs.
-- This migration intentionally drops the existing `public.kps` and `public.aduan_kps`
-- structures because the new master uses GoKUPS IDs as the canonical key.

DROP TRIGGER IF EXISTS trg_kps_updated_at ON public.kps;

DROP TABLE IF EXISTS public.aduan_kps;
DROP TABLE IF EXISTS public.kps;

CREATE TABLE public.kps (
  id               text        NOT NULL,
  nama_lembaga     text        NOT NULL,
  surat_keputusan  text,
  tanggal          date,
  skema            text,
  provinsi_id      text,
  kabupaten_id     text,
  kecamatan_id     text,
  desa_id          text,
  provinsi         text,
  kabupaten        text,
  kecamatan        text,
  desa             text,
  luas_hl          numeric     NOT NULL DEFAULT 0,
  luas_hp          numeric     NOT NULL DEFAULT 0,
  luas_hpt         numeric     NOT NULL DEFAULT 0,
  luas_hpk         numeric     NOT NULL DEFAULT 0,
  luas_hk          numeric     NOT NULL DEFAULT 0,
  luas_apl         numeric     NOT NULL DEFAULT 0,
  luas_total       numeric     NOT NULL DEFAULT 0,
  anggota_pria     integer     NOT NULL DEFAULT 0,
  anggota_wanita   integer     NOT NULL DEFAULT 0,
  raw_payload      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  synced_at        timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kps_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_kps_nama_lembaga ON public.kps (nama_lembaga);
CREATE INDEX idx_kps_surat_keputusan ON public.kps (surat_keputusan);
CREATE INDEX idx_kps_skema ON public.kps (skema);
CREATE INDEX idx_kps_provinsi ON public.kps (provinsi);
CREATE INDEX idx_kps_kabupaten ON public.kps (kabupaten);

CREATE TABLE public.aduan_kps (
  aduan_id    uuid        NOT NULL REFERENCES public.aduan(id) ON DELETE CASCADE,
  kps_id      text        NOT NULL REFERENCES public.kps(id) ON DELETE RESTRICT,
  position    integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aduan_kps_pkey PRIMARY KEY (aduan_id, kps_id)
);

CREATE UNIQUE INDEX idx_aduan_kps_position ON public.aduan_kps (aduan_id, position);
CREATE INDEX idx_aduan_kps_kps_id ON public.aduan_kps (kps_id);

CREATE TRIGGER trg_kps_updated_at
  BEFORE UPDATE ON public.kps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
