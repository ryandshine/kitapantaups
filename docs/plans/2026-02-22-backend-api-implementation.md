# Backend API SIPANTAUPS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Membangun backend API berbasis Hono + TypeScript sebagai pengganti Supabase PostgREST, terhubung ke PostgreSQL lokal, siap di-deploy via Docker di Dokploy.

**Architecture:** Folder `server/` terpisah di dalam monorepo. Setiap route module menangani satu domain (auth, aduan, tindak-lanjut, dll). Semua query langsung ke PostgreSQL via `pg` connection pool tanpa ORM.

**Tech Stack:** Hono, Node.js 20, TypeScript, pg, jsonwebtoken, bcryptjs, Zod, tsup, Docker

---

## Task 1: Setup Project Server

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env.example`
- Create: `server/.gitignore`

**Step 1: Buat folder dan package.json**

```bash
mkdir -p server/src/routes server/src/middleware
```

Buat `server/package.json`:

```json
{
  "name": "sipantaups-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format esm --out-dir dist",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.7",
    "bcryptjs": "^3.0.2",
    "hono": "^4.7.11",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.14.1",
    "zod": "^3.25.65"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.9",
    "@types/node": "^24.10.1",
    "@types/pg": "^8.11.13",
    "tsup": "^8.5.0",
    "tsx": "^4.19.4",
    "typescript": "~5.9.3"
  }
}
```

**Step 2: Buat tsconfig.json**

Buat `server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

**Step 3: Buat .env.example**

Buat `server/.env.example`:

```env
DATABASE_URL=postgresql://gealgeolgeo:Geo@Secure2026!@localhost:5433/kitapantaups
JWT_SECRET=ganti-dengan-string-random-32-karakter
JWT_REFRESH_SECRET=ganti-dengan-string-random-lain-32-karakter
PORT=3000
NODE_ENV=development
```

**Step 4: Buat .gitignore**

Buat `server/.gitignore`:

```
node_modules/
dist/
.env
```

**Step 5: Install dependencies**

```bash
cd server && npm install
```

Expected: `node_modules/` terbuat, tidak ada error.

**Step 6: Commit**

```bash
git add server/package.json server/tsconfig.json server/.env.example server/.gitignore
git commit -m "feat(server): setup project Hono backend"
```

---

## Task 2: Koneksi Database

**Files:**
- Create: `server/src/db.ts`

**Step 1: Buat db.ts**

Buat `server/src/db.ts`:

```typescript
import pg from 'pg'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Verifikasi koneksi saat startup
pool.query('SELECT 1').then(() => {
  console.log('✅ Database connected')
}).catch((err) => {
  console.error('❌ Database connection failed:', err.message)
  process.exit(1)
})

export type QueryResult<T> = pg.QueryResult<T>
```

**Step 2: Test koneksi manual**

Buat `server/src/index.ts` sementara:

```typescript
import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { pool } from './db.js'

const app = new Hono()

app.get('/', (c) => c.json({ status: 'ok', message: 'SIPANTAUPS API' }))

serve({ fetch: app.fetch, port: Number(process.env.PORT) || 3000 }, (info) => {
  console.log(`🚀 Server running on http://localhost:${info.port}`)
})
```

**Step 3: Buat file .env dari .env.example**

```bash
cd server && cp .env.example .env
```

Edit `.env` dengan nilai yang benar (DATABASE_URL sudah terisi, tambahkan JWT_SECRET sembarang dulu untuk dev).

**Step 4: Jalankan dev server**

```bash
cd server && npm run dev
```

Expected output:
```
✅ Database connected
🚀 Server running on http://localhost:3000
```

Test: `curl http://localhost:3000/` harus return `{"status":"ok"}`

**Step 5: Commit**

```bash
git add server/src/db.ts server/src/index.ts
git commit -m "feat(server): koneksi PostgreSQL dengan pg pool"
```

---

## Task 3: JWT Middleware & Auth Helper

**Files:**
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/lib/jwt.ts`

**Step 1: Buat jwt helper**

Buat `server/src/lib/jwt.ts`:

```typescript
import jwt from 'jsonwebtoken'

