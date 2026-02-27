# Design: Upload Progress, Delete Lampiran, Status & Timeline Aduan

**Tanggal**: 2026-02-28
**Status**: Disetujui

---

## Ringkasan

Empat area perbaikan dan fitur baru:
1. Fix potensi error pada file upload di semua tempat
2. Progress bar saat upload file
3. Fitur delete file di menu Lampiran (admin only)
4. Pindahkan status progres ke halaman detail aduan + tambah timeline tindak lanjut

---

## Bagian 1: Fix Potensi Error Upload

### Masalah yang Ditemukan

| # | Lokasi | Masalah | Dampak |
|---|--------|---------|--------|
| 1 | `server/routes/aduan.ts:92-143` | File tersimpan ke disk tapi DB insert bisa gagal → orphaned file | Sampah di disk |
| 2 | `AduanDetailPage.tsx:301-306` | Upload TL sequential (for...of) → bisa timeout kalau banyak file | Upload gagal |
| 3 | `PengaturanPage.tsx:35-55` | Tidak ada `catch` block saat upload foto gagal | User tidak tahu error |

### Solusi

1. **Orphaned file**: Tambah `try/catch` di `POST /aduan/upload` — jika DB gagal, hapus file fisik dengan `fs.unlink()`
2. **Sequential TL**: Ganti `for...of` loop → `Promise.all()` di `AduanDetailPage.tsx`
3. **Foto profil**: Tambah `catch` block di `PengaturanPage.tsx` dengan notifikasi error

---

## Bagian 2: Progress Bar Upload

### Komponen yang Diubah

- `src/components/ui/FileUpload.tsx` — tambah prop `uploadProgress?: number` dan tampilkan progress bar
- `src/lib/aduan.service.ts` — tambah callback `onProgress` di fungsi upload menggunakan axios `onUploadProgress`
- `src/lib/user.service.ts` — sama untuk upload foto profil
- `src/pages/AduanDetailPage.tsx` — teruskan progress state ke FileUpload
- `src/pages/NewAduanPage.tsx` — teruskan progress state ke FileUpload
- `src/pages/PengaturanPage.tsx` — tampilkan progress bar foto

### UI

- Progress bar custom Tailwind (`h-2 bg-blue-500 rounded transition-all`)
- Tampil hanya saat `uploadProgress > 0 && uploadProgress < 100`
- Hilang otomatis setelah upload selesai

---

## Bagian 3: Delete File di Menu Lampiran

### Backend

**Endpoint baru**: `DELETE /aduan/:id/documents/:docId`
- Auth: `requireAuth` + cek `user.role === 'admin'`
- Logika:
  1. Query `aduan_documents` by `docId` dan `aduan_id`
  2. Parse `file_url` → extract path fisik di `server/uploads/`
  3. Hapus file fisik dengan `fs.unlink()` (tidak error jika file tidak ada)
  4. Delete record dari tabel `aduan_documents`
  5. Log activity `delete_document`
- Response: `{ success: true }`

### Service Layer

Tambah method `deleteDocument(aduanId, docId)` di `src/lib/aduan.service.ts`

### Frontend (`AduanDetailPage.tsx`)

- Icon `<Trash2>` dari Lucide di setiap baris lampiran
- Hanya muncul jika `user.role === 'admin'`
- Klik → buka `dialog.tsx` confirm: "Hapus file ini secara permanen?"
- Setelah konfirm → hit API → refresh daftar lampiran → notifikasi sukses/gagal

---

## Bagian 4: Status Progres + Timeline di Detail Aduan

### Status Progres (Pindahan dari EditAduanPage)

- Ambil komponen/logika status stepper dari `EditAduanPage`
- Tampilkan di `AduanDetailPage` — **read-only**, tidak bisa diedit dari sini
- Posisi: di bawah info utama aduan, di atas tab

### Timeline Tindak Lanjut

- Posisi: di bawah status progres
- Data per item (minimal): tanggal TL, jenis TL, status TL terkini
- Status TL terkini = item paling baru (sort by `created_at DESC`)
- Komponen: custom Tailwind vertical timeline (vertical line + dot per item)
- Kosong → tampilkan teks "Belum ada tindak lanjut"

### UI Timeline (struktur)

```
● [tanggal] — [jenis TL] — [status TL]
|
● [tanggal] — [jenis TL] — [status TL]
|
● ...
```

---

## File yang Diubah

| File | Perubahan |
|------|-----------|
| `server/src/routes/aduan.ts` | Fix orphaned file, tambah DELETE endpoint |
| `src/components/ui/FileUpload.tsx` | Tambah progress bar |
| `src/lib/aduan.service.ts` | Tambah onProgress callback, tambah deleteDocument |
| `src/lib/user.service.ts` | Tambah onProgress callback upload foto |
| `src/pages/AduanDetailPage.tsx` | Parallel TL upload, delete lampiran, status+timeline |
| `src/pages/NewAduanPage.tsx` | Progress bar upload |
| `src/pages/PengaturanPage.tsx` | Error feedback + progress bar foto |

---

## Keputusan Design

- **Delete**: Admin only, permanen (hapus disk + DB), ada konfirmasi
- **Progress**: axios `onUploadProgress`, UI custom Tailwind
- **Timeline**: minimal (tanggal, jenis TL, status TL), shadcn/ui + Tailwind
- **No Mantine**: Semua UI menggunakan shadcn/ui + Tailwind
