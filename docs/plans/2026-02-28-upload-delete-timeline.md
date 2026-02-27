# Upload Progress, Delete Lampiran & TL Timeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix potensi error upload, tambah progress bar upload, fitur delete lampiran (admin), dan mini-timeline tindak lanjut di bawah status stepper.

**Architecture:** Backend-first untuk endpoint baru (DELETE doc), kemudian service layer, lalu UI. Progress bar menggunakan XHR (bukan fetch) agar bisa track upload progress. Timeline TL adalah komponen baru dengan Tailwind saja.

**Tech Stack:** Hono (backend), React + TailwindCSS + shadcn/ui (frontend), Lucide icons, axios/XHR untuk upload progress.

---

## Task 1: Fix Backend — Orphaned File Cleanup di POST /aduan/upload

**Files:**
- Modify: `server/src/routes/aduan.ts:130-143`

**Konteks:**
Saat ini: file ditulis ke disk (`pipeline`), lalu return JSON. Jika `pipeline` berhasil tapi ada error setelahnya (misalnya response gagal), file tersisa di disk tanpa ada yang tahu. Kita wrap dengan try/catch dan tambah cleanup.

**Step 1: Baca kode saat ini**

Baris 127-143 di `server/src/routes/aduan.ts`:
```ts
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '../uploads', safeAduanId)

await mkdir(uploadDir, { recursive: true })

// Streaming upload to save memory
const writePath = path.join(uploadDir, fileName)
const writeStream = createWriteStream(writePath)

// Convert Web Stream to Node Stream and pipe
await pipeline(file.stream() as any, writeStream)

const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`
return c.json({ url: `${baseUrl}/uploads/${safeAduanId}/${fileName}` })
```

**Step 2: Tambah import `unlink` dan wrap dengan try/catch**

Ubah baris 9 (import writeFile diganti/tambah unlink):
```ts
import { writeFile, mkdir, unlink } from 'fs/promises'
```

Ganti blok baris 127-142 menjadi:
```ts
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '../uploads', safeAduanId)
await mkdir(uploadDir, { recursive: true })

const writePath = path.join(uploadDir, fileName)
const writeStream = createWriteStream(writePath)

try {
  await pipeline(file.stream() as any, writeStream)
} catch (err) {
  // Hapus file parsial jika pipeline gagal
  await unlink(writePath).catch(() => {})
  return c.json({ error: 'Gagal menyimpan file. Silakan coba lagi.' }, 500)
}

const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`
return c.json({ url: `${baseUrl}/uploads/${safeAduanId}/${fileName}` })
```

**Step 3: Verifikasi manual**
- Restart server: `cd server && npm run dev`
- Tidak ada error TypeScript

**Step 4: Commit**
```bash
git add server/src/routes/aduan.ts
git commit -m "fix: cleanup orphaned file if upload pipeline fails"
```

---

## Task 2: Fix Frontend — Parallel Upload TL di AduanDetailPage

**Files:**
- Modify: `src/pages/AduanDetailPage.tsx:300-307`

**Konteks:**
Saat ini loop `for...of` sequential — upload file TL satu per satu. Dengan banyak file, ini lambat dan bisa timeout. Ganti ke `Promise.all()`.

**Step 1: Temukan kode saat ini (baris ~301-306)**
```ts
if (tlForm.files && tlForm.files.length > 0) {
    // Upload files sequentially to avoid potential issues
    for (const file of tlForm.files) {
        const uploadedUrl = await AduanService.uploadTindakLanjutFile(file, aduan.id);
        fileUrls.push(uploadedUrl);
    }
}
```

**Step 2: Ganti menjadi parallel**
```ts
if (tlForm.files && tlForm.files.length > 0) {
    fileUrls = await Promise.all(
        tlForm.files.map(file => AduanService.uploadTindakLanjutFile(file, aduan.id))
    );
}
```

**Step 3: Commit**
```bash
git add src/pages/AduanDetailPage.tsx
git commit -m "perf: upload TL files in parallel instead of sequential"
```

---

## Task 3: Tambah Progress Bar ke uploadToServer (XHR)

**Files:**
- Modify: `src/lib/aduan.service.ts:7-30`

**Konteks:**
Fungsi `uploadToServer` saat ini pakai `fetch` yang tidak mendukung `onUploadProgress`. Ganti ke `XMLHttpRequest` agar bisa track progress. Tambah parameter opsional `onProgress?: (percent: number) => void`.