const ACCESS_SECRET = process.env.JWT_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export interface JwtPayload {
  userId: string
  email: string
  role: 'admin' | 'staf'
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' })
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' })
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload
}
```

**Step 2: Buat auth middleware**

Buat `server/src/middleware/auth.ts`:

```typescript
import { createMiddleware } from 'hono/factory'
import { verifyAccessToken, type JwtPayload } from '../lib/jwt.js'

// Extend Hono context type
declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload
  }
}

export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const payload = verifyAccessToken(token)
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'Token invalid atau expired' }, 401)
  }
})

export const requireAdmin = createMiddleware(async (c, next) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden: admin only' }, 403)
  }
  await next()
})
```

**Step 3: Commit**

```bash
git add server/src/middleware/auth.ts server/src/lib/jwt.ts
git commit -m "feat(server): JWT helper dan auth middleware"
```

---

## Task 4: Route Auth (Login, Logout, Refresh, Me)

**Files:**
- Create: `server/src/routes/auth.ts`

**Step 1: Buat auth route**

Buat `server/src/routes/auth.ts`:

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js'
import { requireAuth } from '../middleware/auth.js'

const auth = new Hono()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// POST /auth/login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  const result = await pool.query(
    'SELECT id, email, password_hash, display_name, role, is_active FROM users WHERE email = $1',
    [email]
  )

  const user = result.rows[0]
  if (!user || !user.is_active) {
    return c.json({ error: 'Email atau password salah' }, 401)
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return c.json({ error: 'Email atau password salah' }, 401)
  }

  const payload = { userId: user.id, email: user.email, role: user.role }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  // Simpan refresh token ke tabel sessions
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await pool.query(
    'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, expiresAt]
  )

  return c.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      role: user.role,
    },
  })
})

// POST /auth/logout
auth.post('/logout', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { refresh_token } = body as { refresh_token?: string }

  if (refresh_token) {
    await pool.query('DELETE FROM sessions WHERE refresh_token = $1', [refresh_token])
  }

  return c.json({ message: 'Logout berhasil' })
})

// POST /auth/refresh
auth.post('/refresh', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { refresh_token } = body as { refresh_token?: string }

  if (!refresh_token) {
    return c.json({ error: 'refresh_token diperlukan' }, 400)
  }

  try {
    const payload = verifyRefreshToken(refresh_token)

    // Cek apakah token ada di DB dan belum expired
    const result = await pool.query(
      'SELECT id FROM sessions WHERE refresh_token = $1 AND expires_at > now()',
      [refresh_token]
    )
    if (result.rowCount === 0) {
      return c.json({ error: 'Refresh token tidak valid' }, 401)
    }

    const newPayload = { userId: payload.userId, email: payload.email, role: payload.role }
    const newAccessToken = signAccessToken(newPayload)

    return c.json({ access_token: newAccessToken })
  } catch {
    return c.json({ error: 'Refresh token tidak valid' }, 401)
  }
})

// GET /auth/me
auth.get('/me', requireAuth, async (c) => {
  const { userId } = c.get('user')

  const result = await pool.query(
    'SELECT id, email, display_name, role, phone, photo_url, is_active, created_at FROM users WHERE id = $1',
    [userId]
  )

  if (result.rowCount === 0) {
    return c.json({ error: 'User tidak ditemukan' }, 404)
  }

  return c.json(result.rows[0])
})

export default auth
```

**Step 2: Install zod-validator untuk Hono**

```bash
cd server && npm install @hono/zod-validator
```

**Step 3: Daftarkan route di index.ts**

Update `server/src/index.ts`:

```typescript
import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { pool } from './db.js'
import authRoute from './routes/auth.js'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({ origin: '*' }))

app.get('/', (c) => c.json({ status: 'ok', message: 'SIPANTAUPS API v1' }))
app.route('/auth', authRoute)

serve({ fetch: app.fetch, port: Number(process.env.PORT) || 3000 }, (info) => {
  console.log(`🚀 Server running on http://localhost:${info.port}`)
})
```

**Step 4: Test login**

```bash
npm run dev
```

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sipantaups.local","password":"Admin@1234"}'
```

Expected: response JSON dengan `access_token`, `refresh_token`, dan `user`.

**Step 5: Commit**

```bash
git add server/src/routes/auth.ts server/src/index.ts
git commit -m "feat(server): route auth login/logout/refresh/me"
```

---

