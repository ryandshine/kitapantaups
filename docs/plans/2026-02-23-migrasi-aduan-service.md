# Migrasi aduan.service.ts dari Supabase ke API Lokal

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrasi `src/lib/aduan.service.ts` dari Supabase ke backend Hono lokal, termasuk file upload via folder server.

**Architecture:** Backend Hono sudah lengkap di `server/src/`. Frontend pakai `api` dari `src/lib/api.ts` (fetch wrapper dengan JWT). File upload menggunakan Hono built-in multipart parsing, disimpan di `server/uploads/`, diakses via static endpoint.

**Tech Stack:** Hono (backend), Node.js `fs`, TypeScript, PostgreSQL via `pg`, fetch API (frontend)

---

### Task 1: Setup folder uploads + static serving + SQL patch

**Files:**
- Modify: `server/src/index.ts`
- Create: `server/uploads/.gitkeep`
- Modify: `.gitignore`

**Step 1: Buat folder uploads dan gitkeep**

```bash
mkdir -p /home/ryandshinevps/kitapantaups/server/uploads
touch /home/ryandshinevps/kitapantaups/server/uploads/.gitkeep
```

**Step 2: Tambahkan `/uploads/*` ke .gitignore**

Di file `/home/ryandshinevps/kitapantaups/.gitignore`, tambahkan baris:
```
server/uploads/*
!server/uploads/.gitkeep
```

**Step 3: Serve folder uploads sebagai static di server/src/index.ts**

Tambahkan import dan middleware sebelum baris `app.route('/auth', authRoute)`:

```typescript
import { serveStatic } from '@hono/node-server/serve-static'
```

Dan tambahkan setelah `app.use('*', cors(...))`:

```typescript
// Static files (uploaded documents)
app.use('/uploads/*', serveStatic({ root: './' }))
```

**Step 4: Tambah 'aduan masuk' ke master_status via psql**

Jalankan:
```bash
docker exec gealgeolgeo-postgis psql -U gealgeolgeo -d kitapantaups -c "INSERT INTO master_status (nama_status) VALUES ('aduan masuk') ON CONFLICT DO NOTHING;"
```

**Step 5: Commit**

```bash
cd /home/ryandshinevps/kitapantaups
git add server/src/index.ts server/uploads/.gitkeep .gitignore
git commit -m "feat(server): setup static uploads folder dan serve endpoint"
```

---

### Task 2: Tambah endpoint file upload di backend

**Files:**
- Modify: `server/src/routes/aduan.ts`

**Step 1: Tambah endpoint POST /aduan/upload**

Tambahkan SEBELUM route `aduan.get('/:id', ...)` (penting: route spesifik harus sebelum route parameter):

```typescript
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { randomUUID } from 'crypto'
```

Tambahkan di awal file (setelah existing imports):

```typescript
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { randomUUID } from 'crypto'
```

Tambahkan route upload SEBELUM `aduan.get('/:id', ...)`:

```typescript
// POST /aduan/upload — multipart file upload
aduan.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file'] as File | undefined

  if (!file || typeof file === 'string') {
    return c.json({ error: 'File tidak ditemukan' }, 400)
  }

  const ext = file.name.split('.').pop() || 'bin'
  const category = (body['category'] as string) || 'dokumen'
  const fileName = `${category}_${randomUUID()}.${ext}`
  const uploadDir = path.join(process.cwd(), 'uploads')

  await mkdir(uploadDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(uploadDir, fileName), buffer)

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`
  return c.json({ url: `${baseUrl}/uploads/${fileName}` })
})
```

**Step 2: Tambah endpoint GET /aduan/provinces**

Tambahkan SEBELUM `aduan.get('/:id', ...)`:

```typescript
// GET /aduan/provinces
aduan.get('/provinces', async (c) => {
  const result = await pool.query(
    `SELECT DISTINCT lokasi_prov FROM aduan WHERE lokasi_prov IS NOT NULL ORDER BY lokasi_prov`
  )
  return c.json(result.rows.map((r: any) => r.lokasi_prov))
})
```

**Step 3: Tambah filter nomor_tiket di GET /aduan**

Di route `aduan.get('/')`, setelah blok `if (search)`, tambahkan:

```typescript
  const nomorTiket = c.req.query('nomor_tiket')
  if (nomorTiket) {
    params.push(nomorTiket)
    conditions.push(`a.nomor_tiket = $${params.length}`)
  }
