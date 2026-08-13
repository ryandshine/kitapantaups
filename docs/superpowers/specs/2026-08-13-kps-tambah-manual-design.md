# Desain Fitur Tambah KPS Manual

## Tujuan

Saat membuat aduan baru, staf kadang tidak menemukan KPS/lembaga yang dicari di `KpsSearch` karena datanya belum ada di sinkronisasi GoKUPS (`public.kps`). Fitur ini menambahkan jalur "Tambah KPS Baru" langsung dari form aduan, sehingga staf bisa membuat entri KPS lokal minimal tanpa keluar dari alur pembuatan aduan, lalu langsung memilihnya seperti hasil pencarian biasa.

Ini juga menutup celah yang menyebabkan insiden Provinsi/Kabupaten kosong pada 17 aduan sebelumnya (lihat riwayat perbaikan data 2026-08-13): entri KPS manual **wajib** mengisi provinsi dan kabupaten sebelum bisa disimpan.

## Konteks Data Saat Ini

- `public.kps` adalah cermin dari API eksternal GoKUPS (`server/src/services/kps-sync.service.ts`). Sinkronisasi penuh (`syncGokupsKps`, dipicu `POST /master/kps/sync`) melakukan `UPSERT` semua baris dari API, lalu **menghapus** baris `kps` yang tidak lagi muncul di API tersebut, KECUALI baris itu sudah dipakai oleh `aduan_kps` (lihat `kps-sync.service.ts:256-266`).
- Karena penghapusan itu, entri KPS lokal yang dibuat manual TAPI belum sempat dikaitkan ke aduan berisiko terhapus saat sinkronisasi berikutnya berjalan.
- `aduan_kps.kps_id` adalah foreign key ke `public.kps(id)` dengan `ON DELETE RESTRICT` — jadi begitu terhubung ke aduan, baris KPS tidak akan pernah terhapus otomatis.
- `KpsSearch.tsx` memanggil `GET /master/kps?search=` (`MasterRepository.findKpsAndCountAll`) dan mengembalikan bentuk data yang sama dipakai `NewAduanPage.handleKpsSelect` → `applySelectedKpsToForm` (`src/features/new-aduan/utils.ts`), yang otomatis mengisi Provinsi/Kabupaten form dari KPS pertama yang dipilih.

## Perubahan Skema

Tambah kolom penanda asal data ke `public.kps` agar sinkronisasi GoKUPS tidak pernah menghapus entri buatan staf:

```sql
ALTER TABLE public.kps
  ADD COLUMN source text NOT NULL DEFAULT 'gokups',
  ADD COLUMN created_by uuid REFERENCES public.users(id);

UPDATE public.kps SET source = 'gokups' WHERE source IS DISTINCT FROM 'gokups';

ALTER TABLE public.kps
  ADD CONSTRAINT kps_source_check CHECK (source IN ('gokups', 'local'));
```

`kps-sync.service.ts` diubah agar klausa `DELETE` juga mengecualikan `source = 'local'`:

```sql
DELETE FROM public.kps
WHERE NOT (id = ANY($1::text[]))
  AND source <> 'local'
  AND NOT EXISTS (
    SELECT 1 FROM public.aduan_kps ak WHERE ak.kps_id = public.kps.id
  )
```

ID entri lokal memakai prefix `local-` + UUID (mis. `local-3f9e...`) supaya:
- Tidak pernah bentrok dengan ID numerik/GoKUPS yang datang belakangan.
- Mudah difilter/diaudit (`WHERE id LIKE 'local-%'` atau `WHERE source = 'local'`).

## Endpoint Baru

`POST /master/kps` (auth staf/admin biasa — sama seperti endpoint aduan, bukan `requireAdmin`, karena staf yang bikin aduan adalah yang butuh fitur ini saat itu juga):

**Request body:**
```json
{
  "nama_lembaga": "KTH Sinar Harapan",
  "skema": "HUTAN KEMASYARAKATAN",
  "surat_keputusan": "SK.123/MENLHK-PSKL/PKPS/PSL.0/1/2026",
  "tanggal": "2026-01-15",
  "provinsi": "SULAWESI TENGAH",
  "kabupaten": "MOROWALI UTARA",
  "kecamatan": "Bungku Utara",
  "desa": "Ratombana",
  "luas_total": 120.5,
  "anggota_pria": 30,
  "anggota_wanita": 12
}
```