**Step 1: Ganti fungsi `uploadToServer`**

```ts
const uploadToServer = async (
    file: File | Blob,
    category: string,
    aduanId: string,
    onProgress?: (percent: number) => void
): Promise<string> => {
    if (!aduanId) throw new Error('aduanId wajib diisi untuk upload file');
    const token = localStorage.getItem('access_token');
    const API_URL = import.meta.env.VITE_API_URL;
    const formData = new FormData();
    const fileName = file instanceof File ? file.name : `${category}-${Date.now()}.bin`;
    formData.append('file', file, fileName);
    formData.append('category', category);
    formData.append('aduan_id', aduanId);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/aduan/upload`);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (!data?.url) reject(new Error('URL file upload tidak ditemukan'));
                    else resolve(data.url);
                } catch {
                    reject(new Error('Respons tidak valid dari server'));
                }
            } else {
                try {
                    const err = JSON.parse(xhr.responseText);
                    reject(new Error(err.error || 'Gagal upload file'));
                } catch {
                    reject(new Error(`Gagal upload file: ${xhr.statusText}`));
                }
            }
        };

        xhr.onerror = () => reject(new Error('Gagal terhubung ke server'));
        xhr.send(formData);
    });
};
```

**Step 2: Update semua fungsi yang pakai `uploadToServer` agar bisa meneruskan `onProgress`**

Ubah signature fungsi-fungsi yang relevan:
```ts
uploadSuratMasuk: async (f: File | Blob, aduanId: string, onProgress?: (p: number) => void): Promise<string> => {
    return uploadToServer(f, 'surat_masuk', aduanId, onProgress);
},
uploadTindakLanjutFile: async (f: File | Blob, aduanId: string, onProgress?: (p: number) => void): Promise<string> => {
    return uploadToServer(f, 'tindak_lanjut', aduanId, onProgress);
},
uploadAdditionalDocuments: async (id: string, files: File[], onProgress?: (p: number) => void): Promise<void> => {
    for (const file of files) {
        const fileUrl = await uploadToServer(file, 'dokumen', id, onProgress);
        await api.post(`/aduan/${id}/documents`, {
            file_url: fileUrl,
            file_name: file.name,
            file_category: 'dokumen',
        });
    }
},
```

**Step 3: Commit**
```bash
git add src/lib/aduan.service.ts
git commit -m "feat: add onProgress callback to uploadToServer using XHR"
```

---

## Task 4: Tambah Progress Bar UI di FileUpload.tsx

**Files:**
- Modify: `src/components/ui/FileUpload.tsx`

**Konteks:**
Tambah prop `uploadProgress?: number` (0-100). Tampilkan progress bar Tailwind ketika nilai > 0 dan < 100. Setelah 100, hilang otomatis.

**Step 1: Update interface Props**

Tambah ke `FileUploadProps`:
```ts
uploadProgress?: number; // 0-100, tampilkan progress bar saat upload
```

**Step 2: Tambah progress bar di JSX, setelah list file (sebelum error message)**

Di antara `</AnimatePresence>` (penutup file list) dan `<AnimatePresence>` (error), tambahkan:
```tsx
{/* Upload Progress Bar */}
<AnimatePresence>
    {typeof uploadProgress === 'number' && uploadProgress > 0 && uploadProgress < 100 && (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 space-y-1"
        >
            <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                <span>Mengunggah...</span>
                <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                />
            </div>
        </motion.div>
    )}
</AnimatePresence>
```

**Step 3: Commit**
```bash
git add src/components/ui/FileUpload.tsx
git commit -m "feat: add upload progress bar to FileUpload component"
```

---

## Task 5: Hubungkan Progress Bar ke Upload di AduanDetailPage & NewAduanPage

**Files:**
- Modify: `src/pages/AduanDetailPage.tsx`
- Modify: `src/pages/NewAduanPage.tsx`

**Konteks:**
Tambah state `uploadProgress` per upload context (TL, surat), dan teruskan ke `FileUpload` dan `AduanService`.

**Step 1: AduanDetailPage — tambah state dan teruskan ke FileUpload TL**

Tambah state di bagian state declarations:
```tsx
const [tlUploadProgress, setTlUploadProgress] = useState(0);
```

Update `handleTLSubmit` agar passing `onProgress`:
```ts
// Ganti loop lama dengan:
if (tlForm.files && tlForm.files.length > 0) {
    let completed = 0;
    fileUrls = await Promise.all(
        tlForm.files.map(async (file) => {
            const url = await AduanService.uploadTindakLanjutFile(file, aduan.id, (p) => {
                // Rata-rata progress semua file
                setTlUploadProgress(Math.round((completed / tlForm.files.length) * 100 + p / tlForm.files.length));
            });
            completed++;
            return url;
        })
    );
    setTlUploadProgress(0);
}
```

Teruskan ke `FileUpload` di TL Modal:
```tsx
<FileUpload
    // ... props yang sudah ada
    uploadProgress={tlUploadProgress}
