import { api, API_URL } from './api';
import type { Aduan, KpsData, User, TindakLanjut } from '../types';
import { ActivityService } from './activity.service';

const resolveKpsType = (kps: {
    skema?: string | null;
    kps_type?: string | null;
    jenis_kps?: string | null;
    KPS_TYPE?: string | null;
    SKEMA?: string | null;
}) => [kps.skema, kps.kps_type, kps.jenis_kps, kps.KPS_TYPE, kps.SKEMA]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0) || '';

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    return 'Terjadi kesalahan yang tidak diketahui';
};

const normalizeStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.map((item) => String(item)) : [];

const normalizeNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeOptionalNumber = (value: unknown): number | undefined => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeKpsItem = (item: any): KpsData => ({
    id: String(item?.id || ''),
    nama_lembaga: item?.nama_lembaga || item?.nama_kps || '',
    surat_keputusan: item?.surat_keputusan || item?.nomor_sk || item?.no_sk || '',
    tanggal: item?.tanggal || item?.tanggal_sk || '',
    skema: item?.skema || item?.jenis_kps || item?.kps_type || '',
    provinsi_id: item?.provinsi_id != null ? String(item.provinsi_id) : '',
    kabupaten_id: item?.kabupaten_id != null ? String(item.kabupaten_id) : '',
    kecamatan_id: item?.kecamatan_id != null ? String(item.kecamatan_id) : '',
    desa_id: item?.desa_id != null ? String(item.desa_id) : '',
    provinsi: item?.provinsi || item?.lokasi_prov || '',
    kabupaten: item?.kabupaten || item?.lokasi_kab || '',
    kecamatan: item?.kecamatan || item?.lokasi_kec || '',
    desa: item?.desa || item?.lokasi_desa || '',
    luas_hl: normalizeNumber(item?.luas_hl),
    luas_hp: normalizeNumber(item?.luas_hp),
    luas_hpt: normalizeNumber(item?.luas_hpt),
    luas_hpk: normalizeNumber(item?.luas_hpk),
    luas_hk: normalizeNumber(item?.luas_hk),
    luas_apl: normalizeNumber(item?.luas_apl),
    luas_total: normalizeNumber(item?.luas_total ?? item?.lokasi_luas_ha),
    anggota_pria: normalizeNumber(item?.anggota_pria),
    anggota_wanita: normalizeNumber(item?.anggota_wanita),
    jumlah_anggota: normalizeNumber(item?.jumlah_anggota ?? ((Number(item?.anggota_pria) || 0) + (Number(item?.anggota_wanita) || 0))),
    kps_type: resolveKpsType(item),
    nama_kps: item?.nama_kps || item?.nama_lembaga || '',
    jenis_kps: item?.jenis_kps || '',
    nomor_sk: item?.nomor_sk || item?.surat_keputusan || item?.no_sk || '',
    lokasi_prov: item?.lokasi_prov || item?.provinsi || '',
    lokasi_kab: item?.lokasi_kab || item?.kabupaten || '',
    lokasi_kec: item?.lokasi_kec || item?.kecamatan || '',
    lokasi_desa: item?.lokasi_desa || item?.desa || '',
    lokasi_luas_ha: normalizeNumber(item?.lokasi_luas_ha ?? item?.luas_total),
    jumlah_kk: normalizeNumber(item?.jumlah_kk ?? item?.jumlah_anggota ?? ((Number(item?.anggota_pria) || 0) + (Number(item?.anggota_wanita) || 0))),
    balai: item?.balai || '',
    lat: normalizeOptionalNumber(item?.lat),
    lng: normalizeOptionalNumber(item?.lng),
    source_skema: item?.source_skema || '',
    source_raw_id: item?.source_raw_id || '',
    source_reference: item?.source_reference || '',
    skema_pemanfaatan: item?.skema_pemanfaatan || '',
    tanggal_sk: item?.tanggal_sk || '',
    has_skps: Boolean(item?.has_skps),
    has_petaps: Boolean(item?.has_petaps),
    has_rkps: Boolean(item?.has_rkps),
});

