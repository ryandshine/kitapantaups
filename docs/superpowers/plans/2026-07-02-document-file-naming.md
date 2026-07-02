# Document File Naming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menggunakan tanggal dokumen dari database untuk nama file baru dan migrasi seluruh file lama tanpa mengubah isi atau metadata historis.

**Architecture:** Utilitas penamaan menerima tanggal dokumen wajib dalam bentuk tanggal kalender. Service mengambil tanggal dari record database, sedangkan migrator membangun rencana idempoten dari hasil join database dan melakukan rename filesystem dengan rollback.

**Tech Stack:** TypeScript, Node.js, Hono, PostgreSQL, Node test runner, React/Vite.

---

### Task 1: Kontrak penamaan

**Files:**
- Modify: `server/src/lib/upload.ts`
- Modify: `server/src/lib/upload.test.ts`

- [ ] Tambahkan test gagal untuk `YYYYMMDD_JenisDokumen_Kode.ext`, PascalCase, dan tanggal kosong/tidak valid.
- [ ] Jalankan `npm test -- src/lib/upload.test.ts` dari `server` dan pastikan gagal karena perilaku lama.
- [ ] Implementasikan parser tanggal kalender wajib dan normalisasi jenis dokumen.
- [ ] Jalankan test hingga lulus.

### Task 2: Upload berdasarkan database

**Files:**
- Modify: `server/src/repositories/aduan.repository.ts`
- Modify: `server/src/services/aduan.service.ts`
- Modify: `server/src/services/storage.service.ts`
- Modify: `server/src/routes/aduan.ts`
- Modify: `src/lib/aduan.uploads.ts`

- [ ] Tambahkan test service/helper yang membuktikan tanggal kosong ditolak tanpa fallback.
- [ ] Ambil `surat_tanggal` bersama data aduan dan teruskan sebagai tanggal wajib ke storage.
- [ ] Kembalikan status `perlu_perbaikan_tanggal_dokumen` untuk data tanpa tanggal.
- [ ] Pertahankan ekstensi asli dan kode acak enam karakter.

### Task 3: Normalisasi lampiran tindak lanjut

**Files:**
- Modify: `server/src/services/tindak-lanjut.service.ts`
- Modify: `server/src/repositories/tindak-lanjut.repository.ts`
- Modify: `server/src/services/storage.service.ts`
- Modify: `src/pages/AduanDetailPage.tsx`
- Modify: `src/lib/aduan.followups.ts`

- [ ] Tambahkan test gagal untuk canonicalization berdasarkan `tanggal` dan `jenis_tl` hasil database.
- [ ] Setelah create/update, canonicalize semua URL lampiran memakai nilai record yang dikembalikan database.
- [ ] Terapkan rollback rename jika update URL database gagal.
- [ ] Pastikan edit tanggal/jenis juga memperbaiki nama file terkait.

### Task 4: Migrasi file lama

**Files:**
- Modify: `server/src/lib/upload-migration.ts`
- Modify: `server/src/lib/upload-migration.test.ts`
- Modify: `server/scripts/migrate_legacy_aduan_documents_storage.ts`

- [ ] Tambahkan test gagal untuk rencana berbasis tanggal database dan skip tanpa tanggal.
- [ ] Ganti seluruh penggunaan `created_at` dengan `aduan.surat_tanggal` atau `tindak_lanjut.tanggal`.
- [ ] Bandingkan target penuh agar nama modern dengan tanggal salah tetap diperbaiki.
- [ ] Laporkan ringkasan `ready`, `already correct`, `needs date repair`, `missing source`, dan `conflict`.

### Task 5: Verifikasi

**Files:**
- Modify: `scripts/init_db.sql`
- Modify: `scripts/init_db_current.sql`
- Modify: `server/src/routes/docs.ts`

- [ ] Selaraskan bootstrap schema dan dokumentasi API bila kontrak berubah.
- [ ] Jalankan seluruh test backend.
- [ ] Jalankan build backend dan frontend.
- [ ] Jalankan migrator tanpa `--apply` pada data produksi dan tinjau seluruh ringkasan.
- [ ] Jangan menjalankan `--apply` sebelum hasil dry-run bebas file hilang dan konflik.

