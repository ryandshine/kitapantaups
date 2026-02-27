# Hapus Disposisi & Format Nomor Tiket Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Hapus field `isi_disposisi` dari seluruh lapisan (DB, backend, frontend), ubah format nomor tiket dari `ADU/26/000001` menjadi `ADU26000001` (hanya alfanumerik), dan ubah folder upload file agar menggunakan nomor tiket sebagai nama folder (bukan UUID).

**Architecture:** Perubahan bersifat subtraktif (hapus field) + substitusi format string + reorganisasi folder upload. DB column di-drop via ALTER TABLE. Folder upload diubah dari `uploads/{uuid}/` menjadi `uploads/{nomorTiket}/`. Karena uploads masih kosong (hanya `.gitkeep`), tidak perlu migrasi file existing.

**Tech Stack:** PostgreSQL 16 (Docker), Node.js + Hono (backend), React + TypeScript (frontend)

---

## Task 1: Hapus kolom `isi_disposisi` dari database

**Files:**
- Modify: `scripts/init_db.sql` (dokumentasi skema)

**Step 1: Drop kolom langsung di database**

```bash
docker exec gealgeolgeo-postgis psql -U gealgeolgeo -d kitapantaups -c "ALTER TABLE aduan DROP COLUMN IF EXISTS isi_disposisi;"
```

Expected output: `ALTER TABLE`

**Step 2: Verifikasi kolom sudah hilang**

```bash
docker exec gealgeolgeo-postgis psql -U gealgeolgeo -d kitapantaups -c "\d aduan" | grep isi_disposisi
```

Expected output: kosong (tidak ada hasil)

**Step 3: Update init_db.sql — hapus baris definisi kolom**

Di `scripts/init_db.sql` baris 174, hapus:
```sql
  isi_disposisi       text,
```

**Step 4: Commit**

```bash
git add scripts/init_db.sql
git commit -m "chore: drop isi_disposisi column from aduan table"
```

---

## Task 2: Hapus `isi_disposisi` dari backend (Hono routes)

**Files:**
- Modify: `server/src/routes/aduan.ts`

**Step 1: Hapus dari `createAduanSchema` (baris ~250)**

Hapus baris:
```ts
  isi_disposisi: z.string().optional(),
```

**Step 2: Hapus dari INSERT query (baris ~285-293)**