```

**Step 4: Tambah endpoint POST /aduan/:id/documents**

Tambahkan SETELAH `aduan.get('/:id', ...)`:

```typescript
// POST /aduan/:id/documents
aduan.post('/:id/documents', async (c) => {
  const aduanId = c.req.param('id')
  const body = await c.req.json()
  await pool.query(
    `INSERT INTO aduan_documents (aduan_id, file_url, file_name, file_category) VALUES ($1, $2, $3, $4)`,
    [aduanId, body.file_url, body.file_name, body.file_category || 'dokumen']
  )
  return c.json({ message: 'Dokumen berhasil ditambahkan' }, 201)
})
```

**Step 5: Tambah BASE_URL ke server/.env.example**

Tambahkan baris ke `server/.env.example`:
```
BASE_URL=http://localhost:3001
```

**Step 6: Verifikasi server bisa start**

```bash
cd /home/ryandshinevps/kitapantaups/server
npm run dev
```

Expected: server berjalan tanpa error TypeScript.

**Step 7: Commit**

```bash
cd /home/ryandshinevps/kitapantaups
git add server/src/routes/aduan.ts server/.env.example
git commit -m "feat(server): tambah endpoint upload file, provinces, documents, filter nomor_tiket"
```

---

### Task 3: Migrasi aduan.service.ts — bagian non-file

**Files:**
- Modify: `src/lib/aduan.service.ts`

Ganti seluruh isi file `src/lib/aduan.service.ts` dengan versi yang sudah dimigrasi ke `api`. Hapus semua referensi ke `supabase`.

**Step 1: Tulis ulang aduan.service.ts**

Ganti isi file dengan:

```typescript
import { api, apiFetch } from './api';
import type { Aduan, User, TindakLanjut } from '../types';

