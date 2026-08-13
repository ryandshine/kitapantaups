# Tambah KPS Manual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan jalur "Tambah KPS Baru" di form Aduan Baru agar staf bisa membuat entri KPS lokal saat lembaga yang dicari belum ada di sinkronisasi GoKUPS (`public.kps`), tanpa risiko entri itu terhapus oleh sinkronisasi berikutnya, dan tanpa mengulangi bug Provinsi/Kabupaten kosong (Provinsi/Kabupaten wajib diisi).

**Architecture:** Kolom `source` baru pada `public.kps` (`'gokups'` vs `'local'`) melindungi entri manual dari penghapusan stale-row saat sync GoKUPS. Endpoint `POST /master/kps` membuat baris baru dengan validasi Zod (nama, skema, provinsi, kabupaten wajib) dan mengembalikan bentuk `KpsData` yang sama seperti hasil pencarian. Frontend menambahkan CTA di `KpsSearch` saat hasil kosong, membuka modal, lalu memakai callback `onSelect` yang sudah ada sehingga alur `NewAduanPage` (auto-isi lokasi dari KPS pertama) tidak perlu diubah.

**Tech Stack:** Hono, PostgreSQL, Zod, TypeScript, React, `pg_trgm` (deteksi kemiripan nama).

**Referensi desain:** `docs/superpowers/specs/2026-08-13-kps-tambah-manual-design.md`

---

### Task 1: Migrasi skema

**Files:**
- Create: `scripts/migrations/0017_add_kps_source_column.sql`

- [ ] Tambah kolom `source text NOT NULL DEFAULT 'gokups'` dan `created_by uuid REFERENCES public.users(id)` ke `public.kps`.
- [ ] Backfill `source = 'gokups'` untuk semua baris existing (default sudah menangani ini, tapi tulis eksplisit untuk kejelasan histori migrasi).
- [ ] Tambah `CHECK (source IN ('gokups', 'local'))`.
- [ ] Tambah index `idx_kps_source` bila query "daftar entri lokal" dibutuhkan admin nanti (opsional, boleh skip jika tidak ada use case langsung).
- [ ] Jalankan migrasi ke DB lokal (`psql "$DATABASE_URL" -f scripts/migrations/0017_add_kps_source_column.sql`) dan verifikasi `\d public.kps`.

### Task 2: Lindungi entri lokal dari sinkronisasi GoKUPS

**Files:**
- Modify: `server/src/services/kps-sync.service.ts`
- Create/Modify: `server/src/services/kps-sync.service.test.ts` (test baru jika belum ada file test untuk service ini — cek dulu)

- [ ] Tulis test gagal: baris `kps` dengan `source='local'` dan tanpa relasi `aduan_kps`, dan `seenIds` dari sync tidak memuat ID-nya → baris tidak boleh terhapus setelah `syncGokupsKps` dijalankan.
- [ ] Ubah klausa `DELETE FROM public.kps` (baris ~258-266) menambahkan `AND source <> 'local'`.
- [ ] Jalankan test hingga lulus.

### Task 3: Repository & service backend untuk create KPS

**Files:**
- Modify: `server/src/repositories/master.repository.ts`
- Modify: `server/src/services/master.service.ts`
- Create: `server/src/schemas/kps.schema.ts` (atau lokasi schema Zod yang sudah dipakai proyek — cek pola existing dulu sebelum membuat file baru)

- [ ] Tulis test gagal untuk schema Zod: nama_lembaga/skema/provinsi/kabupaten kosong → reject; payload valid → parse sukses dengan default numeric 0.
- [ ] Implementasikan schema Zod sesuai kontrak di spec (enum skema + `LAINNYA`, provinsi/kabupaten wajib).
- [ ] Tambah `MasterRepository.createKps(data)`: generate `id = 'local-' + randomUUID()`, insert dengan `source='local'`, `synced_at=now()`, kembalikan baris lewat `KPS_SELECT` yang sudah ada (reuse, jangan duplikasi mapping kolom).
- [ ] Tambah `MasterRepository.findSimilarKps(namaLembaga)` memakai `pg_trgm` `similarity()` untuk deteksi kemiripan nama (threshold 0.4, limit 5).
- [ ] Tambah `MasterService.createKps(payload, actorId)`: validasi Zod, panggil `findSimilarKps` untuk field `candidates` di response, lalu `createKps`.
- [ ] Jalankan test hingga lulus.