## Task 5: Route Master Data

**Files:**
- Create: `server/src/routes/master.ts`

**Step 1: Buat master route**

Buat `server/src/routes/master.ts`:

```typescript
import { Hono } from 'hono'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const master = new Hono()

master.use('*', requireAuth)

// GET /master/status
master.get('/status', async (c) => {
  const result = await pool.query('SELECT id, nama_status FROM master_status ORDER BY nama_status')
  return c.json(result.rows)
})

// GET /master/kategori
master.get('/kategori', async (c) => {
  const result = await pool.query('SELECT id, nama_kategori FROM master_kategori_masalah ORDER BY nama_kategori')
  return c.json(result.rows)
})

// GET /master/jenis-tl
master.get('/jenis-tl', async (c) => {
  const result = await pool.query('SELECT id, nama_jenis_tl FROM master_jenis_tl ORDER BY nama_jenis_tl')
  return c.json(result.rows)
})

// GET /master/kps?search=...
master.get('/kps', async (c) => {
  const search = c.req.query('search') || ''
  const limit = Number(c.req.query('limit')) || 50

  const result = await pool.query(
    `SELECT id, id_kps_api, nama_kps, jenis_kps, nomor_sk, lokasi_prov, lokasi_kab, lokasi_kec, lokasi_desa
     FROM master_kps
     WHERE nama_kps ILIKE $1
     ORDER BY nama_kps
     LIMIT $2`,
    [`%${search}%`, limit]
  )
  return c.json(result.rows)
})

export default master
```

**Step 2: Daftarkan di index.ts**

Tambahkan di `server/src/index.ts`:

```typescript
import masterRoute from './routes/master.js'
// ...
app.route('/master', masterRoute)
```

**Step 3: Test**

Ambil token dari Task 4, lalu:

```bash
curl http://localhost:3000/master/status \
  -H "Authorization: Bearer <access_token>"
```

Expected: array status `[{id, nama_status}, ...]`

**Step 4: Commit**

```bash
git add server/src/routes/master.ts server/src/index.ts
git commit -m "feat(server): route master data (status, kategori, jenis-tl, kps)"
```

---

## Task 6: Route Aduan (CRUD)

**Files:**
- Create: `server/src/routes/aduan.ts`

**Step 1: Buat aduan route**

Buat `server/src/routes/aduan.ts`:

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const aduan = new Hono()

aduan.use('*', requireAuth)

