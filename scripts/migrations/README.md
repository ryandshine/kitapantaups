# Migration Order

1. Jalankan `scripts/init_db.sql` untuk bootstrap database kosong.
2. Jalankan semua file di folder ini secara berurutan berdasarkan prefix angka.
3. Tambahkan migration baru untuk setiap perubahan skema berikutnya; jangan mengubah migration lama yang sudah dipakai environment lain.

Contoh:

```bash
psql "$DATABASE_URL" -f scripts/init_db.sql
psql "$DATABASE_URL" -f scripts/migrations/0001_sessions_refresh_token_hash.sql
```