### Task 4: Route API

**Files:**
- Modify: `server/src/routes/master.ts`
- Modify: `server/src/routes/docs.ts`

- [ ] Tambah `POST /master/kps` dengan `requireAuth` (bukan `requireAdmin` — staf pembuat aduan butuh akses ini).
- [ ] Kembalikan `400` dengan detail error Zod bila validasi gagal.
- [ ] Kembalikan `201` dengan bentuk `{ data: KpsData, candidates: KpsData[] }`.
- [ ] Tambah entri dokumentasi endpoint baru di `docs.ts` mengikuti pola entri `/master/kps` yang sudah ada.

### Task 5: Frontend service & types

**Files:**
- Modify: `src/lib/kps.service.ts`
- Modify: `src/types/index.ts` (atau file types KPS yang relevan — sesuaikan path exact setelah cek ulang)

- [ ] Tambah `KpsService.createKps(payload): Promise<{ data: KpsData; candidates: KpsData[] }>` memanggil `POST /master/kps`.
- [ ] Tambah field opsional `source?: 'gokups' | 'local'` ke interface `KpsData`.

### Task 6: Modal Tambah KPS

**Files:**
- Create: `src/components/ui/AddKpsModal.tsx`
- Modify: `src/components/ui/KpsSearch.tsx`

- [ ] Form field: Nama Lembaga* (pre-fill dari query pencarian), Skema* (select dari enum), Nomor SK, Tanggal SK, Provinsi*, Kabupaten*, Kecamatan, Desa, Luas Total (Ha), Jumlah Anggota Pria, Jumlah Anggota Wanita.
- [ ] Validasi client-side sinkron dengan aturan backend (provinsi/kabupaten wajib) sebelum submit, tampilkan error inline.
- [ ] Saat submit sukses dan ada `candidates` kemiripan nama, tampilkan daftar kandidat dengan opsi "Pakai KPS ini" (panggil `onSelect(candidate)`, tidak jadi membuat baru) vs "Tetap buat baru" (lanjut pakai hasil create).
- [ ] Saat submit sukses tanpa kandidat (atau setelah user pilih "tetap buat baru"), panggil `onSelect(newKps)` dan tutup modal.
- [ ] Di `KpsSearch.tsx`: tampilkan CTA "Tambah KPS baru" saat `!isLoading && results.length === 0 && query.trim().length > 0`, buka `AddKpsModal` dengan `initialNama = query`.
- [ ] Tambah badge "Data Lokal" pada item hasil pencarian dan panel "KPS Terpilih" (`NewAduanPage.tsx`) saat `kps.source === 'local'`.

### Task 7: Verifikasi end-to-end

**Files:**
- Test: file-file test dari Task 2 & 3

- [ ] Jalankan seluruh test backend baru dan yang sudah ada (`npm test` di `server/`).
- [ ] Jalankan build backend dan frontend.
- [ ] Manual QA di browser: cari nama KPS yang tidak ada → tambah baru dengan provinsi/kabupaten → submit aduan → cek di database `aduan.lokasi_prov`/`lokasi_kab` terisi dan `aduan_kps.kps_id` menunjuk ID `local-...`.
- [ ] Manual QA: jalankan `POST /master/kps/sync` (mode admin) setelah ada entri lokal yang BELUM terhubung ke aduan mana pun → pastikan entri lokal itu tetap ada setelah sync selesai.
- [ ] Pastikan endpoint `/master/kps` (GET, search) dan alur `NewAduanPage` existing tidak regresi.