// GET /aduan?status=&page=&limit=
aduan.get('/', async (c) => {
  const status = c.req.query('status')
  const page = Number(c.req.query('page')) || 1
  const limit = Number(c.req.query('limit')) || 20
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: any[] = []

  if (status) {
    params.push(status)
    conditions.push(`a.status = $${params.length}`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const dataResult = await pool.query(
    `SELECT a.*, u.display_name as creator_name
     FROM aduan a
     LEFT JOIN users u ON u.id = a.created_by
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  )

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM aduan a ${where}`,
    params
  )

  return c.json({
    data: dataResult.rows,
    total: Number(countResult.rows[0].total),
    page,
    limit,
  })
})

// GET /aduan/:id
aduan.get('/:id', async (c) => {
  const id = c.req.param('id')

  const result = await pool.query(
    `SELECT a.*, u.display_name as creator_name
     FROM aduan a
     LEFT JOIN users u ON u.id = a.created_by
     WHERE a.id = $1`,
    [id]
  )

  if (result.rowCount === 0) {
    return c.json({ error: 'Aduan tidak ditemukan' }, 404)
  }

  // Ambil dokumen
  const docsResult = await pool.query(
    'SELECT * FROM aduan_documents WHERE aduan_id = $1 ORDER BY created_at',
    [id]
  )

  // Ambil tindak lanjut
  const tlResult = await pool.query(
    'SELECT * FROM tindak_lanjut WHERE aduan_id = $1 ORDER BY tanggal DESC',
    [id]
  )

  return c.json({
    ...result.rows[0],
    documents: docsResult.rows,
    tindak_lanjut: tlResult.rows,
  })
})

const aduanSchema = z.object({
  nomor_tiket: z.string(),
  surat_nomor: z.string().optional(),
  surat_tanggal: z.string().optional(),
  surat_asal_perihal: z.string().optional(),
  isi_disposisi: z.string().optional(),
  pengadu_nama: z.string().optional(),
  pengadu_instansi: z.string().optional(),
  kategori_masalah: z.string().optional(),
  ringkasan_masalah: z.string().optional(),
  status: z.string().default('baru'),
  nama_kps: z.array(z.string()).optional(),
  jenis_kps: z.array(z.string()).optional(),
  nomor_sk: z.array(z.string()).optional(),
  id_kps_api: z.array(z.string()).optional(),
  lokasi_prov: z.string().optional(),
  lokasi_kab: z.string().optional(),
  lokasi_kec: z.string().optional(),
  lokasi_desa: z.string().optional(),
  lokasi_luas_ha: z.number().optional(),
  jumlah_kk: z.number().optional(),
  lokasi_lat: z.array(z.string()).optional(),
  lokasi_lng: z.array(z.string()).optional(),
})

// POST /aduan
aduan.post('/', zValidator('json', aduanSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')

  const result = await pool.query(
    `INSERT INTO aduan (
      nomor_tiket, surat_nomor, surat_tanggal, surat_asal_perihal, isi_disposisi,
      pengadu_nama, pengadu_instansi, kategori_masalah, ringkasan_masalah, status,
      nama_kps, jenis_kps, nomor_sk, id_kps_api,
      lokasi_prov, lokasi_kab, lokasi_kec, lokasi_desa,
      lokasi_luas_ha, jumlah_kk, lokasi_lat, lokasi_lng,
      created_by, updated_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$23
    ) RETURNING *`,
    [
      data.nomor_tiket, data.surat_nomor, data.surat_tanggal, data.surat_asal_perihal,
      data.isi_disposisi, data.pengadu_nama, data.pengadu_instansi, data.kategori_masalah,
      data.ringkasan_masalah, data.status,
      data.nama_kps, data.jenis_kps, data.nomor_sk, data.id_kps_api,
      data.lokasi_prov, data.lokasi_kab, data.lokasi_kec, data.lokasi_desa,
      data.lokasi_luas_ha, data.jumlah_kk, data.lokasi_lat, data.lokasi_lng,
      user.userId,
    ]
  )

  return c.json(result.rows[0], 201)
})

// PATCH /aduan/:id
aduan.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  const body = await c.req.json()

  // Build dynamic SET clause
  const allowed = [
    'surat_nomor','surat_tanggal','surat_asal_perihal','isi_disposisi',
    'pengadu_nama','pengadu_instansi','kategori_masalah','ringkasan_masalah',
    'status','nama_kps','jenis_kps','nomor_sk','id_kps_api',
    'lokasi_prov','lokasi_kab','lokasi_kec','lokasi_desa',
    'lokasi_luas_ha','jumlah_kk','lokasi_lat','lokasi_lng','alasan_penolakan',
  ]

  const sets: string[] = []
  const params: any[] = []

  for (const key of allowed) {
    if (key in body) {
      params.push(body[key])
      sets.push(`${key} = $${params.length}`)
    }
  }

  if (sets.length === 0) {
    return c.json({ error: 'Tidak ada field yang diupdate' }, 400)
  }

  params.push(user.userId, id)
  const result = await pool.query(
    `UPDATE aduan SET ${sets.join(', ')}, updated_by = $${params.length - 1}
     WHERE id = $${params.length} RETURNING *`,
    params
  )

  if (result.rowCount === 0) {
    return c.json({ error: 'Aduan tidak ditemukan' }, 404)
  }

  return c.json(result.rows[0])
})

// DELETE /aduan/:id (admin only)
aduan.delete('/:id', async (c) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const id = c.req.param('id')

  // Hapus cascade: documents, tindak_lanjut, activities sudah di-handle oleh FK ON DELETE CASCADE
  const result = await pool.query('DELETE FROM aduan WHERE id = $1', [id])

  if (result.rowCount === 0) {
    return c.json({ error: 'Aduan tidak ditemukan' }, 404)
  }

  return c.json({ message: 'Aduan berhasil dihapus' })
})

export default aduan
```

**Step 2: Daftarkan di index.ts**

```typescript
import aduanRoute from './routes/aduan.js'
// ...
app.route('/aduan', aduanRoute)
```

**Step 3: Test**

```bash
# List aduan
curl http://localhost:3000/aduan \
  -H "Authorization: Bearer <token>"

