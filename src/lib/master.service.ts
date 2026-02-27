import { api } from './api';

export const MasterDataService = {
    getStatusLayanan: async () => {
        try {
            const data = await api.get('/master/status');
            return data as { id: number; nama_status: string }[];
        } catch (error) {
            console.error('Error fetching master status:', error);
            return [];
        }
    },

    getKategoriMasalah: async () => {
        try {
            const data = await api.get('/master/kategori');
            return data as { id: number; nama_kategori: string }[];
        } catch (error) {
            console.error('Error fetching master kategori:', error);
            return [];
        }
    },

    getJenisTindakLanjut: async () => {
        try {
            const data = await api.get('/master/jenis-tl');
            return data as { id: number; nama_jenis_tl: string }[];
        } catch (error) {
            console.error('Error fetching jenis tl:', error);
            return [];
        }
    },
};
