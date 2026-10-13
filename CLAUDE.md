# CLAUDE.md — KITAPANTAUPS

Catatan konteks, progres, dan planning untuk agent code.

---

## Ringkasan Proyek

**KITAPANTAUPS** — Sistem Informasi Pengaduan dan Tindak Lanjut UPS
Frontend: React + Vite + Mantine UI + TailwindCSS
Backend: Node.js (Hono) + PostgreSQL Lokal

---

## Stack Teknologi

| Layer | Teknologi |
|-------|-----------|
| Database | PostgreSQL 16 di Docker |
| Auth | JWT lokal |
| API | Node.js + Hono |
| Storage file | Folder lokal (`server/uploads/`) |
| Frontend client | `axios` / `fetch` ke Backend API |

---

## Infrastruktur Database

- **Container**: `gealgeolgeo-postgis` (shared dengan project gealgeolgeo)
- **Port**: `5433` (host) → `5432` (container)
- **Database**: `kitapantaups`
- **User**: `gealgeolgeo`
- **Password**: `GeoSecure2026R3set`
- **Connection string**: `postgresql://gealgeolgeo:GeoSecure2026R3set@localhost:5433/kitapantaups`
- **Script inisialisasi DB**: `scripts/init_db.sql`

### Tabel di `kitapantaups` (state terkini, lihat `scripts/migrations/` untuk histori)
- `users` — autentikasi lokal
- `sessions` — JWT refresh token
- `master_status`, `master_kategori_masalah`, `master_jenis_tl` — data referensi
- `kps` — master KPS/lembaga (lihat bagian **Master Data KPS** di bawah). Menggantikan `master_kps`/`master_kps2` lama (migrasi 0003–0004).
- `kups` — anggota per kelas dalam satu KPS (`lembaga_id` → `kps.id`), disinkron bareng `kps`
- `aduan`, `aduan_documents`, `aduan_kps` (join table aduan ↔ kps, `position` menentukan KPS pertama yang dipakai auto-isi lokasi)
- `tindak_lanjut` — punya jejak audit `created_at/created_by` dan `updated_at/updated_by` (migrasi `0019`; `updated_at` diisi trigger `set_updated_at`, `updated_by` diisi dari `PUT /tindak-lanjut/:id`)
- `app_activities`
- `settings`

> Catatan: `ai_summaries` yang disebut versi lama dokumen ini sudah tidak ada di skema saat ini.

### Akun admin awal
- Email: `riandiekop@gmail.com`
- Password: `Admin@123`

> ⚠️ Kredensial ini tersimpan plaintext di file yang di-commit ke git. Kalau ini akun admin yang benar-benar dipakai di production (bukan sekadar seed lokal), sebaiknya rotate password-nya dan simpan di tempat lain (secret manager / `.env`), bukan di CLAUDE.md.

---

## Master Data KPS (`public.kps`)

`kps` adalah cermin dari API eksternal **GoKUPS** (`https://gokups.hutsos.kehutanan.go.id/api/v1/kps`), disinkron lewat `server/src/services/kps-sync.service.ts`. Sinkronisasi penuh (`POST /master/kps/sync`, admin-only) melakukan upsert semua baris dari API, lalu **menghapus** baris yang tidak lagi muncul di API — kecuali baris itu sudah dipakai di `aduan_kps`, atau `source = 'local'`.

Kolom penanda (ditambahkan migrasi `0017`–`0018`):
- `source` (`'gokups'` | `'local'`) — `'local'` = dibuat manual lewat form Aduan Baru saat lembaga belum ada di GoKUPS (ID berprefix `local-<uuid>`). Baris `local` **tidak pernah dihapus** oleh sinkronisasi.
- `manual_override` (boolean) — di-set `true` saat admin mengoreksi data KPS lewat `PATCH /master/kps/:id`. Field yang di-override (nama, SK, lokasi, luas, anggota) **tidak akan ditimpa balik** oleh sinkronisasi GoKUPS berikutnya (lihat `CASE WHEN manual_override THEN ... ELSE EXCLUDED...` di `upsertRows`).
- `created_by` — user yang membuat entri lokal.

Endpoint terkait (`server/src/routes/master.ts`):
- `GET /master/kps?search=&page=&limit=` — pencarian (dipakai `KpsSearch.tsx`)
- `POST /master/kps` — buat KPS lokal baru (user biasa boleh, Provinsi & Kabupaten wajib diisi — mencegah bug lokasi kosong yang pernah terjadi 2026-08-13)
- `PATCH /master/kps/:id` — koreksi data KPS oleh admin (set `manual_override=true`)
- `POST /master/kps/sync` — trigger sinkronisasi penuh dari GoKUPS (admin-only)

