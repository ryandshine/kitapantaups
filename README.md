# KitapantauPS

Sistem informasi pengaduan Perhutanan Sosial dengan frontend React/Vite dan backend Hono/PostgreSQL.

## Struktur

- `src/`: frontend React
- `server/src/`: backend API Hono
- `scripts/init_db.sql`: skema awal database
- `scripts/migrations/`: migration incremental setelah bootstrap

## Prasyarat

- Node.js 20+
- PostgreSQL 16+

## Setup Lokal

1. Install dependency frontend dengan `npm ci`.
2. Install dependency backend dengan `cd server && npm ci`.
3. Buat file env:
   `cp .env.example .env`
   `cp server/.env.example server/.env`
4. Inisialisasi database:
   `psql "$DATABASE_URL" -f scripts/init_db.sql`
5. Jalankan migration tambahan dari `scripts/migrations/` secara berurutan.
6. Jalankan backend:
   `cd server && npm run dev`
7. Jalankan frontend:
   `npm run dev`

## Environment

Frontend:

```env
VITE_API_URL=http://localhost:3001
```

Backend:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/kitapantaups
JWT_SECRET=change-this-to-random-32-char-string
JWT_REFRESH_SECRET=change-this-to-another-random-32-char-string
PORT=3001
CORS_ORIGIN=http://localhost:5173
BASE_URL=http://localhost:3001
```

## Testing

- Frontend build check: `npm run build`
- Backend unit tests: `cd server && npm test`

## Docker Deploy

Stack Docker sekarang tersedia untuk deployment baru:

1. Salin env deploy:
   `cp .env.deploy.example .env`
2. Ubah minimal:
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `PUBLIC_API_URL`
   - `PUBLIC_WEB_ORIGIN`
3. Jalankan stack:
   `docker compose up --build -d`
4. Aplikasi akan tersedia di:
   - frontend: `http://localhost:8080`
   - backend: `http://localhost:3001`

Catatan penting:

- Frontend Vite memakai `VITE_API_URL` saat build. Nilai `PUBLIC_API_URL` harus berupa URL yang bisa diakses browser pengguna, bukan nama service internal Docker seperti `http://api:3001`.
- Bootstrap database untuk deployment baru memakai `scripts/init_db_current.sql`.
- Jangan replay seluruh migration legacy ke database kosong. Ada migration historis yang dibuat untuk transisi data lama, bukan untuk bootstrap environment baru.
- Volume `api_uploads` menyimpan dokumen upload backend.
- Setelah stack hidup, sinkronisasi data KPS masih perlu dijalankan jika environment baru belum punya data master:
  `docker compose exec api npm run sync:kps:gokups`

## Catatan Keamanan

- Endpoint `/uploads/*` sekarang membutuhkan autentikasi.
- Refresh token dipindahkan ke cookie `HttpOnly`.
- Session refresh dirotasi setiap kali `/auth/refresh` dipanggil.

## Migration Flow

- `scripts/init_db.sql` hanya dipakai untuk database baru.
- Perubahan skema setelah bootstrap wajib dibuat sebagai file SQL baru di `scripts/migrations/`.
- Terapkan migration secara berurutan berdasarkan prefix angka, lalu commit file migration bersama perubahan kode.
