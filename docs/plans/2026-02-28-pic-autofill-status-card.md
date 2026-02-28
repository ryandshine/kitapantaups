# PIC Auto-fill + Status Card on Detail Page

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-fill PIC dari akun yang login (staf), admin bisa pilih bebas; pindahkan perubahan Status Aduan dari modal edit ke card inline di halaman detail.

**Architecture:**
- `AduanDetailPage.tsx` adalah satu-satunya file yang diubah.
- Tambahkan state `statusForm` terpisah dari `editForm` untuk perubahan status.
- Gunakan `useAuth()` yang sudah ada untuk mendapatkan `user` dan `isAdmin`.

**Tech Stack:** React, TypeScript, Hono backend, `useUpdateAduan` mutation, `useAuth` context.

---

### Task 1: PIC auto-fill untuk staf di `openEditModal`

**Files:**
- Modify: `src/pages/AduanDetailPage.tsx:363-407`

**Step 1: Ubah `openEditModal` agar staf auto-fill PIC dari akun sendiri**

Di dalam fungsi `openEditModal` (baris 363), ubah bagian yang mengeset `picId` dan `picName`:

```typescript
// Sebelum (baris 369-370):
picName: aduan.picName || '',
picId: aduan.picId || '',

// Sesudah:
picName: !isAdmin ? (user?.displayName || user?.email || '') : (aduan.picName || ''),
picId: !isAdmin ? (user?.id || '') : (aduan.picId || ''),
```

**Step 2: Hapus Input readonly "PIC (Nama)" untuk non-admin di JSX edit modal**

Di baris 1610-1618, hapus blok `<Input>` untuk non-admin (staf tidak perlu lihat field ini karena PIC sudah otomatis):

```tsx
// Hapus blok ini (baris 1610-1618):
) : (
    <Input
        label="PIC (Nama)"
        value={editForm.picName}
        disabled
        fullWidth
        helperText="Hanya Admin yang dapat menugaskan PIC"
    />
)}
```

Ganti dengan:
```tsx
) : null}
```

**Step 3: Build dan verifikasi tidak ada error TypeScript**

Jalankan: `cd /home/ryandshinevps/kitapantaups && npm run build 2>&1 | tail -20`
Expected: `✓ built in` tanpa TypeScript error.

**Step 4: Commit**

```bash
git add src/pages/AduanDetailPage.tsx
git commit -m "feat: auto-fill PIC from logged-in user for staf role"
```

---

### Task 2: Tambah state `statusForm` + handler `handleStatusUpdate`

**Files:**
- Modify: `src/pages/AduanDetailPage.tsx:145-175` (state section)
- Modify: `src/pages/AduanDetailPage.tsx:427-491` (handlers section)

**Step 1: Tambah `statusForm` state setelah `editForm` state (baris ~175)**

Setelah closing brace `editForm` state (baris 175), tambahkan:

```typescript
const [statusForm, setStatusForm] = useState({
    status: '',
    alasanPenolakan: '',
});
const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);
```

**Step 2: Tambah `useEffect` untuk sync `statusForm.status` dengan data aduan**

Setelah state di atas, tambahkan:

```typescript
// Sync status form saat data aduan berubah
useEffect(() => {
    if (aduan) {
        setStatusForm({ status: aduan.status || 'baru', alasanPenolakan: aduan.alasanPenolakan || '' });
    }
}, [aduan?.status, aduan?.alasanPenolakan]);
```

**Step 3: Tambah handler `handleStatusUpdate` setelah `handleEditSubmit` (setelah baris 491)**

```typescript
const handleStatusUpdate = () => {
    if (!user || !aduan) return;
    if (statusForm.status === 'ditolak' && !statusForm.alasanPenolakan.trim()) {
        alert('Alasan penolakan wajib diisi jika status Ditolak.');
        return;
    }
    setIsStatusSubmitting(true);
    updateAduan(
        {
            id: aduan.id,
            data: {
                updatedBy: user.id,
                status: statusForm.status as any,
                alasanPenolakan: statusForm.alasanPenolakan,
            },
        },
        {
            onSuccess: () => {
                setIsStatusSubmitting(false);
            },
            onError: (err: any) => {
                setIsStatusSubmitting(false);
                alert(`Gagal mengubah status: ${err.message || 'Error tidak diketahui'}`);
            },
        }
    );
};
```

**Step 4: Build dan verifikasi tidak ada error TypeScript**

Jalankan: `cd /home/ryandshinevps/kitapantaups && npm run build 2>&1 | tail -20`
Expected: `✓ built in` tanpa TypeScript error.

**Step 5: Commit**

```bash
git add src/pages/AduanDetailPage.tsx
git commit -m "feat: add statusForm state and handleStatusUpdate handler"
```

---

### Task 3: Tambah Status Card JSX di halaman detail + bersihkan edit modal

**Files:**
- Modify: `src/pages/AduanDetailPage.tsx:878` (setelah penutup stepper timeline)
- Modify: `src/pages/AduanDetailPage.tsx:1571-1636` (hapus status+alasanPenolakan dari edit modal)
- Modify: `src/pages/AduanDetailPage.tsx:439-474` (hapus status+alasanPenolakan dari `handleEditSubmit`)

**Step 1: Hapus `status` dan `alasanPenolakan` dari `editForm` state**

Di baris 151 dan 169, hapus:
```typescript
status: '',        // baris 151
alasanPenolakan: '',  // baris 169
```

**Step 2: Hapus `status` dan `alasanPenolakan` dari `openEditModal` initializer**

