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

## Catatan Keamanan

- Endpoint `/uploads/*` sekarang membutuhkan autentikasi.
- Refresh token dipindahkan ke cookie `HttpOnly`.
- Session refresh dirotasi setiap kali `/auth/refresh` dipanggil.

## Migration Flow

- `scripts/init_db.sql` hanya dipakai untuk database baru.
- Perubahan skema setelah bootstrap wajib dibuat sebagai file SQL baru di `scripts/migrations/`.
- Terapkan migration secara berurutan berdasarkan prefix angka, lalu commit file migration bersama perubahan kode.
