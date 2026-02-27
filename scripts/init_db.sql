-- ============================================================
-- SIPANTAUPS - Inisialisasi Database Lokal
-- Database: kitapantaups
-- PostgreSQL 16 (container gealgeolgeo-postgis, port 5433)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABEL USERS (menggantikan auth.users Supabase)
-- ============================================================
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

-- ============================================================
-- TABEL SESSIONS (untuk JWT refresh token)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id            uuid        NOT NULL DEFAULT uuid_generate_v4(),
  user_id       uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  refresh_token text        NOT NULL UNIQUE,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id)
);

-- ============================================================
-- TABEL MASTER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.master_status (
  id          serial      NOT NULL,
  nama_status text        NOT NULL UNIQUE,
  CONSTRAINT master_status_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.master_kategori_masalah (
  id             serial NOT NULL,
  nama_kategori  text   NOT NULL UNIQUE,
  CONSTRAINT master_kategori_masalah_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.master_jenis_tl (
  id           serial NOT NULL,
  nama_jenis_tl text  NOT NULL UNIQUE,
  CONSTRAINT master_jenis_tl_pkey PRIMARY KEY (id)
);

-- ============================================================
-- TABEL MASTER KPS (ringkasan)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.master_kps (
  id             uuid        NOT NULL DEFAULT uuid_generate_v4(),
  id_kps_api     text        UNIQUE,
  nama_kps       text,
  jenis_kps      text,
  nomor_sk       text,
  balai_ps       text,
  lokasi_luas_ha numeric     DEFAULT 0,
  jumlah_kk      integer     DEFAULT 0,
  lokasi_prov    text,
  lokasi_kab     text,
  lokasi_kec     text,
  lokasi_desa    text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  CONSTRAINT master_kps_pkey PRIMARY KEY (id)
);

-- ============================================================
-- TABEL MASTER KPS2 (data lengkap dari API)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.master_kps2 (
  id_kps_api       text NOT NULL,
  kps_type         text,
  nama_kph         text,
  nama_das         text,
  nama_kps         text,
  nama_kontak_kps  text,
  no_kontak_kps    text,
  jml_kk_pria      text,
  jml_kk_wanita    text,
  jml_kk_kps       text,
  jenis_kps        text,
  hhk              text,
  hhbk             text,
  agroforestry     text,
  jasling          text,
  ekosistem        text,
  perikanan        text,
  peternakan       text,
  flora_endemik    text,
  satwa_endemik    text,
  luas_gambut      text,
  luas_mangrove    text,
  stok_karbon      text,
  file_sk          text,
  file_peta        text,
  id_prov          text,
  id_kab           text,
  nama_prov        text,
  nama_kab         text,
  id_usulan        text,
  nama_pemegang    text,
  id_pkk           text,
  nama_kec_kk      text,
  nama_desa_kk     text,
  no_sk_pkk        text,
  tgl_sk_pkk       text,
  luas_hl_pkk      text,
  luas_hpt_pkk     text,
  luas_hp_pkk      text,
  luas_hpk_pkk     text,
  luas_sk_pkk      text,
  kk_id            text,
  id_pphd          text,
  nama_kec_hd      text,
  nama_desa_hd     text,
  no_sk_pphd       text,
  tgl_sk_pphd      text,
  luas_hl_pphd     text,
  luas_hpt_pphd    text,
  luas_hp_pphd     text,
  luas_hpk_pphd    text,
  luas_sk_pphd     text,
  hd_id            text,
  id_pphkm         text,
  nama_kec_hkm     text,
  nama_desa_hkm    text,
  no_sk_pphkm      text,
  tgl_sk_pphkm     text,
  luas_hl_pphkm    text,
  luas_hpt_pphkm   text,
  luas_hp_pphkm    text,
  luas_hpk_pphkm   text,
  luas_sk_pphkm    text,
  hkm_id           text,
  id_pphtr         text,
  nama_kec_htr     text,
  nama_desa_htr    text,
  no_sk_pphtr      text,
  tgl_sk_pphtr     text,
  luas_hpt_pphtr   text,
  luas_hp_pphtr    text,
  luas_hpk_pphtr   text,
  luas_sk_pphtr    text,
  htr_id           text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CONSTRAINT master_kps2_pkey PRIMARY KEY (id_kps_api)
);

-- ============================================================
-- TABEL ADUAN (pengaduan utama)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aduan (
  id                  uuid        NOT NULL DEFAULT uuid_generate_v4(),
  nomor_tiket         text        NOT NULL UNIQUE,
  surat_nomor         text,
  surat_tanggal       date,
  surat_asal_perihal  text,
  pengadu_nama        text,
  pengadu_instansi    text,
  kategori_masalah    text REFERENCES public.master_kategori_masalah(nama_kategori),
  ringkasan_masalah   text,
  status              text        NOT NULL DEFAULT 'baru' REFERENCES public.master_status(nama_status),
  nama_kps            text[],
  jenis_kps           text[],
  nomor_sk            text[],
  id_kps_api          text[],
  lokasi_prov         text,
  lokasi_kab          text,
  lokasi_kec          text,
  lokasi_desa         text,
  lokasi_luas_ha      numeric     DEFAULT 0,
  lokasi_lat          text[],
  lokasi_lng          text[],
  jumlah_kk           integer     DEFAULT 0,
  alasan_penolakan    text,
  drive_folder_id     text,
  surat_file_url      text,
  created_by          uuid        REFERENCES public.users(id),
  updated_by          uuid        REFERENCES public.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aduan_pkey PRIMARY KEY (id)
);

-- ============================================================
-- TABEL ADUAN DOCUMENTS (lampiran dokumen)
-- ============================================================
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

-- ============================================================
-- TABEL TINDAK LANJUT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tindak_lanjut (
  id                  uuid        NOT NULL DEFAULT uuid_generate_v4(),
  aduan_id            uuid        NOT NULL REFERENCES public.aduan(id) ON DELETE CASCADE,
  tanggal             timestamptz NOT NULL,
  jenis_tl            text        NOT NULL REFERENCES public.master_jenis_tl(nama_jenis_tl),
  keterangan          text,
  file_urls           text[],
  nomor_surat_output  text,
  link_drive          text,
  created_by          uuid        REFERENCES public.users(id),
  created_by_name     text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tindak_lanjut_pkey PRIMARY KEY (id)
);

-- ============================================================
-- TABEL APP ACTIVITIES (log aktivitas)
-- ============================================================
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

-- ============================================================
-- TABEL AI SUMMARIES
-- ============================================================
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

-- ============================================================
-- TABEL SETTINGS (konfigurasi aplikasi)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settings (
  key        text        NOT NULL,
  value      text        NOT NULL,
  updated_by uuid        REFERENCES public.users(id),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT settings_pkey PRIMARY KEY (key)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_aduan_status        ON public.aduan(status);
CREATE INDEX IF NOT EXISTS idx_aduan_created_at    ON public.aduan(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aduan_created_by    ON public.aduan(created_by);
CREATE INDEX IF NOT EXISTS idx_tl_aduan_id         ON public.tindak_lanjut(aduan_id);
CREATE INDEX IF NOT EXISTS idx_activities_aduan_id ON public.app_activities(aduan_id);
CREATE INDEX IF NOT EXISTS idx_activities_created  ON public.app_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token      ON public.sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_aduan_docs_aduan_id ON public.aduan_documents(aduan_id);

-- ============================================================
-- TRIGGER: auto update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_aduan_updated_at
  BEFORE UPDATE ON public.aduan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_master_kps_updated_at
  BEFORE UPDATE ON public.master_kps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_master_kps2_updated_at
  BEFORE UPDATE ON public.master_kps2
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ai_summaries_updated_at
  BEFORE UPDATE ON public.ai_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- DATA MASTER (seed awal)
-- ============================================================
INSERT INTO public.master_status (nama_status) VALUES
  ('baru'),
  ('proses'),
  ('selesai'),
  ('ditolak')
ON CONFLICT (nama_status) DO NOTHING;

INSERT INTO public.master_kategori_masalah (nama_kategori) VALUES
  ('Konflik Lahan'),
  ('Batas Wilayah'),
  ('Perizinan'),
  ('Lingkungan'),
  ('Sosial'),
  ('Lainnya')
ON CONFLICT (nama_kategori) DO NOTHING;

INSERT INTO public.master_jenis_tl (nama_jenis_tl) VALUES
  ('Surat Keluar'),
  ('Rapat Koordinasi'),
  ('Verifikasi Lapangan'),
  ('Mediasi'),
  ('Rekomendasi'),
  ('Lainnya')
ON CONFLICT (nama_jenis_tl) DO NOTHING;

-- ============================================================
-- AKUN ADMIN AWAL
-- password: Admin@1234 (bcrypt hash)
-- ============================================================
INSERT INTO public.users (email, password_hash, display_name, role) VALUES
  ('admin@sipantaups.local', crypt('Admin@1234', gen_salt('bf')), 'Administrator', 'admin')
ON CONFLICT (email) DO NOTHING;