export const AduanService = {
    generateTicketNumber: () => {
        const now = new Date();
        const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(100000 + Math.random() * 900000);
        return `ADU/${yyyymmdd}/${random}`;
    },

    // Upload file ke backend
    uploadFile: async (file: File | Blob, category: string = 'dokumen'): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);

        const token = localStorage.getItem('access_token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiUrl}/aduan/upload`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || `Upload gagal: HTTP ${res.status}`);
        }
        const data = await res.json();
        return data.url;
    },

    // Upload file dokumen aduan (legacy compat)
    uploadFileToBucket: async (file: File, _bucketName: string, _aduanId: string): Promise<string> => {
        return AduanService.uploadFile(file, 'dokumen');
    },

    uploadSuratMasuk: async (file: File | Blob, _ticketNumber: string): Promise<string> => {
        return AduanService.uploadFile(file, 'surat_masuk');
    },

    uploadTindakLanjutFile: async (file: File | Blob, _aduanId: string): Promise<string> => {
        return AduanService.uploadFile(file, 'tindak_lanjut');
    },

    uploadAdditionalDocuments: async (aduanId: string, files: File[]): Promise<void> => {
        for (const file of files) {
            const url = await AduanService.uploadFile(file, 'dokumen');
            await api.post(`/aduan/${aduanId}/documents`, {
                file_url: url,
                file_name: file.name,
                file_category: 'susulan',
            });
        }
    },

    createAduanWithFiles: async (
        formData: any,
        selectedKpsList: any[],
        files: { documents?: File[] },
        userId: string,
        _userName: string
    ): Promise<string> => {
        const payload = {
            surat_nomor: formData.surat_nomor,
            surat_tanggal: formData.surat_tanggal,
            surat_asal_perihal: formData.surat_asal_perihal,
            isi_disposisi: formData.isi_disposisi,
            pengadu_nama: formData.pengadu_nama,
            pengadu_instansi: formData.pengadu_instansi,
            kategori_masalah: formData.kategori_masalah,
            ringkasan_masalah: formData.ringkasan_masalah,
            status: 'aduan masuk',
            id_kps_api: selectedKpsList.map(k => k.id_kps_api),
            nama_kps: selectedKpsList.map(k => k.nama_kps),
            jenis_kps: selectedKpsList.map(k => k.jenis_kps),
            nomor_sk: selectedKpsList.map(k => k.nomor_sk),
            lokasi_prov: formData.lokasi_prov,
            lokasi_kab: formData.lokasi_kab,
            lokasi_kec: formData.lokasi_kec,
            lokasi_desa: formData.lokasi_desa,
            lokasi_luas_ha: formData.lokasi_luas_ha,
            jumlah_kk: formData.jumlah_kk,
            lokasi_lat: formData.lokasi_lat,
            lokasi_lng: formData.lokasi_lng,
        };

        const aduan = await api.post('/aduan', payload);
        const aduanId = aduan.id;

        if (files.documents && files.documents.length > 0) {
            for (const doc of files.documents) {
                const url = await AduanService.uploadFile(doc, 'dokumen');
                await api.post(`/aduan/${aduanId}/documents`, {
                    file_url: url,
                    file_name: doc.name,
                    file_category: 'dokumen',
                });
            }
        }

        return aduanId;
    },

    getAduanList: async (page: number = 1, pageSize: number = 20, searchTerm?: string): Promise<Aduan[]> => {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(pageSize),
        });
        if (searchTerm?.trim()) params.set('search', searchTerm.trim());

        const data = await api.get(`/aduan?${params}`);
        return (data.data || []).map(AduanService.mapToAduan);
    },

    getAduanByDateRange: async (startDate: string, endDate: string, provinsi?: string): Promise<Aduan[]> => {
        const params = new URLSearchParams({ limit: '1000' });
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        if (provinsi && provinsi !== 'all') params.set('provinsi', provinsi);

        const data = await api.get(`/aduan?${params}`);
        return (data.data || []).map(AduanService.mapToAduan);
    },

    getAduanCount: async (filters?: { status?: string }): Promise<number> => {
        const params = new URLSearchParams({ limit: '1' });
        if (filters?.status) params.set('status', filters.status);
        const data = await api.get(`/aduan?${params}`);
        return data.total || 0;
    },

    getAduanById: async (id: string): Promise<Aduan | null> => {
        try {
            const data = await api.get(`/aduan/${id}`);
            return AduanService.mapToAduan(data);
        } catch {
            return null;
        }
    },

    getAduanByTicket: async (nomorTiket: string): Promise<Aduan | null> => {
        try {
            const data = await api.get(`/aduan?nomor_tiket=${encodeURIComponent(nomorTiket)}`);
            if (!data.data || data.data.length === 0) return null;
            const aduan = AduanService.mapToAduan(data.data[0]);
            // Ambil dokumen dari detail endpoint
            const detail = await api.get(`/aduan/${aduan.id}`);
            aduan.documents = detail.documents || [];
            return aduan;
        } catch {
            return null;
        }
    },

    updateAduan: async (id: string, data: Partial<Aduan>): Promise<boolean> => {
        const updateData: Record<string, any> = {};

        if (data.status) {
            updateData.status = data.status;
            if (data.status === 'ditolak') updateData.ditolak_at = new Date().toISOString();
        }
        if (data.skema !== undefined) updateData.skema = data.skema;
        if (data.arahanDisposisi) updateData.arahan_disposisi = data.arahanDisposisi;
        if (data.picId) updateData.pic_id = data.picId;
        if (data.picName) updateData.pic_name = data.picName;
        if (data.isBlocked !== undefined) updateData.is_blocked = data.isBlocked;
        if (data.deadline) updateData.deadline = data.deadline instanceof Date ? data.deadline.toISOString() : data.deadline;
        if (data.updatedBy) updateData.updated_by = data.updatedBy;
        if (data.jumlahKK !== undefined) updateData.jumlah_kk = data.jumlahKK;
        if (data.alasanPenolakan !== undefined) updateData.alasan_penolakan = data.alasanPenolakan;
        if (data.driveFolderId) updateData.drive_folder_id = data.driveFolderId;
        if (data.perihal) updateData.surat_asal_perihal = data.perihal;
        if (data.ringkasanMasalah) updateData.ringkasan_masalah = data.ringkasanMasalah;

        if (data.lokasi) {
            if (data.lokasi.provinsi) updateData.lokasi_prov = data.lokasi.provinsi;
            if (data.lokasi.kabupaten) updateData.lokasi_kab = data.lokasi.kabupaten;
            if (data.lokasi.kecamatan) updateData.lokasi_kec = data.lokasi.kecamatan;
            if (data.lokasi.desa) updateData.lokasi_desa = data.lokasi.desa;
            if (data.lokasi.luasHa !== undefined) updateData.lokasi_luas_ha = data.lokasi.luasHa;
        }
        if (data.suratMasuk) {
            if (data.suratMasuk.fileUrl !== undefined) updateData.surat_file_url = data.suratMasuk.fileUrl;
            if (data.suratMasuk.nomorSurat) updateData.surat_nomor = data.suratMasuk.nomorSurat;
            if (data.suratMasuk.tanggalSurat) updateData.surat_tanggal = data.suratMasuk.tanggalSurat instanceof Date ? data.suratMasuk.tanggalSurat.toISOString() : data.suratMasuk.tanggalSurat;
            if (data.suratMasuk.isiDisposisi) updateData.isi_disposisi = data.suratMasuk.isiDisposisi;
        }

        await api.patch(`/aduan/${id}`, updateData);
        return true;
    },

    deleteAduan: async (id: string): Promise<boolean> => {
        await api.delete(`/aduan/${id}`);
        return true;
    },

    getMasterStatuses: async (): Promise<{ id: number; nama_status: string }[]> => {
        try {
            return await api.get('/master/status');
        } catch {
            return [];
        }
    },

    getJenisTindakLanjut: async (): Promise<{ id: number; nama_jenis_tl: string }[]> => {
        try {
            return await api.get('/master/jenis-tl');
        } catch {
            return [];
        }
    },

    getTindakLanjutList: async (aduanId: string): Promise<TindakLanjut[]> => {
        try {
            const data = await api.get(`/aduan/${aduanId}/tindak-lanjut`);
            return (data || []).map((item: any) => ({
                id: item.id,
                aduanId: item.aduan_id,
                tanggal: new Date(item.tanggal),
                jenisTL: item.jenis_tl,
                keterangan: item.keterangan,
                nomorSuratOutput: item.nomor_surat_output,
                fileUrls: item.file_urls || [],
                linkDrive: item.link_drive,
                createdBy: item.created_by,
                createdByName: item.created_by_name,
                createdAt: new Date(item.created_at),
            } as TindakLanjut));
        } catch {
            return [];
        }
    },

    createTindakLanjut: async (data: Omit<TindakLanjut, 'id' | 'createdAt'>): Promise<boolean> => {
        await api.post(`/aduan/${data.aduanId}/tindak-lanjut`, {
            tanggal: data.tanggal instanceof Date ? data.tanggal.toISOString().slice(0, 10) : data.tanggal,
            jenis_tl: data.jenisTL,
            keterangan: data.keterangan,
            nomor_surat_output: data.nomorSuratOutput,
            file_urls: data.fileUrls,
            link_drive: data.linkDrive,
        });
        return true;
    },

    deleteTindakLanjut: async (id: string): Promise<boolean> => {
        await api.delete(`/tindak-lanjut/${id}`);
        return true;
    },

    getUniqueProvinces: async (): Promise<string[]> => {
        try {
            return await api.get('/aduan/provinces');
        } catch {
            return [];
        }
    },

    getUsersByRole: async (role?: string): Promise<User[]> => {
        try {
            const params = role ? `?role=${role}` : '';
            const data = await api.get(`/users${params}`);
            return (data || []).map((user: any) => ({
                id: user.id,
                email: user.email,
                displayName: user.display_name,
                role: user.role,
                phone: user.phone,
                photoURL: user.photo_url,
                isActive: user.is_active,
                createdAt: new Date(user.created_at),
                updatedAt: new Date(user.updated_at),
            } as User));
        } catch {
            return [];
        }
    },

    updateUserProfile: async (userId: string, data: Partial<User>): Promise<boolean> => {
        const updateData: any = {};
        if (data.displayName) updateData.display_name = data.displayName;
        if (data.phone) updateData.phone = data.phone;
        if (data.photoURL) updateData.photo_url = data.photoURL;
        if (data.role) updateData.role = data.role;
        if (data.isActive !== undefined) updateData.is_active = data.isActive;
        await api.patch(`/users/${userId}`, updateData);
        return true;
    },

    extractStoragePath: (url: string): string | null => {
        if (!url) return null;
        const match = url.match(/\/uploads\/(.+)$/);
        return match ? match[1] : null;
    },

    mapToAduan: (row: any): Aduan => {
        return {
            id: row.id,
            nomor_tiket: row.nomor_tiket,
            nomorTiket: row.nomor_tiket,
            created_at: new Date(row.created_at),
            createdAt: new Date(row.created_at),
            surat_nomor: row.surat_nomor,
            surat_tanggal: row.surat_tanggal ? new Date(row.surat_tanggal) : undefined,
            surat_asal_perihal: row.surat_asal_perihal,
            isi_disposisi: row.isi_disposisi,
            pengadu_nama: row.pengadu_nama,
            pengadu_instansi: row.pengadu_instansi,
            kategori_masalah: row.kategori_masalah,
            kategoriMasalah: row.kategori_masalah,
            ringkasan_masalah: row.ringkasan_masalah,
            ringkasanMasalah: row.ringkasan_masalah,
            status: row.status,
            prioritas: row.prioritas || 'biasa',
            id_kps_api: row.id_kps_api || [],
            nama_kps: row.nama_kps || [],
            jenis_kps: row.jenis_kps || [],
            nomor_sk: row.nomor_sk || [],
            lokasi_prov: row.lokasi_prov,
            lokasi_kab: row.lokasi_kab,
            lokasi_kec: row.lokasi_kec,
            lokasi_desa: row.lokasi_desa,
            lokasi_luas_ha: Number(row.lokasi_luas_ha),
            jumlah_kk: Number(row.jumlah_kk),
            lokasi_lat: Array.isArray(row.lokasi_lat) ? row.lokasi_lat.map(Number) : (row.lokasi_lat ? [Number(row.lokasi_lat)] : undefined),
            lokasi_lng: Array.isArray(row.lokasi_lng) ? row.lokasi_lng.map(Number) : (row.lokasi_lng ? [Number(row.lokasi_lng)] : undefined),
            createdBy: row.created_by,
            createdByName: row.creator_name || row.creator?.display_name,
            updatedAt: new Date(row.updated_at),
            pengadu: {
                nama: row.pengadu_nama || '',
                telepon: row.pengadu_telepon || '',
                email: row.pengadu_email || '',
                instansi: row.pengadu_instansi || '',
            },
            suratMasuk: {
                nomorSurat: row.surat_nomor || '',
                tanggalSurat: row.surat_tanggal ? new Date(row.surat_tanggal) : new Date(),
                asalSurat: row.surat_asal || '',
                perihal: row.surat_asal_perihal || '',
                asalSuratKategori: row.surat_asal_kategori || 'Masyarakat',
                isiDisposisi: row.isi_disposisi || '',
                fileUrl: row.surat_file_url || '',
            },
            lokasi: {
                provinsi: row.lokasi_prov || '',
                kabupaten: row.lokasi_kab || '',
                kecamatan: row.lokasi_kec || '',
                desa: row.lokasi_desa || '',
                luasHa: Number(row.lokasi_luas_ha) || 0,
                balaiId: row.lokasi_balai_id || '',
                balaiName: row.lokasi_balai_name || '',
                koordinat: (row.lokasi_lat && row.lokasi_lng) ? {
                    lat: Array.isArray(row.lokasi_lat) ? Number(row.lokasi_lat[0]) : Number(row.lokasi_lat),
                    lng: Array.isArray(row.lokasi_lng) ? Number(row.lokasi_lng[0]) : Number(row.lokasi_lng),
                } : undefined,
            },
            perihal: row.surat_asal_perihal || '',
            skema: row.skema || '',
            picId: row.pic_id || '',
            picName: row.pic_name || '',
            deadline: row.deadline || undefined,
            alasanPenolakan: row.alasan_penolakan || '',
            driveFolderId: row.drive_folder_id || '',
        };
    },
};
```

**Step 2: Verifikasi tidak ada import supabase tersisa**

```bash
grep -n "supabase" /home/ryandshinevps/kitapantaups/src/lib/aduan.service.ts
```

Expected: tidak ada output.

**Step 3: Commit**

```bash
cd /home/ryandshinevps/kitapantaups
git add src/lib/aduan.service.ts
git commit -m "feat(frontend): migrasi aduan.service.ts dari supabase ke api lokal"
```

---

### Task 4: Verifikasi TypeScript build frontend

**Files:** —

**Step 1: Run tsc check**

```bash
cd /home/ryandshinevps/kitapantaups
npx tsc --noEmit
```

Expected: Tidak ada error TypeScript. Jika ada error, perbaiki type mismatch sesuai pesan error.

**Step 2: Cek sisa referensi supabase di src/**

```bash
grep -r "from.*supabase\|import.*supabase" /home/ryandshinevps/kitapantaups/src/ --include="*.ts" --include="*.tsx"
```

Expected: Hanya `src/lib/supabase.ts` yang muncul (file definisi, belum dihapus). Jika ada file lain yang masih import supabase, perbaiki.

**Step 3: Commit fix jika ada**

```bash
git add -p
git commit -m "fix(frontend): perbaiki sisa referensi supabase"
```

---

### Task 5: Smoke test end-to-end

**Step 1: Pastikan server/.env ada dan terisi**

```bash
cat /home/ryandshinevps/kitapantaups/server/.env
```

Expected: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, PORT=3001, BASE_URL terisi.

Jika belum ada `.env`:
```bash
cp /home/ryandshinevps/kitapantaups/server/.env.example /home/ryandshinevps/kitapantaups/server/.env
```

Isi JWT_SECRET dan JWT_REFRESH_SECRET dengan string random:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Step 2: Jalankan backend**

```bash
cd /home/ryandshinevps/kitapantaups/server
npm run dev
```

Expected: `SIPANTAUPS API running on port 3001`

**Step 3: Test login endpoint**

```bash
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sipantaups.local","password":"Admin@1234"}' | jq .
```

Expected: response dengan `access_token`, `refresh_token`, `user`.

**Step 4: Test get aduan (gunakan token dari step 3)**

```bash
TOKEN="<paste access_token dari step 3>"
curl -s http://localhost:3001/aduan \
  -H "Authorization: Bearer $TOKEN" | jq '.total, .data | length'
```

Expected: angka total dan jumlah data.

**Step 5: Jalankan frontend dev server**

```bash
cd /home/ryandshinevps/kitapantaups
npm run dev
```

Buka browser ke `http://localhost:5173`, login dengan `admin@sipantaups.local` / `Admin@1234`.

Verifikasi:
- [ ] Login berhasil
- [ ] Halaman dashboard muncul tanpa error console
- [ ] List aduan terbuka
- [ ] Detail aduan terbuka

**Step 6: Commit final**

```bash
cd /home/ryandshinevps/kitapantaups
git add .
git commit -m "chore: smoke test passed - migrasi supabase ke lokal selesai"
```