/>
```

**Step 2: NewAduanPage — tambah state dan teruskan**

Cari `FileUpload` di NewAduanPage, tambah:
```tsx
const [docUploadProgress, setDocUploadProgress] = useState(0);
```

Teruskan ke `FileUpload`:
```tsx
<FileUpload
    // ... props yang sudah ada
    uploadProgress={docUploadProgress}
/>
```

**Step 3: Commit**
```bash
git add src/pages/AduanDetailPage.tsx src/pages/NewAduanPage.tsx
git commit -m "feat: wire upload progress state to FileUpload components"
```

---

## Task 6: Backend — Endpoint DELETE /aduan/:id/documents/:docId

**Files:**
- Modify: `server/src/routes/aduan.ts` — tambah route baru setelah POST /:id/documents

**Step 1: Tambah import `unlink` jika belum ada (Task 1 sudah)**

**Step 2: Tambah endpoint DELETE**

Setelah blok `POST /:id/documents` (sekitar baris 191), tambahkan:

```ts
// DELETE /aduan/:id/documents/:docId — Admin only
aduan.delete('/:id/documents/:docId', requireAdmin, async (c) => {
  const aduanId = c.req.param('id')
  const docId = c.req.param('docId')

  // Cek dokumen ada dan milik aduan ini
  const docResult = await pool.query(
    'SELECT * FROM aduan_documents WHERE id = $1 AND aduan_id = $2',
    [docId, aduanId]
  )
  if (docResult.rows.length === 0) {
    return c.json({ error: 'Dokumen tidak ditemukan' }, 404)
  }

  const doc = docResult.rows[0]

  // Hapus file fisik dari disk
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    // file_url format: http://host/uploads/aduanId/filename
    const urlPath = new URL(doc.file_url).pathname // /uploads/aduanId/filename
    const filePath = path.join(__dirname, '..', urlPath)
    await unlink(filePath).catch(() => {}) // tidak error kalau file sudah tidak ada
  } catch {
    // URL tidak valid atau path tidak bisa diparsing — tetap lanjut hapus dari DB
  }

  // Hapus dari DB
  await pool.query('DELETE FROM aduan_documents WHERE id = $1', [docId])

  // Log activity
  const user = c.get('user')
  await pool.query(
    `INSERT INTO app_activities (type, description, user_id, user_name, aduan_id, metadata)
     VALUES ('delete_document', $1, $2, $3, $4, $5)`,
    [
      `Menghapus dokumen: ${doc.file_name}`,
      user.userId,
      user.email,
      aduanId,
      JSON.stringify({ file_name: doc.file_name, file_url: doc.file_url })
    ]
  )

  return c.json({ success: true })
})
```

**Step 3: Restart server dan verifikasi tidak ada error TypeScript**

**Step 4: Commit**
```bash
git add server/src/routes/aduan.ts
git commit -m "feat: add DELETE /aduan/:id/documents/:docId endpoint (admin only)"
```

---

## Task 7: Service Layer — Tambah deleteDocument di aduan.service.ts

**Files:**
- Modify: `src/lib/aduan.service.ts`

**Step 1: Tambah method ke AduanService object**

```ts
deleteDocument: async (aduanId: string, docId: string): Promise<void> => {
    await api.delete(`/aduan/${aduanId}/documents/${docId}`);
},
```

**Step 2: Commit**
```bash
git add src/lib/aduan.service.ts
git commit -m "feat: add deleteDocument method to AduanService"
```

---

## Task 8: UI — Tombol Delete di Lampiran Card (AduanDetailPage)

**Files:**
- Modify: `src/pages/AduanDetailPage.tsx`

**Konteks:**
Di section "Lampiran & Berkas" (sekitar baris 1244-1298), tiap item `allAttachments` perlu tombol delete icon `<Trash2>` yang hanya muncul jika `isAdmin && file.source !== 'Tindak Lanjut'` (TL files tidak bisa dihapus dari sini — hapus via delete TL).

**Step 1: Tambah state untuk delete confirmation**

```tsx
const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<{ id: string; fileName: string } | null>(null);
```

**Step 2: Tambah handler deleteDocument**

```tsx
const handleDeleteDocument = async () => {
    if (!deleteConfirmDoc || !aduan) return;
    setDeletingDocId(deleteConfirmDoc.id);
    try {
        await AduanService.deleteDocument(aduan.id, deleteConfirmDoc.id);
        setDeleteConfirmDoc(null);
        refetchAduan();
    } catch (err: any) {
        alert(`Gagal menghapus dokumen: ${err.message || 'Error tidak diketahui'}`);
    } finally {
        setDeletingDocId(null);
    }
};
```

**Step 3: Update `documentAttachments` useMemo untuk menyimpan id raw (tanpa prefix)**

Saat ini id di `allAttachments` untuk dokumen adalah `doc-${doc.id}` (dengan prefix). Kita perlu `rawId` untuk hit API.

Ubah `documentAttachments` (baris 86-94):
```tsx
const documentAttachments = useMemo(() => {
    return (aduan?.documents || []).map((doc) => ({
        id: `doc-${doc.id}`,
        rawId: doc.id,           // tambah rawId
        url: doc.file_url,
        fileName: doc.file_name,
        source: 'Dokumen',
        meta: `Dokumen Pendukung ${doc.file_category === 'susulan' ? '(Susulan)' : ''}`.trim(),
    }));
}, [aduan?.documents]);
```

Update `allAttachments` untuk forward `rawId`:
```tsx
const allAttachments = useMemo(() => {
    const items = [
        ...(suratMasukAttachment ? [suratMasukAttachment] : []),
        ...documentAttachments.map(d => ({ ...d })),  // rawId sudah ada
        ...tindakLanjutAttachments.map((file) => ({
            id: `tl-${file.id}`,
            rawId: undefined,   // TL tidak bisa dihapus dari sini
            url: file.url,
            fileName: file.fileName,
            source: file.source,
            meta: `${file.jenisTL} • ${formatDate(file.tanggal)}`,
        })),
    ];
    return items;
}, [suratMasukAttachment, documentAttachments, tindakLanjutAttachments]);
```

**Step 4: Tambah tombol Trash2 di tiap item lampiran**

Di dalam `allAttachments.map((file) => ...)`, di dalam `<div className="flex items-center gap-1">` (baris 1282), tambahkan sebelum ExternalLink:

```tsx
{isAdmin && file.rawId && (
    <button
        onClick={() => setDeleteConfirmDoc({ id: file.rawId!, fileName: file.fileName })}
        disabled={deletingDocId === file.rawId}
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
        title="Hapus file"
    >
        {deletingDocId === file.rawId ? (
            <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : (
            <Trash2 size={14} />
        )}
    </button>
)}
```

**Step 5: Tambah Dialog konfirmasi hapus (menggunakan `dialog.tsx` yang sudah ada)**

Tambah import `Dialog` dari komponen:
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
```

Tambah dialog di JSX (sebelum penutup `</motion.div>` terluar):
```tsx
{/* Delete Document Confirmation Dialog */}
<Dialog open={!!deleteConfirmDoc} onOpenChange={(open) => !open && setDeleteConfirmDoc(null)}>
    <DialogContent className="max-w-sm">
        <DialogHeader>
            <DialogTitle>Hapus Dokumen</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
            Apakah Anda yakin ingin menghapus <span className="font-semibold text-foreground">"{deleteConfirmDoc?.fileName}"</span>?
            File akan dihapus permanen dan tidak dapat dikembalikan.
        </p>
        <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmDoc(null)}>
                Batal
            </Button>
            <Button
                variant="primary"
                size="sm"
                className="bg-destructive hover:bg-destructive/90 text-white"
                onClick={handleDeleteDocument}
                isLoading={!!deletingDocId}
            >
                Hapus Permanen
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
```

**Step 6: Commit**
```bash
git add src/pages/AduanDetailPage.tsx src/lib/aduan.service.ts
git commit -m "feat: add delete document button in Lampiran section (admin only)"
```

---

## Task 9: UI — Mini Timeline TL di Bawah Status Stepper

**Files:**
- Modify: `src/pages/AduanDetailPage.tsx`

**Konteks:**
Status stepper sudah ada di baris 769-860 (komponen "Professional Status Timeline"). Tambahkan mini-timeline TL di bawahnya.
Data: `qTindakLanjutList` (sorted by tanggal DESC dari API) — tampilkan tanggal, jenisTL, dan note "Terkini" untuk item pertama.

**Step 1: Temukan penutup `</motion.div>` status stepper (baris ~860)**

Setelah baris:
```tsx
            </div>
        </motion.div>
```
(penutup stepper, baris ~860)

**Step 2: Tambahkan komponen mini-timeline langsung di bawahnya**

```tsx
{/* Mini TL Timeline */}
<motion.div
    variants={itemVariants}
    className="no-print relative overflow-hidden sm:rounded-2xl border-y sm:border border-border/60 bg-white dark:bg-card p-6"
>
    <div className="flex items-center gap-2 mb-4">
        <Clock size={15} className="text-muted-foreground" />
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
            Progres Tindak Lanjut
        </span>
        {qTindakLanjutList.length > 0 && (
            <span className="ml-auto text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {qTindakLanjutList.length} catatan
            </span>
        )}
    </div>

    {qTindakLanjutList.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-4">
            Belum ada tindak lanjut
        </p>
    ) : (
        <div className="relative pl-4">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

            <div className="flex flex-col gap-4">
                {qTindakLanjutList.map((tl, index) => (
                    <div key={tl.id} className="relative flex items-start gap-3">
                        {/* Dot */}
                        <div className={cn(
                            "absolute -left-[9px] mt-0.5 h-3 w-3 rounded-full border-2 border-white shrink-0 shadow-sm",
                            index === 0 ? "bg-foreground" : "bg-muted-foreground/40"
                        )} />

                        <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={cn(
                                    "text-[11px] font-bold",
                                    index === 0 ? "text-foreground" : "text-muted-foreground"
                                )}>
                                    {tl.jenisTL}
                                </span>
                                {index === 0 && (
                                    <span className="text-[9px] font-semibold bg-foreground/10 text-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                        Terkini
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Calendar size={9} />
                                <span>{formatDate(tl.tanggal)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )}
</motion.div>
```

**Step 3: Verifikasi tampilan di browser**
- Buka halaman detail aduan
- Status stepper tampil
- Mini timeline muncul di bawah stepper
- Jika belum ada TL → tampil "Belum ada tindak lanjut"
- Item pertama (terkini) ada badge "Terkini" dan dot lebih gelap

**Step 4: Commit**
```bash
git add src/pages/AduanDetailPage.tsx
git commit -m "feat: add TL mini-timeline below status stepper in detail page"
```

---

## Task 10: Verifikasi Akhir

**Step 1: Build frontend**
```bash
cd /home/ryandshinevps/kitapantaups && npm run build
```
Expected: Build berhasil tanpa error TypeScript.

**Step 2: Cek di browser**
- Upload file baru → progress bar muncul
- Setelah upload selesai → progress bar hilang
- Admin melihat icon Trash2 di tiap lampiran dokumen
- Klik Trash2 → dialog konfirmasi muncul
- Konfirmasi hapus → file hilang dari daftar
- Mini TL timeline tampil di bawah status stepper

**Step 3: Final commit**
```bash
git add .
git commit -m "chore: final verification - upload progress, delete lampiran, TL timeline"
```

---

## Ringkasan Perubahan File

| File | Task | Jenis Perubahan |
|------|------|----------------|
| `server/src/routes/aduan.ts` | 1, 6 | Fix orphaned file + endpoint DELETE doc |
| `src/lib/aduan.service.ts` | 3, 7 | XHR progress upload + deleteDocument |
| `src/components/ui/FileUpload.tsx` | 4 | Prop uploadProgress + progress bar UI |
| `src/pages/AduanDetailPage.tsx` | 2, 5, 8, 9 | Parallel TL upload, progress state, delete doc UI, TL timeline |
| `src/pages/NewAduanPage.tsx` | 5 | Progress state untuk upload dokumen |