Di baris 368 dan 387:
```typescript
status: aduan.status || 'baru',        // hapus ini
alasanPenolakan: aduan.alasanPenolakan || '',  // hapus ini
```

**Step 3: Hapus `status` dan `alasanPenolakan` dari `handleEditSubmit` updateData**

Di baris 443 dan 450:
```typescript
status: editForm.status as any,    // hapus ini
alasanPenolakan: editForm.alasanPenolakan,  // hapus ini
```

**Step 4: Hapus Status Select + Alasan Penolakan dari JSX edit modal**

Hapus blok baris 1571-1636 (grid yang berisi Status Aduan select, PIC select untuk admin, dan Alasan Penolakan textarea).

> Catatan: PIC select untuk admin TETAP ada (hanya hapus status + alasan penolakan, bukan PIC). Sesuaikan hapus hanya bagian status dan alasan.

Yang dihapus dari baris 1571-1636:
- `<Select label="Status Aduan" .../>` (baris 1572-1586)
- Kondisional alasan penolakan (baris 1621-1636)
- Wrapper `<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 ...">` yang membungkus Status + PIC (ubah menjadi div biasa hanya untuk PIC saja)

Perubahan struktur untuk baris ~1571-1619 (simpan hanya bagian PIC):
```tsx
{isAdmin && (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <Select
            label="PIC (Penanggung Jawab)"
            options={[
                { value: '__none__', label: '-- Pilih PIC --' },
                ...users.map(u => ({ value: u.id, label: u.displayName || u.email }))
            ]}
            value={editForm.picId || '__none__'}
            onChange={(val) => {
                const normalizedValue = val === '__none__' ? '' : val;
                const selectedUser = users.find(u => u.id === normalizedValue);
                setEditForm({
                    ...editForm,
                    picId: normalizedValue,
                    picName: selectedUser ? (selectedUser.displayName || selectedUser.email) : ''
                });
            }}
            fullWidth
            disabled={isLoadingUsers}
        />
        {isLoadingUsers && <p className="text-[10px] text-muted-foreground mt-1">Memuat daftar user...</p>}
    </div>
)}
```

**Step 5: Tambah Status Card JSX setelah penutup stepper timeline (setelah baris 878)**

Sisipkan setelah `</motion.div>` penutup stepper (baris 878), sebelum blok Mini TL Timeline:

```tsx
{/* Status Card — Admin Only */}
{isAdmin && (
    <motion.div
        variants={itemVariants}
        className="no-print relative overflow-hidden sm:rounded-2xl border-y sm:border border-border/60 bg-white dark:bg-card p-6"
    >
        <div className="flex items-center gap-2 mb-4">
            <Settings size={15} className="text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Ubah Status Aduan
            </span>
            <StatusBadge status={aduan.status} className="ml-auto" />
        </div>
        <div className="space-y-3">
            <Select
                label="Status Baru"
                options={masterStatuses.length > 0
                    ? masterStatuses.map(s => ({ value: s.nama_status, label: s.nama_status.toUpperCase() }))
                    : [
                        { value: 'proses', label: 'PROSES' },
                        { value: 'selesai', label: 'SELESAI' },
                        { value: 'ditolak', label: 'DITOLAK' },
                    ]
                }
                value={statusForm.status}
                onChange={(val) => setStatusForm(prev => ({ ...prev, status: val, alasanPenolakan: val !== 'ditolak' ? '' : prev.alasanPenolakan }))}
                fullWidth
            />
            {statusForm.status === 'ditolak' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <Textarea
                        label="Alasan Penolakan"
                        placeholder="Jelaskan alasan mengapa aduan ini ditolak..."
                        value={statusForm.alasanPenolakan}
                        onChange={(e) => setStatusForm(prev => ({ ...prev, alasanPenolakan: e.target.value }))}
                        fullWidth
                        rows={3}
                        required
                    />
                    <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle size={10} /> Wajib diisi jika status Ditolak
                    </p>
                </div>
            )}
            <Button
                type="button"
                onClick={handleStatusUpdate}
                disabled={isStatusSubmitting || statusForm.status === aduan.status}
                size="sm"
                className="w-full sm:w-auto"
            >
                {isStatusSubmitting ? 'Menyimpan...' : 'Simpan Status'}
            </Button>
        </div>
    </motion.div>
)}
```

> **Catatan import**: Pastikan `Settings` sudah diimport dari `lucide-react`. Cek baris import di atas file — jika belum ada, tambahkan `Settings` ke destructuring import lucide-react.

**Step 6: Build dan verifikasi tidak ada error TypeScript**

Jalankan: `cd /home/ryandshinevps/kitapantaups && npm run build 2>&1 | tail -20`
Expected: `✓ built in` tanpa TypeScript error.

**Step 7: Commit**

```bash
git add src/pages/AduanDetailPage.tsx
git commit -m "feat: move status change to detail page card, admin only"
```

---

## Verifikasi Akhir

Setelah semua task selesai, cek manual:
1. Login sebagai **staf** → buka detail aduan → klik Edit → field PIC sudah terisi nama akun staf secara otomatis, tidak bisa diubah (tidak tampil dropdown).
2. Login sebagai **admin** → buka detail aduan → klik Edit → field PIC masih bisa dipilih dari dropdown.
3. Login sebagai **admin** → buka detail aduan → lihat card "Ubah Status Aduan" di bawah stepper → ubah status → klik Simpan → status terupdate.
4. Modal Edit tidak lagi menampilkan Status Aduan select atau Alasan Penolakan.
5. Card "Ubah Status Aduan" tidak tampil jika login sebagai staf.