const normalizeKpsItems = (row: any): KpsData[] => {
    if (Array.isArray(row?.kps_items) && row.kps_items.length > 0) {
        return row.kps_items.map((item: any) => normalizeKpsItem(item));
    }

    const kpsIds = normalizeStringArray(row?.kps_ids);
    const namaKps = normalizeStringArray(row?.nama_kps);
    const jenisKps = normalizeStringArray(row?.jenis_kps);
    const typeKps = normalizeStringArray(row?.type_kps);
    const nomorSk = normalizeStringArray(row?.nomor_sk);

    return kpsIds.map((id, index) => normalizeKpsItem({
        id,
        nama_lembaga: namaKps[index] || '',
        surat_keputusan: nomorSk[index] || '',
        skema: typeKps[index] || jenisKps[index] || '',
        provinsi: row?.lokasi_prov || '',
        kabupaten: row?.lokasi_kab || '',
        kecamatan: row?.lokasi_kec || '',
        desa: row?.lokasi_desa || '',
        luas_total: index === 0 ? row?.lokasi_luas_ha : 0,
        jumlah_anggota: index === 0 ? row?.jumlah_kk : 0,
        nama_kps: namaKps[index] || '',
        jenis_kps: jenisKps[index] || '',
        kps_type: typeKps[index] || jenisKps[index] || '',
        nomor_sk: nomorSk[index] || '',
        lokasi_prov: row?.lokasi_prov || '',
        lokasi_kab: row?.lokasi_kab || '',
        lokasi_kec: row?.lokasi_kec || '',
        lokasi_desa: row?.lokasi_desa || '',
        lokasi_luas_ha: index === 0 ? row?.lokasi_luas_ha : 0,
        jumlah_kk: index === 0 ? row?.jumlah_kk : 0,
    }));
};

