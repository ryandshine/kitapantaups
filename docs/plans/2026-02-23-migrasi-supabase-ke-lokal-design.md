# Design: Migrasi Supabase → PostgreSQL Lokal (Tahap Akhir)

**Tanggal:** 2026-02-23
**Status:** Disetujui

## Konteks

Backend Hono API sudah lengkap. AuthContext, user.service, activity.service, master.service sudah migrasi ke api.ts. Yang tersisa: `aduan.service.ts` masih pakai supabase, dan belum ada endpoint file upload di backend.

## Keputusan

- **File storage:** Folder lokal di server (`server/uploads/`), diakses via static endpoint
- **Status default aduan baru:** `'aduan masuk'` (tambahkan ke tabel `master_status`)
- **Pendekatan:** Migrasi langsung, ganti aduan.service.ts sepenuhnya

## Komponen yang Diubah

### Backend (`server/`)

1. **`server/src/routes/aduan.ts`** — Tambah endpoint:
   - `POST /aduan/upload` — multipart file upload, simpan ke `server/uploads/`
   - `GET /aduan/provinces` — unique provinces dari tabel aduan
   - `GET /aduan/:id/documents` — list dokumen aduan
   - `POST /aduan/:id/documents` — insert dokumen aduan
   - Filter `nomor_tiket` di `GET /aduan`

2. **`server/src/index.ts`** — Serve folder `uploads/` sebagai static

3. **`server/uploads/`** — Buat folder, add ke .gitignore

4. **SQL patch** — Tambah `'aduan masuk'` ke `master_status`

### Frontend (`src/`)

5. **`src/lib/aduan.service.ts`** — Ganti seluruh implementasi dari supabase ke `api` dari `./api`. Hapus semua import supabase.

## Mapping Fungsi

| Fungsi | Endpoint Baru |
|--------|--------------|
| `createAduanWithFiles` | `POST /aduan` + `POST /aduan/upload` (multipart) |
| `getAduanList` | `GET /aduan?page=&search=&status=` |
| `getAduanById` | `GET /aduan/:id` |
| `getAduanByTicket` | `GET /aduan?nomor_tiket=` |
| `updateAduan` | `PATCH /aduan/:id` |
| `deleteAduan` | `DELETE /aduan/:id` |
| `createTindakLanjut` | `POST /aduan/:id/tindak-lanjut` |
| `deleteTindakLanjut` | `DELETE /tindak-lanjut/:id` |
| `uploadFileToBucket` | `POST /aduan/upload` (multipart fetch) |
| `getMasterStatuses` | sudah di master.service.ts |
| `getJenisTindakLanjut` | sudah di master.service.ts |
| `getUsersByRole` | sudah di user.service.ts |
| `getUniqueProvinces` | `GET /aduan/provinces` |
| `uploadSuratMasuk` | `POST /aduan/upload` |
| `uploadTindakLanjutFile` | `POST /aduan/upload` |
| `uploadAdditionalDocuments` | `POST /aduan/upload` + `POST /aduan/:id/documents` |
