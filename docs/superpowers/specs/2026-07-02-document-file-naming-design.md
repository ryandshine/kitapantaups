# Desain Penamaan File Dokumen

## Tujuan

Semua file arsip menggunakan pola `YYYYMMDD_JenisDokumen_KodeAcak.ext`, dengan tanggal dan jenis dokumen berasal dari data yang tersimpan di database. Tanggal upload, tanggal masuk, dan `created_at` tidak pernah menjadi pengganti.

## Sumber Data

- Dokumen aduan dan surat masuk menggunakan `aduan.surat_tanggal`.
- Lampiran tindak lanjut menggunakan `tindak_lanjut.tanggal`.
- Jenis dokumen aduan menggunakan `aduan_documents.file_category` atau kategori sistem saat upload.
- Jenis lampiran tindak lanjut menggunakan `tindak_lanjut.jenis_tl`.
- Label jenis dibentuk tanpa spasi/tanda baca dalam PascalCase sambil mempertahankan singkatan kapital, misalnya `Surat Masuk` menjadi `SuratMasuk` dan `TL BA Rapat` menjadi `TLBARapat`.

## File Baru

Backend membentuk nama file dan mewajibkan tanggal dokumen yang sudah tersimpan. Dokumen aduan dibentuk setelah aduan tersedia. Lampiran tindak lanjut yang sementara diunggah sebelum record tindak lanjut dibuat akan dinormalisasi oleh backend segera setelah record tanggal dan jenis tersimpan.

Jika tanggal database kosong, backend menolak normalisasi dengan status `perlu_perbaikan_tanggal_dokumen`; tidak ada fallback ke waktu server atau metadata upload.

## File Lama

Skrip migrasi tetap dry-run secara default dan hanya menulis dengan `--apply`. Dokumen aduan di-join ke `aduan.surat_tanggal`; tindak lanjut memakai `tindak_lanjut.tanggal`. Kode enam karakter diturunkan secara stabil dari ID record dan indeks file agar dry-run idempoten.

Setiap rename memeriksa file sumber dan konflik target. Rename filesystem dikembalikan jika update database gagal. Isi file, `created_at`, pembuat, riwayat aktivitas, dan metadata selain basename/URL tidak diubah.

## Pengujian

- Unit test format tanggal, label jenis, ekstensi, dan penolakan tanggal kosong/tidak valid.
- Unit test rencana migrasi untuk tanggal database, status perlu perbaikan, kestabilan kode, dan URL baru.
- Test server lengkap dan build backend/frontend.
- Dry-run produksi untuk menghitung rencana, file yang dilewati, file hilang, dan konflik sebelum `--apply`.