Ubah INSERT dari:
```ts
`INSERT INTO aduan (
  nomor_tiket, surat_nomor, surat_tanggal, surat_asal_perihal, isi_disposisi,
  pengadu_nama, ...
  jumlah_kk, lokasi_lat, lokasi_lng, created_by
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
RETURNING *`,
[
  nomorTiket, data.surat_nomor, data.surat_tanggal, data.surat_asal_perihal, data.isi_disposisi,
  data.pengadu_nama, ...
  data.jumlah_kk, data.lokasi_lat, data.lokasi_lng, user.userId,
]
```

Menjadi (tanpa `isi_disposisi`, parameter berkurang dari $22 ke $21):
```ts
`INSERT INTO aduan (
  nomor_tiket, surat_nomor, surat_tanggal, surat_asal_perihal,
  pengadu_nama, pengadu_instansi, kategori_masalah, ringkasan_masalah,
  nama_kps, jenis_kps, nomor_sk, id_kps_api,
  lokasi_prov, lokasi_kab, lokasi_kec, lokasi_desa, lokasi_luas_ha,
  jumlah_kk, lokasi_lat, lokasi_lng, created_by
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
RETURNING *`,
[
  nomorTiket, data.surat_nomor, data.surat_tanggal, data.surat_asal_perihal,
  data.pengadu_nama, data.pengadu_instansi, data.kategori_masalah, data.ringkasan_masalah,
  data.nama_kps, data.jenis_kps, data.nomor_sk, data.id_kps_api,
  data.lokasi_prov, data.lokasi_kab, data.lokasi_kec, data.lokasi_desa, data.lokasi_luas_ha,
  data.jumlah_kk, data.lokasi_lat, data.lokasi_lng, user.userId,
]
```

**Step 3: Hapus dari `updateAduanSchema` (baris ~308)**

Hapus baris:
```ts
  isi_disposisi: z.string().optional(),
```

**Step 4: Commit**

```bash
git add server/src/routes/aduan.ts
git commit -m "feat: remove isi_disposisi from aduan API routes"
```

---

## Task 3: Hapus `isi_disposisi` dari service layer frontend

**Files:**
- Modify: `src/lib/aduan.service.ts`

**Step 1: Hapus dari `createAduanWithFiles` payload (baris ~68)**

Hapus baris:
```ts
isi_disposisi: formData.isi_disposisi,
```

**Step 2: Hapus dari `updateAduan` (baris ~275)**

Hapus baris:
```ts
if (data.suratMasuk.isiDisposisi) updateData.isi_disposisi = data.suratMasuk.isiDisposisi;
```

**Step 3: Hapus dari `mapToAduan` (baris ~330 dan ~365)**

Hapus baris:
```ts
isi_disposisi: row.isi_disposisi,
```

Dan di blok `suratMasuk`:
```ts
isiDisposisi: row.isi_disposisi || '',
```

**Step 4: Commit**

```bash
git add src/lib/aduan.service.ts
git commit -m "feat: remove isi_disposisi from aduan service layer"
```

---

## Task 4: Hapus `isiDisposisi` dari TypeScript types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Hapus dari interface `SuratMasuk` (baris ~95)**

Hapus baris:
```ts
    isiDisposisi?: string;
```

**Step 2: Hapus dari interface `Aduan` (baris ~139)**

Hapus baris:
```ts
    isi_disposisi?: string;
```

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: remove isi_disposisi from TypeScript types"
```

---

## Task 5: Hapus disposisi dari halaman Buat Aduan

**Files:**
- Modify: `src/pages/NewAduanPage.tsx`

**Step 1: Hapus dari interface form state (baris ~47)**

Hapus baris:
```ts
        isiDisposisi: string;
```

**Step 2: Hapus dari initial state (baris ~130)**

Hapus baris:
```ts
            isiDisposisi: ''
```

**Step 3: Hapus dari payload submit (baris ~207)**

Hapus baris:
```ts
                isi_disposisi: formData.suratMasuk.isiDisposisi,
```

**Step 4: Hapus input Textarea "Isi Disposisi" dari JSX (baris ~353-362)**

Hapus seluruh blok:
```tsx
<div className="sm:col-span-2">
    <Textarea
        label="Isi Disposisi"
        placeholder="Tuliskan arahan atau isi disposisi dari surat masuk..."
        value={formData.suratMasuk.isiDisposisi}
        onChange={e => handleSuratChange('isiDisposisi', e.target.value)}
        fullWidth
        rows={3}
    />
</div>
```

**Step 5: Commit**

```bash
git add src/pages/NewAduanPage.tsx
git commit -m "feat: remove isi_disposisi input from new aduan form"
```

---

## Task 6: Hapus disposisi dari halaman Detail Aduan

**Files:**
- Modify: `src/pages/AduanDetailPage.tsx`

**Step 1: Hapus `isiDisposisi` dari editForm initial state (baris ~170)**

Hapus baris:
```ts
        isiDisposisi: '',
```

**Step 2: Hapus dari kedua `setEditForm` dalam useEffect dan `openEditModal` (baris ~216 dan ~389)**

Hapus baris:
```ts
                isiDisposisi: aduan.suratMasuk?.isiDisposisi || '',
```
(ada di 2 tempat)

**Step 3: Hapus dari `handleEditSubmit` payload (baris ~460)**

Hapus baris:
```ts
                    isiDisposisi: editForm.isiDisposisi,
```

**Step 4: Hapus blok tampilan disposisi di view mode (baris ~1030-1044)**

Hapus seluruh blok conditional:
```tsx
{aduan.suratMasuk.isiDisposisi ? (
    <div className="p-3 bg-muted/60 rounded-xl border border-border relative overflow-hidden">
        ...
        "{aduan.suratMasuk.isiDisposisi}"
        ...
    </div>
) : (
    <div className="p-3 bg-muted rounded-xl border border-dashed border-border">
        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest block">Menunggu Disposisi</span>
    </div>
)}
```

**Step 5: Hapus step 'disposisi' dari timeline stepper (baris ~803)**

Hapus baris:
```ts
{ id: 'disposisi', label: 'DISPOSISI', icon: Target, activeStatuses: ['disposisi'] },
```

**Step 6: Hapus option 'disposisi' dari select status di edit form (baris ~1598)**

Hapus baris:
```ts
{ value: 'disposisi', label: 'Disposisi' },
```

**Step 7: Hapus Textarea "Isi Disposisi" dari edit modal (baris ~1751-1760)**

Hapus seluruh blok:
```tsx
<div className="sm:col-span-2">
    <Textarea
        label="Isi Disposisi"
        value={editForm.isiDisposisi}
        onChange={(e) => setEditForm({ ...editForm, isiDisposisi: e.target.value })}
        placeholder="Masukkan isi disposisi..."
        rows={3}
        fullWidth
    />
</div>
```

**Step 8: Commit**

```bash
git add src/pages/AduanDetailPage.tsx
git commit -m "feat: remove isi_disposisi from aduan detail page"
```

---

## Task 7: Bersihkan referensi disposisi di halaman lain & badge

**Files:**
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/components/ui/badge.tsx`

**Step 1: DashboardPage — ubah `totalDisposisi` (baris ~61)**

Ubah dari:
```ts
const totalDisposisi = (stats?.by_status?.['disposisi'] || 0) + (stats?.by_status?.['baru'] || 0);
```

Menjadi:
```ts
const totalDisposisi = stats?.by_status?.['baru'] || 0;
```

**Step 2: DashboardPage — hapus `'update_disposisi'` dari activityUI mapping (baris ~103)**

Ubah dari:
```ts
if (['update_status', 'update_disposisi'].includes(type)) return { ... };
```

Menjadi:
```ts
if (['update_status'].includes(type)) return { ... };
```

**Step 3: badge.tsx — hapus `'disposisi'` dari variant info (baris ~47)**

Ubah dari:
```ts
else if (['proses', 'disposisi', 'tindak_lanjut'].includes(s)) variant = 'info';
```

Menjadi:
```ts
else if (['proses', 'tindak_lanjut'].includes(s)) variant = 'info';
```

**Step 4: Commit**

```bash
git add src/pages/DashboardPage.tsx src/components/ui/badge.tsx
git commit -m "feat: remove disposisi references from dashboard and badge"
```

---

## Task 8: Ubah format nomor tiket dan folder upload

**Files:**
- Modify: `server/src/routes/aduan.ts`
- Modify: `src/lib/aduan.service.ts`

**Step 1: Ubah generasi nomor tiket (baris ~281)**

Ubah dari:
```ts
const nomorTiket = `ADU/${year.toString().slice(2)}/${String(count).padStart(6, '0')}`
```

Menjadi (hanya alfanumerik, tanpa karakter apapun):
```ts
const nomorTiket = `ADU${year.toString().slice(2)}${String(count).padStart(6, '0')}`
```

Contoh hasil: `ADU26000001`

**Step 2: Ubah folder upload agar menggunakan nomor tiket**

Di endpoint `POST /aduan/upload` (baris ~128), saat ini folder menggunakan `safeAduanId` (UUID). Ubah agar query nomor tiket dari DB dan gunakan sebagai nama folder:

```ts
// Setelah aduanCheck berhasil (baris ~108), tambahkan query nomor tiket:
const aduanRow = await pool.query('SELECT nomor_tiket FROM aduan WHERE id = $1 LIMIT 1', [rawAduanId])
const nomorTiket = aduanRow.rows[0].nomor_tiket as string
const safeFolderName = nomorTiket.replace(/[^a-zA-Z0-9_-]/g, '') // "ADU26000001" sudah aman

// Ubah uploadDir dari:
const uploadDir = path.join(__dirname, '../uploads', safeAduanId)
// Menjadi:
const uploadDir = path.join(__dirname, '../uploads', safeFolderName)

// Ubah return URL dari:
return c.json({ url: `${baseUrl}/uploads/${safeAduanId}/${fileName}` })
// Menjadi:
return c.json({ url: `${baseUrl}/uploads/${safeFolderName}/${fileName}` })
```

**Step 3: Update `generateTicketNumber` di service frontend (baris ~134)**

Ubah dari:
```ts
generateTicketNumber: () => `ADU/${new Date().getFullYear().toString().slice(2)}/${Math.floor(100000 + Math.random() * 900000)}`,
```

Menjadi:
```ts
generateTicketNumber: () => `ADU${new Date().getFullYear().toString().slice(2)}${Math.floor(100000 + Math.random() * 900000)}`,
```

**Step 4: Hapus `encodeURIComponent` yang tidak lagi diperlukan**

Di `src/pages/DashboardPage.tsx` baris ~240 dan `src/pages/AduanListPage.tsx` baris ~374, ubah dari:
```tsx
navigate(`/pengaduan/${encodeURIComponent(aduan.nomor_tiket)}`)
```
Menjadi:
```tsx
navigate(`/pengaduan/${aduan.nomor_tiket}`)
```

**Step 5: Commit**

```bash
git add server/src/routes/aduan.ts src/lib/aduan.service.ts src/pages/DashboardPage.tsx src/pages/AduanListPage.tsx
git commit -m "feat: change nomor tiket format to alphanumeric only, organize uploads by tiket folder"
```

---

## Task 9: Verifikasi akhir

**Step 1: Pastikan tidak ada TypeScript error**

```bash
cd /home/ryandshinevps/kitapantaups
npx tsc --noEmit 2>&1 | head -50
```

Expected: tidak ada error terkait `isiDisposisi` atau `isi_disposisi`

**Step 2: Cari sisa referensi disposisi (field, bukan teks UI)**

```bash
grep -r "isiDisposisi\|isi_disposisi" src/ server/src/ --include="*.ts" --include="*.tsx"
```

Expected: tidak ada hasil

**Step 3: Restart backend dan test manual**

```bash
# Cek server berjalan
curl -s http://localhost:3000/health || echo "Backend tidak berjalan"
```

Buka browser, buat aduan baru, pastikan form tidak punya field "Isi Disposisi".
Buka detail aduan, pastikan section disposisi tidak muncul.

**Step 4: Commit final jika ada yang terlewat**

```bash
git add -p  # review setiap perubahan
git commit -m "chore: final cleanup disposisi references"
```
