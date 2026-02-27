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
- **Password**: `Geo@Secure2026!`
- **Connection string**: `postgresql://gealgeolgeo:Geo@Secure2026!@localhost:5433/kitapantaups`
- **Script inisialisasi DB**: `scripts/init_db.sql`

### Tabel di `kitapantaups`
- `users` — autentikasi lokal
- `sessions` — JWT refresh token
- `master_status`, `master_kategori_masalah`, `master_jenis_tl`
- `master_kps`, `master_kps2`
- `aduan`, `aduan_documents`
- `tindak_lanjut`
- `app_activities`
- `ai_summaries`
- `settings`

### Akun admin awal
- Email: `admin@sipantaups.local`
- Password: `Admin@1234`

---

## Status Progres

### ✅ Selesai
- [x] Migrasi skema dari Supabase ke PostgreSQL lokal
- [x] Implementasi Backend API (Hono)
- [x] Implementasi Autentikasi JWT
- [x] Migrasi Frontend Service Layer (semua pakai API lokal)
- [x] Implementasi File Upload ke folder lokal
- [x] Pembersihan total semua kode/file terkait Supabase

---

## File Penting

| File | Keterangan |
|------|-----------|
| `server/src/index.ts` | Entry point Backend API (Hono) |
| `src/lib/api.ts` | Konfigurasi Axios client untuk API |
| `src/lib/aduan.service.ts` | Service aduan (via API) |
| `src/lib/kps.service.ts` | Service KPS (via API & PKPS external) |
| `src/lib/user.service.ts` | Service user management (via API) |
| `src/lib/master.service.ts` | Service master data (via API) |
| `src/lib/activity.service.ts` | Log aktivitas (via API) |
| `src/lib/settings.service.ts` | Pengaturan aplikasi (via API) |
| `scripts/init_db.sql` | Script inisialisasi DB lengkap |

---

## Catatan Penting untuk Agent

1. **API URL**: Gunakan `VITE_API_URL` dari `.env`.
2. **Semua query DB** harus melalui backend API, bukan langsung dari frontend.
3. **Role user**: `admin` dan `staf`.
4. **Container DB jangan di-restart** sembarangan — shared dengan project `gealgeolgeo`.