Dokumentasi desain awal fitur ini: `docs/superpowers/plans/2026-08-13-kps-tambah-manual.md` dan `docs/superpowers/specs/2026-08-13-kps-tambah-manual-design.md`.

**Kalau nambah kolom baru ke `public.kps` atau ubah logika sync**, cek dulu apakah perlu masuk ke klausa `CASE WHEN manual_override` di `kps-sync.service.ts` — kalau lupa, sinkronisasi berikutnya bisa menimpa balik koreksi manual admin.

---

## Deployment

Production jalan di **Docker Swarm lewat Dokploy** (bukan lagi GitHub Actions CI/CD — workflow-nya sudah dihapus).

- Service API: `kitapantaups-kitapantaupsapi-vhzzlo` (port internal `4000`, bukan `3001` dari `.env` lokal)
- Service Frontend: `kitapantaups-kitapantaupsfrontend-ffacpy`
- Kode di-sync ke `/etc/dokploy/applications/<nama-app>/code` sebelum Dokploy build & restart container.
- Trigger manual: `scripts/deploy-dokploy.sh` — butuh `sudo` (rsync ke direktori Dokploy) dan dua env var `DOKPLOY_API_WEBHOOK_URL` / `DOKPLOY_FRONTEND_WEBHOOK_URL` (webhook token, jangan pernah commit nilainya).
- **Push ke `origin/main` TIDAK otomatis deploy** — sudah diverifikasi langsung (2026-08-13): service Docker Swarm tidak ter-update walau sudah push. Deploy harus dipicu manual (lewat script di atas, atau dashboard Dokploy).
- Cek status deploy: `docker service inspect <nama-service> --format '{{.UpdatedAt}}'` untuk lihat kapan terakhir di-update, atau `docker service ps <nama-service>` untuk lihat riwayat task.

---

## Status Progres

### ✅ Selesai
- [x] Migrasi skema dari Supabase ke PostgreSQL lokal
- [x] Implementasi Backend API (Hono)
- [x] Implementasi Autentikasi JWT
- [x] Migrasi Frontend Service Layer (semua pakai API lokal)
- [x] Implementasi File Upload ke folder lokal
- [x] Pembersihan total semua kode/file terkait Supabase
- [x] Migrasi KPS ke skema GoKUPS (`public.kps`, teks ID eksternal) — migrasi 0003–0004
- [x] Fitur Tambah KPS Manual + proteksi sinkronisasi (`source`, `manual_override`) — 2026-08-13
- [x] Perbaikan data Provinsi/Kabupaten kosong pada 17 aduan hasil import massal — 2026-08-13

---

## File Penting

| File | Keterangan |
|------|-----------|
| `server/src/index.ts` | Entry point Backend API (Hono) |
| `src/lib/api.ts` | Konfigurasi Axios client untuk API |
| `src/lib/aduan.service.ts` | Service aduan (via API) |
| `src/lib/kps.service.ts` | Service KPS (search, create, update — via API) |
| `src/lib/user.service.ts` | Service user management (via API) |
| `src/lib/master.service.ts` | Service master data (via API) |
| `src/lib/activity.service.ts` | Log aktivitas (via API) |
| `src/lib/settings.service.ts` | Pengaturan aplikasi (via API) |
| `src/components/ui/KpsSearch.tsx` | Search-select KPS + CTA "Tambah KPS baru" |
| `src/components/ui/AddKpsModal.tsx` | Modal buat KPS lokal baru |
| `server/src/services/kps-sync.service.ts` | Sinkronisasi `public.kps` dari GoKUPS |
| `server/src/repositories/master.repository.ts` | Query KPS: search, create, update, similarity |
| `scripts/init_db.sql` | Script inisialisasi DB lengkap |
| `scripts/migrations/` | Migrasi skema berurutan (lihat `README.md` di folder ini) |
| `scripts/deploy-dokploy.sh` | Trigger deploy manual ke Dokploy |

---

## Catatan Penting untuk Agent

1. **API URL**: Gunakan `VITE_API_URL` dari `.env`.
2. **Semua query DB** harus melalui backend API, bukan langsung dari frontend.
3. **Role user**: `admin` dan `staf`.
4. **Container DB jangan di-restart** sembarangan — shared dengan project `gealgeolgeo`.
5. **Push ke `main` tidak otomatis deploy** — jangan asumsikan perubahan sudah live tanpa verifikasi (`docker service inspect`) atau konfirmasi deploy manual dari user.
6. **Dokumen ini harus di-update** setiap ada perubahan skema DB, endpoint baru, atau perubahan cara deploy — jangan biarkan basi (lihat memory project untuk instruksi ini).
