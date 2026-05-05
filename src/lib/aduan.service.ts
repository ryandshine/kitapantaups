import { api } from './api';
import type { Aduan } from '../types';
import { ActivityService } from './activity.service';
import {
    buildAduanAuditChanges,
    buildAduanAuditLogPayload,
    buildAduanPatchPayload,
    mapRowToAduan,
    type UpdateAduanPayload,
} from './aduan.transforms';
import {
    uploadAdditionalAduanDocuments,
    uploadAduanDocument,
    uploadAduanSuratMasuk,
    uploadAduanTindakLanjut,
    type UploadBatchProgress,
} from './aduan.uploads';

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    return 'Terjadi kesalahan yang tidak diketahui';
};

type AduanReportFilters = {
    provinsi?: string;
    status?: string;
    picId?: string;
};

type AduanListOptions = {
    sortBy?: 'created_at' | 'updated_at';
};

type AduanApiRow = {
    id: string;
} & Record<string, unknown>;

type CreateAduanInput = {
    surat_nomor?: string;
    surat_tanggal?: string;
    surat_asal_perihal?: string;
    pengadu_nama?: string;
    pengadu_telepon?: string;
    pengadu_email?: string;
    pengadu_instansi?: string;
    kategori_masalah?: string;
    ringkasan_masalah?: string;
    lokasi_prov?: string;
    lokasi_kab?: string;
    lokasi_kec?: string;
    lokasi_desa?: string;
    lokasi_luas_ha?: number;
    jumlah_kk?: number;
    lokasi_lat?: string[];
    lokasi_lng?: string[];
};

type SelectedKpsInput = {
    id: string;
};

type CreateAduanPayload = CreateAduanInput & {
    kps_ids: string[];
    pic_id: string;
    pic_name: string;
};

type CreatedAduanResponse = {
    id: string;
    nomor_tiket?: string;
};

type AduanListResponse = {
    data?: AduanApiRow[];
    total?: number;
};

type AduanListResult = {
    data: Aduan[];
    total: number;
};

export const AduanService = {
    createAduanWithFiles: async (
        formData: CreateAduanInput,
        selectedKpsList: SelectedKpsInput[],
        files: { documents?: File[] },
        userId: string,
        userName: string,
        options?: { onDocumentUploadProgress?: (progress: UploadBatchProgress) => void }
    ): Promise<{ id: string; nomorTiket?: string; uploadErrors: string[] }> => {
        const payload: CreateAduanPayload = {
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
        const aduan = await api.post<CreatedAduanResponse>('/aduan', payload);
        const uploadErrors: string[] = [];

        // 2. Upload & register document files if provided
        const documentFiles = files?.documents?.filter(f => f instanceof File) ?? [];
        if (documentFiles.length > 0) {
            try {
                const uploadResult = await AduanService.uploadAdditionalDocuments(
                    aduan.id,
                    documentFiles,
                    options?.onDocumentUploadProgress
                );
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
        return uploadAduanDocument(f, _id);
    },
    uploadSuratMasuk: async (f: File | Blob, aduanId: string, onProgress?: (p: number) => void): Promise<string> => {
        return uploadAduanSuratMasuk(f, aduanId, onProgress);
    },
    uploadTindakLanjutFile: async (f: File | Blob, aduanId: string, onProgress?: (p: number) => void): Promise<string> => {
        return uploadAduanTindakLanjut(f, aduanId, onProgress);
    },
    uploadAdditionalDocuments: async (
        id: string,
        files: File[],
        onProgress?: (progress: UploadBatchProgress) => void
    ): Promise<{ errors: string[] }> => uploadAdditionalAduanDocuments(id, files, onProgress),
    extractStoragePath: (_url: string): string | null => null,
    generateTicketNumber: () => `ADU${new Date().getFullYear().toString().slice(2)}${Math.floor(100000 + Math.random() * 900000)}`,

    getAduanList: async (
        page = 1,
        pageSize = 20,
        searchTerm?: string,
        statusFilter?: string,
        options?: AduanListOptions,
    ): Promise<AduanListResult> => {
        const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
        if (searchTerm?.trim()) params.set('search', searchTerm.trim());
        if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
        if (options?.sortBy) params.set('sort_by', options.sortBy);
        const result = await api.get<AduanListResponse>(`/aduan?${params}`);
        return {
            data: (result.data || []).map(AduanService.mapToAduan),
            total: result.total || 0,
        };
    },

    getAduanCount: async (filters?: { status?: string }) => {
        const params = new URLSearchParams({ limit: '1' });
        if (filters?.status) params.set('status', filters.status);
        try { const result = await api.get<AduanListResponse>(`/aduan?${params}`); return result.total || 0; }
        catch { return 0; }
    },

    getDashboardStats: async (): Promise<{ total: number; by_status: Record<string, number>; last_30_days: number }> => {
        try { return await api.get<{ total: number; by_status: Record<string, number>; last_30_days: number }>('/dashboard/stats'); }
        catch { return { total: 0, by_status: {}, last_30_days: 0 }; }
    },

    getAduanById: async (id: string) => {
        const data = await api.get<AduanApiRow>(`/aduan/${id}`);
        return AduanService.mapToAduan(data);
    },

    getAduanByTicket: async (nomorTiket: string) => {
        try {
            const result = await api.get<AduanListResponse>(`/aduan?nomor_tiket=${encodeURIComponent(nomorTiket)}&limit=1`);
            const row = result.data?.[0];
            if (!row) return null;
            // Fetch full details using ID to get documents and other related data
            return await AduanService.getAduanById(row.id);
        } catch { return null; }
    },

    getAduanByDateRange: async (startDate: string, endDate: string, filters?: AduanReportFilters) => {
        let allData: AduanApiRow[] = [];
        let offset = 0;
        const limit = 2000; // Fetch in chunks to prevent server timeout

        while (true) {
            const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
            if (startDate) params.set('start_date', startDate);
            if (endDate) params.set('end_date', endDate);
            if (filters?.provinsi && filters.provinsi !== 'all') params.set('provinsi', filters.provinsi);
            if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
            if (filters?.picId && filters.picId !== 'all') params.set('pic_id', filters.picId);

            try {
                const result = await api.get<AduanListResponse>(`/aduan?${params}`);
                const chunk = result.data || [];
                allData = allData.concat(chunk);
                
                if (chunk.length < limit) break;
                offset += limit;
            } catch (error) {
                console.error('Error fetching chunk:', error);
                throw new Error(`Gagal mengambil data laporan pada offset ${offset}: ${getErrorMessage(error)}`);
            }
        }
        
        return allData.map(AduanService.mapToAduan);
    },

    updateAduan: async (id: string, data: UpdateAduanPayload) => {
        const auditChanges = buildAduanAuditChanges(data.auditSource, data);
        const updateData = buildAduanPatchPayload(data);
        if (Object.keys(updateData).length === 0) return true;
        await api.patch(`/aduan/${id}`, updateData);
        await ActivityService.logActivity(buildAduanAuditLogPayload(id, data, updateData, auditChanges));
        return true;
    },

    deleteAduan: async (id: string, password?: string) => {
        await api.delete(`/aduan/${id}`, { password });
        return true;
    },

    mapToAduan: (row: AduanApiRow): Aduan => {
        return mapRowToAduan(row);
    },
};
