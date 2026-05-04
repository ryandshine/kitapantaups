-- ============================================================
-- KITAPANTAUPS - Bootstrap Database untuk Deployment Baru
-- Skema ini merepresentasikan state runtime saat ini.
-- Gunakan file ini untuk environment baru; jangan replay seluruh
-- migrasi legacy karena ada migrasi historis yang hanya relevan
-- untuk perpindahan data lama.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.users (
  id            uuid        NOT NULL DEFAULT uuid_generate_v4(),
  email         text        NOT NULL UNIQUE,
  password_hash text        NOT NULL,
  display_name  text,
  role          text        NOT NULL DEFAULT 'staf' CHECK (role = ANY (ARRAY['admin'::text, 'staf'::text])),
  phone         text,
  photo_url     text,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id                 uuid        NOT NULL DEFAULT uuid_generate_v4(),
  user_id            uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  refresh_token_hash text        NOT NULL UNIQUE,
  expires_at         timestamptz NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.master_status (
  id          serial NOT NULL,
  nama_status text   NOT NULL UNIQUE,
  CONSTRAINT master_status_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.master_kategori_masalah (
  id            serial NOT NULL,
  nama_kategori text   NOT NULL UNIQUE,
  CONSTRAINT master_kategori_masalah_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.master_jenis_tl (
  id            serial NOT NULL,
  nama_jenis_tl text   NOT NULL UNIQUE,
  CONSTRAINT master_jenis_tl_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.kps (
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

CREATE TABLE IF NOT EXISTS public.aduan (
  id                  uuid        NOT NULL DEFAULT uuid_generate_v4(),
  nomor_tiket         text        NOT NULL UNIQUE,
  surat_nomor         text,
  surat_tanggal       date,
  surat_asal_perihal  text,
  pengadu_nama        text,
  pengadu_telepon     text,
  pengadu_email       text,
  pengadu_instansi    text,
  kategori_masalah    text        REFERENCES public.master_kategori_masalah(nama_kategori),
  ringkasan_masalah   text,
  status              text        NOT NULL DEFAULT 'baru' REFERENCES public.master_status(nama_status),
  lokasi_prov         text,
  lokasi_kab          text,
  lokasi_kec          text,
  lokasi_desa         text,
  lokasi_luas_ha      numeric     DEFAULT 0,
  lokasi_lat          text[],
  lokasi_lng          text[],
  jumlah_kk           integer     DEFAULT 0,
  alasan_penolakan    text,
  surat_file_url      text,
  pic_id              uuid        REFERENCES public.users(id),
  pic_name            text,
  created_by          uuid        REFERENCES public.users(id),
  updated_by          uuid        REFERENCES public.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aduan_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.aduan_kps (
  aduan_id    uuid        NOT NULL REFERENCES public.aduan(id) ON DELETE CASCADE,
  kps_id      text        NOT NULL REFERENCES public.kps(id) ON DELETE RESTRICT,
  position    integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aduan_kps_pkey PRIMARY KEY (aduan_id, kps_id)
);

CREATE TABLE IF NOT EXISTS public.aduan_documents (
  id            uuid        NOT NULL DEFAULT uuid_generate_v4(),
  aduan_id      uuid        NOT NULL REFERENCES public.aduan(id) ON DELETE CASCADE,
  file_name     text        NOT NULL,
  file_url      text        NOT NULL,
  file_category text,
  created_by    uuid        REFERENCES public.users(id),
  created_at    timestamptz DEFAULT now(),
  CONSTRAINT aduan_documents_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tindak_lanjut (
  id                  uuid        NOT NULL DEFAULT uuid_generate_v4(),
  aduan_id            uuid        NOT NULL REFERENCES public.aduan(id) ON DELETE CASCADE,
  tanggal             timestamptz NOT NULL,
  jenis_tl            text        NOT NULL REFERENCES public.master_jenis_tl(nama_jenis_tl),
  keterangan          text,
  file_urls           text[],
  nomor_surat_output  text,
  created_by          uuid        REFERENCES public.users(id),
  created_by_name     text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tindak_lanjut_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.app_activities (
  id          uuid        NOT NULL DEFAULT uuid_generate_v4(),
  type        text        NOT NULL,
  description text        NOT NULL,
  aduan_id    uuid        REFERENCES public.aduan(id) ON DELETE SET NULL,
  user_id     uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  user_name   text,
  metadata    jsonb       DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT app_activities_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.ai_summaries (
  id                 uuid        NOT NULL DEFAULT uuid_generate_v4(),
  analysis_id        text        NOT NULL UNIQUE,
  executive_summary  text,
  trend_narrative    text,
  hotspot_narrative  text,
  terrain_narrative  text,
  metadata           jsonb,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  CONSTRAINT ai_summaries_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.settings (
  key        text        NOT NULL,
  value      text        NOT NULL,
  updated_by uuid        REFERENCES public.users(id),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT settings_pkey PRIMARY KEY (key)
);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON public.sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_kps_nama_lembaga ON public.kps(nama_lembaga);
CREATE INDEX IF NOT EXISTS idx_kps_surat_keputusan ON public.kps(surat_keputusan);
CREATE INDEX IF NOT EXISTS idx_kps_skema ON public.kps(skema);
CREATE INDEX IF NOT EXISTS idx_kps_provinsi ON public.kps(provinsi);
CREATE INDEX IF NOT EXISTS idx_kps_kabupaten ON public.kps(kabupaten);
CREATE INDEX IF NOT EXISTS idx_aduan_search_trgm ON public.aduan USING gin (
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
CREATE INDEX IF NOT EXISTS idx_kps_search_trgm ON public.kps USING gin (
  (concat_ws(' ',
    id::text,
    nama_lembaga,
    surat_keputusan,
    skema,
    provinsi,
    kabupaten
  )) gin_trgm_ops
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_aduan_kps_position ON public.aduan_kps(aduan_id, position);
CREATE INDEX IF NOT EXISTS idx_aduan_kps_kps_id ON public.aduan_kps(kps_id);
CREATE INDEX IF NOT EXISTS idx_aduan_status ON public.aduan(status);
CREATE INDEX IF NOT EXISTS idx_aduan_created_at ON public.aduan(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aduan_created_by ON public.aduan(created_by);
CREATE INDEX IF NOT EXISTS idx_aduan_docs_aduan_id ON public.aduan_documents(aduan_id);
CREATE INDEX IF NOT EXISTS idx_tl_aduan_id ON public.tindak_lanjut(aduan_id);
CREATE INDEX IF NOT EXISTS idx_activities_aduan_id ON public.app_activities(aduan_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON public.app_activities(created_at DESC);

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_kps_updated_at ON public.kps;
CREATE TRIGGER trg_kps_updated_at
  BEFORE UPDATE ON public.kps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_aduan_updated_at ON public.aduan;
CREATE TRIGGER trg_aduan_updated_at
  BEFORE UPDATE ON public.aduan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ai_summaries_updated_at ON public.ai_summaries;
CREATE TRIGGER trg_ai_summaries_updated_at
  BEFORE UPDATE ON public.ai_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.master_status (nama_status) VALUES
  ('baru'),
  ('proses'),
  ('menunggu_tanggapan'),
  ('selesai'),
  ('ditolak')
ON CONFLICT (nama_status) DO NOTHING;

INSERT INTO public.master_kategori_masalah (nama_kategori) VALUES
  ('konflik areal'),
  ('perlindungan'),
  ('dan lain-lain')
ON CONFLICT (nama_kategori) DO NOTHING;

INSERT INTO public.master_jenis_tl (nama_jenis_tl) VALUES
  ('Telaah Administrasi'),
  ('Hasil Telaah Dikembalikan'),
  ('Puldasi'),
  ('Agenda Rapat Pembahasan'),
  ('Agenda Evaluasi'),
  ('Agenda Pembahasan Hasil Evaluasi'),
  ('ND Perubahan Persetujuan PS'),
  ('Respon pengadu/Pihak ketiga'),
  ('Surat Penolakan Aduan'),
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

INSERT INTO public.users (email, password_hash, display_name, role) VALUES
  ('admin@kitapantaups.local', crypt('Admin@123', gen_salt('bf')), 'Administrator', 'admin')
ON CONFLICT (email) DO NOTHING;