# Buat aduan
curl -X POST http://localhost:3000/aduan \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"nomor_tiket":"ADU/20260222/123456","status":"baru","pengadu_nama":"Test"}'
```

**Step 4: Commit**

```bash
git add server/src/routes/aduan.ts server/src/index.ts
git commit -m "feat(server): CRUD route aduan"
```

---

## Task 7: Route Tindak Lanjut

**Files:**
- Create: `server/src/routes/tindak-lanjut.ts`

**Step 1: Buat tindak-lanjut route**

Buat `server/src/routes/tindak-lanjut.ts`:

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const tl = new Hono()

tl.use('*', requireAuth)

const tlSchema = z.object({
  tanggal: z.string(),
  jenis_tl: z.string(),
  keterangan: z.string().optional(),
  file_urls: z.array(z.string()).optional(),
  nomor_surat_output: z.string().optional(),
  link_drive: z.string().optional(),
})

// GET /aduan/:id/tindak-lanjut (dipanggil dari nested route di index)
tl.get('/', async (c) => {
  const aduanId = c.req.param('aduanId')
  const result = await pool.query(
    'SELECT * FROM tindak_lanjut WHERE aduan_id = $1 ORDER BY tanggal DESC',
    [aduanId]
  )
  return c.json(result.rows)
})

// POST /aduan/:id/tindak-lanjut
tl.post('/', zValidator('json', tlSchema), async (c) => {
  const aduanId = c.req.param('aduanId')
  const user = c.get('user')
  const data = c.req.valid('json')

  // Ambil display_name user
  const userResult = await pool.query('SELECT display_name FROM users WHERE id = $1', [user.userId])
  const displayName = userResult.rows[0]?.display_name || user.email

  const result = await pool.query(
    `INSERT INTO tindak_lanjut (aduan_id, tanggal, jenis_tl, keterangan, file_urls, nomor_surat_output, link_drive, created_by, created_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [aduanId, data.tanggal, data.jenis_tl, data.keterangan, data.file_urls, data.nomor_surat_output, data.link_drive, user.userId, displayName]
  )

  return c.json(result.rows[0], 201)
})

// DELETE /tindak-lanjut/:id (route terpisah di root)
export const deleteTl = async (c: any) => {
  const id = c.req.param('id')
  const result = await pool.query('DELETE FROM tindak_lanjut WHERE id = $1', [id])

  if (result.rowCount === 0) {
    return c.json({ error: 'Tindak lanjut tidak ditemukan' }, 404)
  }

  return c.json({ message: 'Tindak lanjut berhasil dihapus' })
}

export default tl
```

**Step 2: Daftarkan di index.ts dengan nested routing**

Update `server/src/index.ts`:

```typescript
import tlRoute, { deleteTl } from './routes/tindak-lanjut.js'

// Nested: /aduan/:aduanId/tindak-lanjut
app.route('/aduan/:aduanId/tindak-lanjut', tlRoute)

// DELETE standalone: /tindak-lanjut/:id
app.delete('/tindak-lanjut/:id', requireAuth, deleteTl)
```

**Step 3: Commit**

```bash
git add server/src/routes/tindak-lanjut.ts server/src/index.ts
git commit -m "feat(server): route tindak lanjut"
```

---

## Task 8: Route Users (admin only)

**Files:**
- Create: `server/src/routes/users.ts`

**Step 1: Buat users route**

Buat `server/src/routes/users.ts`:

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const users = new Hono()

users.use('*', requireAuth, requireAdmin)

// GET /users
users.get('/', async (c) => {
  const result = await pool.query(
    'SELECT id, email, display_name, role, phone, photo_url, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
  )
  return c.json(result.rows)
})

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().min(1),
  role: z.enum(['admin', 'staf']),
  phone: z.string().optional(),
})

// POST /users
users.post('/', zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json')
  const hash = await bcrypt.hash(data.password, 12)

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, display_name, role, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, display_name, role, phone, is_active, created_at`,
    [data.email, hash, data.display_name, data.role, data.phone]
  )

  return c.json(result.rows[0], 201)
})

