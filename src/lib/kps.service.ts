import { api } from './api';
import { type KpsData } from '../types';

export const KpsService = {
    getKpsList: async (page: number = 1, pageSize: number = 20): Promise<KpsData[]> => {
        try {
            const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
            const result = await api.get(`/master/kps?${params}`);
            return (result.data || []) as KpsData[];
        } catch (error) {
            console.error('Error fetching KPS list:', error);
            return [];
        }
    },

    getKpsCount: async (): Promise<number> => {
        try {
            const params = new URLSearchParams({ limit: '1' });
            const result = await api.get(`/master/kps?${params}`);
            return result.total || 0;
        } catch (error) {
            console.error('Error getting KPS count:', error);
            return 0;
        }
    },

    searchKps: async (query: string): Promise<KpsData[]> => {
        if (!query || query.length < 1) return [];
        try {
            const params = new URLSearchParams({ search: query, limit: '20' });
            const result = await api.get(`/master/kps?${params}`);
            return (result.data || []) as KpsData[];
        } catch (error) {
            console.error('Error searching KPS:', error);
            return [];
        }
    },

    getKpsById: async (id: string): Promise<KpsData | null> => {
        if (!id) return null;
        try {
            return await api.get(`/master/kps/${encodeURIComponent(id)}`);
        } catch (error) {
            console.error('Error getting KPS by ID:', error);
            return null;
        }
    },
};
