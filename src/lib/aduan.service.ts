import { api } from './api';
import type { Aduan, User, TindakLanjut } from '../types';
import { ActivityService } from './activity.service';

const API_URL = import.meta.env.VITE_API_URL;

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
    ) => {
        const payload: any = {
            surat_nomor: formData.surat_nomor,
            surat_tanggal: formData.surat_tanggal,
            surat_asal_perihal: formData.surat_asal_perihal,
            pengadu_nama: formData.pengadu_nama,
            pengadu_instansi: formData.pengadu_instansi,
            kategori_masalah: formData.kategori_masalah,
            ringkasan_masalah: formData.ringkasan_masalah,
            id_kps_api: selectedKpsList.map(k => k.id_kps_api),
            nama_kps: selectedKpsList.map(k => k.nama_kps),
            jenis_kps: selectedKpsList.map(k => k.jenis_kps),
            nomor_sk: selectedKpsList.map(k => k.nomor_sk),
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

        // 1. Create the aduan record first
        const aduan = await api.post('/aduan', payload);

        // 2. Upload & register document files if provided
        const documentFiles = files?.documents?.filter(f => f instanceof File) ?? [];
        if (documentFiles.length > 0) {
            try {
                await AduanService.uploadAdditionalDocuments(aduan.id, documentFiles);
            } catch (uploadErr) {
                // Non-fatal: aduan sudah tersimpan, tapi lampiran gagal
                console.error('File upload failed (aduan sudah tersimpan):', uploadErr);
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

        return aduan.id;
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
    uploadAdditionalDocuments: async (id: string, files: File[]): Promise<void> => {
        for (const file of files) {
            const fileUrl = await uploadToServer(file, 'dokumen', id);
            await api.post(`/aduan/${id}/documents`, {
                file_url: fileUrl,
                file_name: file.name,
                file_category: 'dokumen',
            });
        }
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
            return result.data || [];
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
                linkDrive: item.link_drive,
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
            link_drive: data.linkDrive,
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
            link_drive: data.linkDrive,
        });
        return true;
    },

    updateAduan: async (id: string, data: Partial<Aduan> & { updatedBy?: string }) => {
        const updateData: any = {};
        if (data.status) updateData.status = data.status;
        if (data.alasanPenolakan !== undefined) updateData.alasan_penolakan = data.alasanPenolakan;
        if (data.driveFolderId) updateData.drive_folder_id = data.driveFolderId;
        if (data.picId !== undefined) updateData.pic_id = data.picId || null;
        if (data.picName !== undefined) updateData.pic_name = data.picName;
        if (data.perihal) updateData.surat_asal_perihal = data.perihal;
        if (data.ringkasanMasalah) updateData.ringkasan_masalah = data.ringkasanMasalah;
        if (data.kategoriMasalah) updateData.kategori_masalah = data.kategoriMasalah;
        if (data.lokasi) {
            if (data.lokasi.provinsi) updateData.lokasi_prov = data.lokasi.provinsi;
            if (data.lokasi.kabupaten) updateData.lokasi_kab = data.lokasi.kabupaten;
            if (data.lokasi.kecamatan) updateData.lokasi_kec = data.lokasi.kecamatan;
            if (data.lokasi.desa) updateData.lokasi_desa = data.lokasi.desa;
            if (data.lokasi.luasHa !== undefined) updateData.lokasi_luas_ha = data.lokasi.luasHa;
        }
        if (data.suratMasuk) {
            if (data.suratMasuk.nomorSurat) updateData.surat_nomor = data.suratMasuk.nomorSurat;
            if (data.suratMasuk.fileUrl !== undefined) updateData.surat_file_url = data.suratMasuk.fileUrl;
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

    mapToAduan: (row: any): Aduan => ({
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
        id_kps_api: row.id_kps_api || [],
        nama_kps: row.nama_kps || [],
        jenis_kps: row.jenis_kps || [],
        nomor_sk: row.nomor_sk || [],
        lokasi_prov: row.lokasi_prov,
        lokasi_kab: row.lokasi_kab,
        lokasi_kec: row.lokasi_kec,
        lokasi_desa: row.lokasi_desa,
        lokasi_luas_ha: Number(row.lokasi_luas_ha) || 0,
        jumlah_kk: Number(row.jumlah_kk) || 0,
        lokasi_lat: Array.isArray(row.lokasi_lat) ? row.lokasi_lat.map(Number) : undefined,
        lokasi_lng: Array.isArray(row.lokasi_lng) ? row.lokasi_lng.map(Number) : undefined,
        alasan_penolakan: row.alasan_penolakan,
        alasanPenolakan: row.alasan_penolakan,
        driveFolderId: row.drive_folder_id,
        createdBy: row.created_by,
        createdByName: row.creator_name,
        updatedAt: new Date(row.updated_at),
        documents: row.documents || [],
        pengadu: { nama: row.pengadu_nama || '', telepon: '', email: '', instansi: row.pengadu_instansi || '' },
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
            luasHa: Number(row.lokasi_luas_ha) || 0,
            balaiId: '',
            balaiName: '',
        },
        perihal: row.surat_asal_perihal || '',
        skema: '',
        picId: row.pic_id || '',
        picName: row.pic_name || '',
    }),
};