const updateUserSchema = z.object({
  display_name: z.string().optional(),
  role: z.enum(['admin', 'staf']).optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

// PATCH /users/:id
users.patch('/:id', zValidator('json', updateUserSchema), async (c) => {
  const id = c.req.param('id')
  const data = c.req.valid('json')

  const sets: string[] = []
  const params: any[] = []

  if (data.display_name !== undefined) { params.push(data.display_name); sets.push(`display_name = $${params.length}`) }
  if (data.role !== undefined) { params.push(data.role); sets.push(`role = $${params.length}`) }
  if (data.phone !== undefined) { params.push(data.phone); sets.push(`phone = $${params.length}`) }
  if (data.is_active !== undefined) { params.push(data.is_active); sets.push(`is_active = $${params.length}`) }
  if (data.password) {
    const hash = await bcrypt.hash(data.password, 12)
    params.push(hash)
    sets.push(`password_hash = $${params.length}`)
  }

  if (sets.length === 0) return c.json({ error: 'Tidak ada field yang diupdate' }, 400)

  params.push(id)
  const result = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}
     RETURNING id, email, display_name, role, phone, is_active, updated_at`,
    params
  )

  if (result.rowCount === 0) return c.json({ error: 'User tidak ditemukan' }, 404)
  return c.json(result.rows[0])
})

// DELETE /users/:id
users.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const result = await pool.query('DELETE FROM users WHERE id = $1', [id])
  if (result.rowCount === 0) return c.json({ error: 'User tidak ditemukan' }, 404)
  return c.json({ message: 'User berhasil dihapus' })
})

export default users
```

**Step 2: Daftarkan di index.ts**

```typescript
import usersRoute from './routes/users.js'
app.route('/users', usersRoute)
```

**Step 3: Commit**

```bash
git add server/src/routes/users.ts server/src/index.ts
git commit -m "feat(server): CRUD route users (admin only)"
```

---

## Task 9: Route Dashboard, Activities, Settings

**Files:**
- Create: `server/src/routes/dashboard.ts`
- Create: `server/src/routes/activities.ts`
- Create: `server/src/routes/settings.ts`

**Step 1: Buat dashboard route**

Buat `server/src/routes/dashboard.ts`:

```typescript
import { Hono } from 'hono'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const dashboard = new Hono()

dashboard.use('*', requireAuth)

// GET /dashboard/stats
dashboard.get('/stats', async (c) => {
  const [total, byStatus, recent] = await Promise.all([
    pool.query('SELECT COUNT(*) as total FROM aduan'),
    pool.query('SELECT status, COUNT(*) as count FROM aduan GROUP BY status'),
    pool.query('SELECT COUNT(*) as count FROM aduan WHERE created_at > now() - interval \'30 days\''),
  ])

  const statusMap: Record<string, number> = {}
  for (const row of byStatus.rows) {
    statusMap[row.status] = Number(row.count)
  }

  return c.json({
    total: Number(total.rows[0].total),
    by_status: statusMap,
    last_30_days: Number(recent.rows[0].count),
  })
})

export default dashboard
```

**Step 2: Buat activities route**

Buat `server/src/routes/activities.ts`:

```typescript
import { Hono } from 'hono'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const activities = new Hono()

activities.use('*', requireAuth)

// GET /activities?limit=&aduan_id=
activities.get('/', async (c) => {
  const limit = Number(c.req.query('limit')) || 20
  const aduanId = c.req.query('aduan_id')

  const conditions: string[] = []
  const params: any[] = []

  if (aduanId) {
    params.push(aduanId)
    conditions.push(`aduan_id = $${params.length}`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  params.push(limit)

  const result = await pool.query(
    `SELECT * FROM app_activities ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  )

  return c.json(result.rows)
})

export default activities
```

**Step 3: Buat settings route**

Buat `server/src/routes/settings.ts`:

```typescript
import { Hono } from 'hono'
import { pool } from '../db.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const settings = new Hono()

settings.use('*', requireAuth)

// GET /settings
settings.get('/', async (c) => {
  const result = await pool.query('SELECT key, value FROM settings')
  const map: Record<string, string> = {}
  for (const row of result.rows) map[row.key] = row.value
  return c.json(map)
})