**Validasi (Zod, `server/src/schemas` mengikuti pola yang sudah ada):**
- `nama_lembaga`: wajib, non-kosong, di-trim.
- `skema`: wajib, salah satu dari enum skema yang sudah dipakai di data (`HUTAN DESA`, `HUTAN KEMASYARAKATAN`, `HUTAN TANAMAN RAKYAT`, `KEMITRAAN KEHUTANAN`, `HUTAN ADAT`, `HUTAN RAKYAT`) plus opsi `LAINNYA` agar tidak memblokir kasus baru.
- `provinsi`, `kabupaten`: **wajib**, non-kosong — ini aturan inti yang mencegah berulangnya bug lokasi kosong.
- `surat_keputusan`, `tanggal`, `kecamatan`, `desa`: opsional.
- `luas_total`, `anggota_pria`, `anggota_wanita`: opsional, angka ≥ 0, default 0.

**Response:** objek `KpsData` dengan bentuk sama seperti `GET /master/kps/:id` (dipakai ulang oleh frontend seolah hasil pencarian biasa), plus field `source: "local"`.

**Deteksi duplikat (soft, non-blocking):** sebelum insert, query kemiripan nama (`similarity(nama_lembaga, $1) > 0.4` via `pg_trgm`, index sudah ada pola serupa di migrasi 0011/0012) dan kembalikan `candidates` di response bila skor tinggi ditemukan namun **tetap membuat data baru** — keputusan pakai yang mana diserahkan ke staf di UI (lihat bagian UI).

## Alur Frontend

1. `KpsSearch.tsx`: ketika pencarian selesai dan `results.length === 0` (dan query tidak kosong), tampilkan baris CTA "KPS/Lembaga tidak ditemukan — Tambah KPS baru?" di bawah pesan "Data tidak ditemukan".
2. Klik CTA membuka `AddKpsModal` (`src/components/ui/AddKpsModal.tsx`, baru), dengan field `nama_lembaga` pre-fill dari teks pencarian.
3. Modal memanggil `KpsService.createKps(payload)` (baru, `src/lib/kps.service.ts`).
4. Jika backend mengembalikan `candidates` kemiripan nama, modal menampilkan daftar itu dulu dengan opsi "Pakai yang ini" (memanggil `onSelect` seperti hasil pencarian biasa, tanpa membuat data baru) atau "Tetap buat baru".
5. Setelah berhasil dibuat, modal memanggil `onSelect(newKps)` — callback yang sama dipakai `KpsSearch` — sehingga `NewAduanPage.handleKpsSelect` memprosesnya persis seperti memilih dari hasil pencarian: masuk ke `selectedKpsList`, dan `applySelectedKpsToForm` otomatis mengisi Provinsi/Kabupaten form dari data yang baru saja diinput staf.
6. Badge kecil "Data Lokal" ditampilkan di panel "KPS Terpilih" dan di baris hasil pencarian bila `kps.source === 'local'`, supaya reviewer tahu entri ini belum tervalidasi GoKUPS.

## Non-Tujuan (v1)

- Tidak ada halaman admin khusus untuk mengelola/menghapus KPS lokal — cukup lewat modal saat membuat aduan.
- Tidak ada proses "merge" otomatis ketika GoKUPS akhirnya menyinkronkan lembaga yang sama dengan ID resmi — entri lokal dan entri GoKUPS akan tetap terpisah sampai ada keputusan manual (dicatat sebagai known limitation, bukan blocker).
- Tidak mengubah `KUPS_SELECT`/relasi `kups` (anggota per kelas) — entri KPS lokal tidak otomatis punya data KUPS.

## Pengujian

- Unit test backend: validasi Zod (nama_lembaga/skema/provinsi/kabupaten wajib), repository insert menghasilkan `id` berprefix `local-` dan `source='local'`.
- Unit test `kps-sync.service.ts`: baris dengan `source='local'` tanpa `aduan_kps` tidak ikut terhapus saat `syncGokupsKps` dijalankan dengan `seenIds` yang tidak memuat ID tersebut.
- Integrasi: buat KPS baru lewat modal di `NewAduanPage`, submit aduan, cek `aduan.lokasi_prov`/`lokasi_kab` terisi dan `aduan_kps` menunjuk ke ID `local-...`.
- Manual QA: cari nama yang mirip entri lokal yang sudah ada, pastikan daftar kandidat kemiripan muncul.