const uploadToServer = async (
    file: File | Blob,
    category: string,
    aduanId: string,
    onProgress?: (percent: number) => void
): Promise<string> => {
    if (!aduanId) throw new Error('aduanId wajib diisi untuk upload file');
    const token = localStorage.getItem('access_token');
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

export const AduanService = {
    createAduanWithFiles: async (
        formData: any,
        selectedKpsList: any[],
        files: { documents?: File[] },
        userId: string,
        userName: string
    ): Promise<{ id: string; nomorTiket?: string; uploadErrors: string[] }> => {
        const payload: any = {
            surat_nomor: formData.surat_nomor,
            surat_tanggal: formData.surat_tanggal,
            surat_asal_perihal: formData.surat_asal_perihal,
            pengadu_nama: formData.pengadu_nama,
            pengadu_telepon: formData.pengadu_telepon,
            pengadu_email: formData.pengadu_email,
            pengadu_instansi: formData.pengadu_instansi,
            kategori_masalah: formData.kategori_masalah,
            ringkasan_masalah: formData.ringkasan_masalah,
            kps_ids: selectedKpsList.map((k) => k.id),
            lokasi_prov: formData.lokasi_prov,
            lokasi_kab: formData.lokasi_kab,
            lokasi_kec: formData.lokasi_kec,
            lokasi_desa: formData.lokasi_desa,
            lokasi_luas_ha: formData.lokasi_luas_ha,
            jumlah_kk: formData.jumlah_kk,
            lokasi_lat: formData.lokasi_lat,
            lokasi_lng: formData.lokasi_lng,
            pic_id: userId,
            pic_name: userName,
        };
        if (typeof payload.pengadu_email === 'string' && payload.pengadu_email.trim() === '') {
            delete payload.pengadu_email;
        }

        // 1. Create the aduan record first
        const aduan = await api.post('/aduan', payload);
        const uploadErrors: string[] = [];

        // 2. Upload & register document files if provided
        const documentFiles = files?.documents?.filter(f => f instanceof File) ?? [];
        if (documentFiles.length > 0) {
            try {
                const uploadResult = await AduanService.uploadAdditionalDocuments(aduan.id, documentFiles);
                uploadErrors.push(...uploadResult.errors);
            } catch (uploadErr) {
                console.error('File upload failed (aduan sudah tersimpan):', uploadErr);
                uploadErrors.push(getErrorMessage(uploadErr));
            }
        }

        // 3. Log activity
        await ActivityService.logActivity({
            type: 'create_aduan',
            description: `Membuat aduan baru: ${payload.surat_asal_perihal || payload.pengadu_nama}`,
            aduanId: aduan.id,
            userId,
            userName,
            metadata: { nomor_tiket: aduan.nomor_tiket },
        });

        return {
            id: aduan.id,
            nomorTiket: aduan.nomor_tiket,
            uploadErrors,
        };
    },

    uploadFileToBucket: async (f: File, _b: string, _id: string): Promise<string> => {
        return uploadToServer(f, 'dokumen', _id);
    },
    uploadSuratMasuk: async (f: File | Blob, aduanId: string, onProgress?: (p: number) => void): Promise<string> => {
        return uploadToServer(f, 'surat_masuk', aduanId, onProgress);
    },
    uploadTindakLanjutFile: async (f: File | Blob, aduanId: string, onProgress?: (p: number) => void): Promise<string> => {
        return uploadToServer(f, 'tindak_lanjut', aduanId, onProgress);
    },
    uploadAdditionalDocuments: async (id: string, files: File[]): Promise<{ errors: string[] }> => {
        const errors: string[] = [];
        for (const file of files) {
            try {
                const fileUrl = await uploadToServer(file, 'dokumen', id);
                await api.post(`/aduan/${id}/documents`, {
                    file_url: fileUrl,
                    file_name: file.name,
                    file_category: 'dokumen',
                });
            } catch (error) {
                errors.push(`${file.name}: ${getErrorMessage(error)}`);
            }
        }
        return { errors };
    },
    extractStoragePath: (_url: string): string | null => null,
    generateTicketNumber: () => `ADU${new Date().getFullYear().toString().slice(2)}${Math.floor(100000 + Math.random() * 900000)}`,

    getAduanList: async (page = 1, pageSize = 20, searchTerm?: string, statusFilter?: string) => {
        const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
        if (searchTerm?.trim()) params.set('search', searchTerm.trim());
        if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
        const result = await api.get(`/aduan?${params}`);
        return { data: result.data || [], total: result.total || 0 };
    },

    getAduanCount: async (filters?: { status?: string }) => {
        const params = new URLSearchParams({ limit: '1' });
        if (filters?.status) params.set('status', filters.status);
        try { const result = await api.get(`/aduan?${params}`); return result.total || 0; }
        catch { return 0; }
    },

    getDashboardStats: async (): Promise<{ total: number; by_status: Record<string, number>; last_30_days: number }> => {
        try { return await api.get('/dashboard/stats'); }
        catch { return { total: 0, by_status: {}, last_30_days: 0 }; }
    },

    getAduanById: async (id: string) => {
        const data = await api.get(`/aduan/${id}`);
        return AduanService.mapToAduan(data);
    },

    getAduanByTicket: async (nomorTiket: string) => {
        try {
            const result = await api.get(`/aduan?search=${encodeURIComponent(nomorTiket)}&limit=1`);
            const row = result.data?.[0];
            if (!row) return null;
            // Fetch full details using ID to get documents and other related data
            return await AduanService.getAduanById(row.id);
        } catch { return null; }
    },

    getAduanByDateRange: async (startDate: string, endDate: string, provinsi?: string) => {
        let allData: any[] = [];
        let offset = 0;
        const limit = 2000; // Fetch in chunks to prevent server timeout

        while (true) {
            const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
            if (startDate) params.set('start_date', startDate);
            if (endDate) params.set('end_date', endDate);
            if (provinsi && provinsi !== 'all') params.set('provinsi', provinsi);

            try {
                const result = await api.get(`/aduan?${params}`);
                const chunk = result.data || [];
                allData = allData.concat(chunk);
                
                if (chunk.length < limit) break;
                offset += limit;
            } catch (error) {
                console.error('Error fetching chunk:', error);
                break;
            }
        }
        
        return allData.map(AduanService.mapToAduan);
    },

    getUniqueProvinces: async () => {
        try {
            const result = await api.get('/aduan/provinces');
            return Array.isArray(result) ? result : (result.data || []);
        } catch { return []; }
    },

    getMasterStatuses: async () => {
        try { return await api.get('/master/status') as { id: number; nama_status: string }[]; }
        catch { return []; }
    },

    getJenisTindakLanjut: async () => {
        try { return await api.get('/master/jenis-tl') as { id: number; nama_jenis_tl: string }[]; }
        catch { return []; }
    },

    getTindakLanjutList: async (aduanId: string): Promise<TindakLanjut[]> => {
        try {
            const data = await api.get(`/aduan/${aduanId}/tindak-lanjut`);
            return (data || []).map((item: any) => ({
                id: item.id,
                aduanId: item.aduan_id,
                tanggal: new Date(item.tanggal),
                jenisTL: item.jenis_tl,
                keterangan: item.keterangan,
                nomorSuratOutput: item.nomor_surat_output,
                fileUrls: item.file_urls || [],
                createdBy: item.created_by,
                createdByName: item.created_by_name,
                createdAt: new Date(item.created_at),
            } as TindakLanjut));
        } catch { return []; }
    },

    createTindakLanjut: async (data: Omit<TindakLanjut, 'id' | 'createdAt'>) => {
        await api.post(`/aduan/${data.aduanId}/tindak-lanjut`, {
            tanggal: data.tanggal instanceof Date ? data.tanggal.toISOString() : data.tanggal,
            jenis_tl: data.jenisTL,
            keterangan: data.keterangan,
            nomor_surat_output: data.nomorSuratOutput,
            file_urls: data.fileUrls,
        });
        await ActivityService.logActivity({
            type: 'create_tl',
            description: `Menambahkan tindak lanjut: **${data.jenisTL}**`,
            aduanId: data.aduanId,
            userId: data.createdBy,
            userName: data.createdByName || '',
            metadata: { jenisTL: data.jenisTL },
        });
        return true;
    },

    deleteTindakLanjut: async (id: string) => {
        await api.delete(`/tindak-lanjut/${id}`);
        return true;
    },

    updateTindakLanjut: async (data: Partial<TindakLanjut> & { id: string }) => {
        await api.put(`/tindak-lanjut/${data.id}`, {
            tanggal: data.tanggal instanceof Date ? data.tanggal.toISOString() : data.tanggal,
            jenis_tl: data.jenisTL,
            keterangan: data.keterangan,
            nomor_surat_output: data.nomorSuratOutput,
            file_urls: data.fileUrls,
        });
        return true;
    },

    updateAduan: async (id: string, data: Partial<Aduan> & { updatedBy?: string }) => {
        const updateData: any = {};
        const resolvedPerihal = data.perihal !== undefined ? data.perihal : data.suratMasuk?.perihal;
        if (data.status) updateData.status = data.status;
        if (data.alasanPenolakan !== undefined) updateData.alasan_penolakan = data.alasanPenolakan;
        if (data.picId !== undefined) updateData.pic_id = data.picId || null;
        if (data.picName !== undefined) updateData.pic_name = data.picName;
        if (data.jumlahKK !== undefined) {
            const parsedJumlahKk = Number(data.jumlahKK);
            if (Number.isFinite(parsedJumlahKk)) updateData.jumlah_kk = parsedJumlahKk;
        }
        if (resolvedPerihal !== undefined) updateData.surat_asal_perihal = resolvedPerihal;
        if (data.ringkasanMasalah !== undefined) updateData.ringkasan_masalah = data.ringkasanMasalah;
        if (data.kategoriMasalah !== undefined) updateData.kategori_masalah = data.kategoriMasalah;
        if (Array.isArray(data.kps_ids)) updateData.kps_ids = data.kps_ids;
        if (data.lokasi) {
            if (data.lokasi.provinsi !== undefined) updateData.lokasi_prov = data.lokasi.provinsi;
            if (data.lokasi.kabupaten !== undefined) updateData.lokasi_kab = data.lokasi.kabupaten;
            if (data.lokasi.kecamatan !== undefined) updateData.lokasi_kec = data.lokasi.kecamatan;
            if (data.lokasi.desa !== undefined) updateData.lokasi_desa = data.lokasi.desa;
            if (data.lokasi.luasHa !== undefined) {
                const parsedLuasHa = Number(data.lokasi.luasHa);
                if (Number.isFinite(parsedLuasHa)) {
                    updateData.lokasi_luas_ha = parsedLuasHa;
                }
            }
        }
        if (data.suratMasuk) {
            if (data.suratMasuk.nomorSurat !== undefined) updateData.surat_nomor = data.suratMasuk.nomorSurat;
            if (data.suratMasuk.fileUrl !== undefined) updateData.surat_file_url = data.suratMasuk.fileUrl;
        }
        if (data.pengadu) {
            if (data.pengadu.nama !== undefined) updateData.pengadu_nama = data.pengadu.nama;
            if (data.pengadu.telepon !== undefined) updateData.pengadu_telepon = data.pengadu.telepon;
            if (data.pengadu.instansi !== undefined) updateData.pengadu_instansi = data.pengadu.instansi;
            if (data.pengadu.email !== undefined) {
                updateData.pengadu_email = data.pengadu.email?.trim() ? data.pengadu.email.trim() : null;
            }
        }
        if (Object.keys(updateData).length === 0) return true;
        await api.patch(`/aduan/${id}`, updateData);
        await ActivityService.logActivity({
            type: data.status ? 'update_status' : 'update_aduan',
            description: data.status ? `Status diubah ke **${data.status.toUpperCase()}**` : 'Memperbarui detail aduan',
            aduanId: id,
            userId: data.updatedBy || 'system',
            userName: 'User',
            metadata: { fields: Object.keys(updateData) },
        });
        return true;
    },

    deleteAduan: async (id: string) => {
        await api.delete(`/aduan/${id}`);
        return true;
    },

    deleteDocument: async (aduanId: string, docId: string): Promise<void> => {
        await api.delete(`/aduan/${aduanId}/documents/${docId}`);
    },

    getUsersByRole: async (_role?: string): Promise<User[]> => {
        try {
            const data = await api.get('/users');
            return (data || []).map((u: any) => ({
                id: u.id, email: u.email, displayName: u.display_name,
                role: u.role, phone: u.phone, photoURL: u.photo_url,
                isActive: u.is_active, createdAt: new Date(u.created_at), updatedAt: new Date(u.updated_at),
            } as User));
        } catch { return []; }
    },

    updateUserProfile: async (userId: string, data: Partial<User>) => {
        const payload: any = {};
        if (data.displayName) payload.display_name = data.displayName;
        if (data.phone !== undefined) payload.phone = data.phone;
        if (data.role) payload.role = data.role;
        if (data.isActive !== undefined) payload.is_active = data.isActive;
        await api.patch(`/users/${userId}`, payload);
        return true;
    },

    mapToAduan: (row: any): Aduan => {
        const kpsItems = normalizeKpsItems(row);
        const kpsIds = normalizeStringArray(row.kps_ids).length > 0
            ? normalizeStringArray(row.kps_ids)
            : kpsItems.map((item) => item.id);
        const namaKps = normalizeStringArray(row.nama_kps).length > 0
            ? normalizeStringArray(row.nama_kps)
            : kpsItems.map((item) => item.nama_kps || item.nama_lembaga || '');
        const jenisKps = normalizeStringArray(row.jenis_kps).length > 0
            ? normalizeStringArray(row.jenis_kps)
            : kpsItems.map((item) => item.jenis_kps || item.skema || '');
        const typeKps = normalizeStringArray(row.type_kps).length > 0
            ? normalizeStringArray(row.type_kps)
            : kpsItems.map((item) => item.kps_type || item.skema || item.jenis_kps);
        const nomorSk = normalizeStringArray(row.nomor_sk).length > 0
            ? normalizeStringArray(row.nomor_sk)
            : kpsItems.map((item) => item.nomor_sk || item.surat_keputusan || '');

        return {
            id: row.id,
            nomor_tiket: row.nomor_tiket,
            nomorTiket: row.nomor_tiket,
            created_at: new Date(row.created_at),
            createdAt: new Date(row.created_at),
            surat_nomor: row.surat_nomor,
            surat_tanggal: row.surat_tanggal ? new Date(row.surat_tanggal) : undefined,
            surat_asal_perihal: row.surat_asal_perihal,
            pengadu_nama: row.pengadu_nama,
            pengadu_instansi: row.pengadu_instansi,
            kategori_masalah: row.kategori_masalah,
            kategoriMasalah: row.kategori_masalah,
            ringkasan_masalah: row.ringkasan_masalah,
            ringkasanMasalah: row.ringkasan_masalah,
            status: row.status,
            prioritas: 'biasa',
            kps_ids: kpsIds,
            nama_kps: namaKps,
            jenis_kps: jenisKps,
            type_kps: typeKps,
            nomor_sk: nomorSk,
            kps_items: kpsItems,
            lokasi_prov: row.lokasi_prov,
            lokasi_kab: row.lokasi_kab,
            lokasi_kec: row.lokasi_kec,
            lokasi_desa: row.lokasi_desa,
            lokasi_luas_ha: normalizeNumber(row.lokasi_luas_ha),
            jumlah_kk: normalizeNumber(row.jumlah_kk),
            lokasi_lat: Array.isArray(row.lokasi_lat) ? row.lokasi_lat.map(Number) : undefined,
            lokasi_lng: Array.isArray(row.lokasi_lng) ? row.lokasi_lng.map(Number) : undefined,
            alasan_penolakan: row.alasan_penolakan,
            alasanPenolakan: row.alasan_penolakan,
            createdBy: row.created_by,
            createdByName: row.creator_name,
            updatedAt: new Date(row.updated_at),
            documents: row.documents || [],
            pengadu: {
                nama: row.pengadu_nama || '',
                telepon: row.pengadu_telepon || '',
                email: row.pengadu_email || '',
                instansi: row.pengadu_instansi || ''
            },
            suratMasuk: {
                nomorSurat: row.surat_nomor || '',
                tanggalSurat: row.surat_tanggal ? new Date(row.surat_tanggal) : new Date(),
                asalSurat: '',
                perihal: row.surat_asal_perihal || '',
                asalSuratKategori: 'Masyarakat',
                fileUrl: row.surat_file_url || '',
            },
            lokasi: {
                provinsi: row.lokasi_prov || '',
                kabupaten: row.lokasi_kab || '',
                kecamatan: row.lokasi_kec || '',
                desa: row.lokasi_desa || '',
                luasHa: normalizeNumber(row.lokasi_luas_ha),
                balaiId: '',
                balaiName: '',
            },
            perihal: row.surat_asal_perihal || '',
            skema: typeKps[0] || kpsItems[0]?.kps_type || '',
            picId: row.pic_id || '',
            picName: row.pic_name || '',
        };
    },
};