// PUT /settings/:key (admin only)
settings.put('/:key', requireAdmin, async (c) => {
  const key = c.req.param('key')
  const user = c.get('user')
  const body = await c.req.json()
  const value = String(body.value ?? '')

  await pool.query(
    `INSERT INTO settings (key, value, updated_by) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = now()`,
    [key, value, user.userId]
  )

  return c.json({ key, value })
})

export default settings
```

**Step 4: Daftarkan semua di index.ts**

```typescript
import dashboardRoute from './routes/dashboard.js'
import activitiesRoute from './routes/activities.js'
import settingsRoute from './routes/settings.js'

app.route('/dashboard', dashboardRoute)
app.route('/activities', activitiesRoute)
app.route('/settings', settingsRoute)
```

**Step 5: Commit**

```bash
git add server/src/routes/dashboard.ts server/src/routes/activities.ts server/src/routes/settings.ts server/src/index.ts
git commit -m "feat(server): route dashboard, activities, settings"
```

---

## Task 10: Dockerfile & Konfigurasi Dokploy

**Files:**
- Create: `server/Dockerfile`
- Create: `server/.dockerignore`

**Step 1: Buat Dockerfile**

Buat `server/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Step 2: Buat .dockerignore**

Buat `server/.dockerignore`:

```
node_modules
dist
.env
*.md
```

**Step 3: Test build lokal**

```bash
cd server && npm run build
```

Expected: folder `dist/` terbuat dengan `index.js`

**Step 4: Test Docker build (opsional lokal)**

```bash
cd server && docker build -t sipantaups-server .
```

**Step 5: Konfigurasi Dokploy**

Di Dokploy:
1. Buat service baru → pilih "Docker Compose" atau "Application"
2. Set build context ke folder `server/`
3. Tambahkan environment variables:
   - `DATABASE_URL=postgresql://gealgeolgeo:Geo@Secure2026!@gealgeolgeo-postgis:5432/kitapantaups`
   - `JWT_SECRET=<generate random 32 char>`
   - `JWT_REFRESH_SECRET=<generate random 32 char>`
   - `PORT=3000`
4. Pastikan container terhubung ke Docker network yang sama dengan `gealgeolgeo-postgis`

> **Penting:** Di Dokploy, hostname DB menggunakan nama container (`gealgeolgeo-postgis`), bukan `localhost:5433`.

**Step 6: Commit**

```bash
git add server/Dockerfile server/.dockerignore
git commit -m "feat(server): Dockerfile untuk deploy via Dokploy"
```

---

## Task 11: Global Error Handler & Final Cleanup

**Files:**
- Create: `server/src/middleware/error.ts`
- Modify: `server/src/index.ts`

**Step 1: Buat error handler**

Buat `server/src/middleware/error.ts`:

```typescript
import type { Context } from 'hono'

export function errorHandler(err: Error, c: Context) {
  console.error(err)
  return c.json({ error: err.message || 'Internal server error' }, 500)
}
```

**Step 2: Pasang di index.ts**

```typescript
import { errorHandler } from './middleware/error.js'

app.onError((err, c) => errorHandler(err, c))
app.notFound((c) => c.json({ error: 'Route tidak ditemukan' }, 404))
```

**Step 3: Test semua endpoint sekali lagi**

```bash
# Health check
curl http://localhost:3000/

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sipantaups.local","password":"Admin@1234"}'

# Dengan token yang didapat:
curl http://localhost:3000/master/status -H "Authorization: Bearer <token>"
curl http://localhost:3000/aduan -H "Authorization: Bearer <token>"
curl http://localhost:3000/dashboard/stats -H "Authorization: Bearer <token>"
```

**Step 4: Commit final**

```bash
git add server/src/middleware/error.ts server/src/index.ts
git commit -m "feat(server): error handler global dan finalisasi backend API"
```

---

## Catatan Penting

- **dotenv**: Pastikan `import 'dotenv/config'` selalu di baris pertama `index.ts`
- **File upload**: Belum diimplementasikan di plan ini — file tetap disimpan di path lama atau akan dikerjakan terpisah
- **Migrasi frontend**: Setelah backend jalan, service layer frontend (`src/lib/*.service.ts`) perlu dimigrasi dari `supabase.*` ke `fetch`/`axios` ke endpoint ini
- **CORS**: Saat development `origin: '*'`, saat production ganti ke URL frontend yang spesifik
