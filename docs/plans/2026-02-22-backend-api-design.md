# Design Doc: Backend API SIPANTAUPS

**Tanggal:** 2026-02-22
**Status:** Disetujui
**Tujuan:** Membangun backend API sebagai pengganti Supabase PostgREST

---

## Konteks

Frontend SIPANTAUPS saat ini menggunakan `@supabase/supabase-js` untuk semua operasi data. Migrasi ke stack lokal membutuhkan backend API sendiri yang terhubung ke PostgreSQL lokal di container Docker.

## Stack Teknologi

| Layer | Teknologi |
|-------|-----------|
| Framework | Hono (TypeScript-first, ringan) |
| Runtime | Node.js 20 (Alpine) |
| Database Client | `pg` (connection pool) |
| Auth | JWT (`jsonwebtoken`) — access + refresh token |
| Validasi | Zod |
| Build | tsup (TypeScript → JS) |
| Dev | tsx (run TS langsung) |
| Deploy | Docker container di Dokploy |

## Struktur Folder

```
kitapantaups/
├── src/                  # Frontend React (tidak diubah)
├── server/               # Backend baru
│   ├── src/
│   │   ├── index.ts
│   │   ├── db.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── error.ts
│   │   └── routes/
│   │       ├── auth.ts
│   │       ├── aduan.ts
│   │       ├── tindak-lanjut.ts
│   │       ├── master.ts
│   │       ├── users.ts
│   │       ├── dashboard.ts
│   │       ├── activities.ts
│   │       └── settings.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
└── docs/
    └── plans/
```

## Endpoint API

### Auth
- `POST /auth/login` — login, return access_token + refresh_token
- `POST /auth/logout` — hapus session
- `POST /auth/refresh` — refresh access token
- `GET  /auth/me` — get current user

### Aduan
- `GET    /aduan` — list (filter by status, pagination)
- `GET    /aduan/:id` — detail
- `POST   /aduan` — buat baru
- `PATCH  /aduan/:id` — update
- `DELETE /aduan/:id` — hapus

### Tindak Lanjut
- `GET    /aduan/:id/tindak-lanjut` — list
- `POST   /aduan/:id/tindak-lanjut` — tambah
- `DELETE /tindak-lanjut/:id` — hapus

### Master Data
- `GET /master/status`
- `GET /master/kategori`
- `GET /master/jenis-tl`
- `GET /master/kps`

### Users (admin only)
- `GET    /users`
- `POST   /users`
- `PATCH  /users/:id`
- `DELETE /users/:id`

### Lainnya
- `GET  /dashboard/stats`
- `GET  /activities`
- `GET  /settings`
- `PUT  /settings/:key`

## Autentikasi

- Access token: JWT, expire 15 menit
- Refresh token: JWT, expire 7 hari, disimpan di tabel `sessions`
- Semua route kecuali `/auth/login` memerlukan `Authorization: Bearer <token>`
- Role `admin`: akses penuh
- Role `staf`: tidak bisa manage users, tidak bisa hapus aduan

## Environment Variables

```env
DATABASE_URL=postgresql://gealgeolgeo:Geo@Secure2026!@gealgeolgeo-postgis:5432/kitapantaups
JWT_SECRET=<random-32-char>
JWT_REFRESH_SECRET=<random-32-char>
PORT=3000
NODE_ENV=production
```

Di Dokploy, koneksi DB menggunakan **Docker network internal** (hostname container, bukan localhost:5433).

## Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Keputusan Desain

1. **Hono dipilih** karena TypeScript-native, ringan di Docker, dan performa lebih baik dari Express untuk project skala ini.
2. **Folder `server/` terpisah** agar frontend dan backend bisa di-deploy secara independen di Dokploy.
3. **pg connection pool** (bukan ORM) untuk kontrol query penuh dan performa optimal.
4. **Zod validasi** di setiap route untuk type-safety end-to-end.
