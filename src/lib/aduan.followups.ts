import { api } from './api';
import { ActivityService } from './activity.service';
import type { TindakLanjut } from '../types';

const LEGACY_JENIS_TL_LABEL_MAP: Record<string, string> = {
    'Telaah Administrasi': 'Surat/Dokumen Pengadu',
    'Hasil Telaah Dikembalikan': 'Surat/Dokumen Pihak lain',
    'Puldasi': 'TL Surat Jawaban',
    'Agenda Rapat Pembahasan': 'TL BA Rapat Pembahasan',
    'Agenda Evaluasi': 'Berita Acara Evaluasi',
    'Agenda Pembahasan Hasil Evaluasi': 'TL Notula Rapat',
    'ND Perubahan Persetujuan PS': 'TL Nota Dinas',
    'Respon pengadu/Pihak ketiga': 'Surat/Dokumen Pihak lain',
    'Surat Penolakan Aduan': 'TL Surat Jawaban',
    'Dokumen Lengkap / Puldasi': 'TL Surat Jawaban',
    'Sudah Puldasi / Agenda Rapat Pembahasan': 'TL BA Rapat Pembahasan',
};

export const normalizeJenisTlLabel = (value?: string) => {
    const normalized = value?.trim() || '';
    if (!normalized) return '';
    return LEGACY_JENIS_TL_LABEL_MAP[normalized] || normalized;
};

type TindakLanjutApiRow = {
    id: string;
    aduan_id: string;
    tanggal: string;
    jenis_tl: string;
    keterangan: string;
    nomor_surat_output?: string;
    file_urls?: string[];
    created_by: string;
    created_by_name: string;
    created_at: string;
};

export const AduanFollowUpService = {
    getJenisTindakLanjut: async () => {
        try { return await api.get('/master/jenis-tl') as { id: number; nama_jenis_tl: string }[]; }
        catch { return []; }
    },

    getTindakLanjutList: async (aduanId: string): Promise<TindakLanjut[]> => {
        try {
            const data = await api.get(`/aduan/${aduanId}/tindak-lanjut`) as TindakLanjutApiRow[];
            return (data || []).map((item) => ({
                id: item.id,
                aduanId: item.aduan_id,
                tanggal: new Date(item.tanggal),
                jenisTL: normalizeJenisTlLabel(item.jenis_tl),
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
            jenis_tl: normalizeJenisTlLabel(data.jenisTL),
            keterangan: data.keterangan,
            nomor_surat_output: data.nomorSuratOutput,
            file_urls: data.fileUrls,
        });
        await ActivityService.logActivity({
            type: 'create_tl',
            description: `Menambahkan dokumen tindak lanjut: **${normalizeJenisTlLabel(data.jenisTL)}**`,
            aduanId: data.aduanId,
            userId: data.createdBy,
            userName: data.createdByName || '',
            metadata: { jenisTL: normalizeJenisTlLabel(data.jenisTL) },
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
            jenis_tl: normalizeJenisTlLabel(data.jenisTL),
            keterangan: data.keterangan,
            nomor_surat_output: data.nomorSuratOutput,
            file_urls: data.fileUrls,
        });
        return true;
    },
};
