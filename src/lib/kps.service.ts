import { api } from './api';
import { type KpsData } from '../types';

type KpsListResponse = {
    data?: KpsData[];
    total?: number;
};

export type KpsSyncResponse = {
    message: string;
    started: boolean;
    isRunning: boolean;
    startedAt: string | null;
    finishedAt: string | null;
    lastError: string | null;
    lastResult: {
        total: number;
        lastPage: number;
        startPage: number;
        processedRows: number;
        uniqueRows: number;
        removedStaleRows: boolean;
    } | null;
};

export type KpsSyncState = {
    isRunning: boolean;
    startedAt: string | null;
    finishedAt: string | null;
    lastError: string | null;
    lastResult: KpsSyncResponse['lastResult'];
};

export const KpsService = {
    getKpsList: async (page: number = 1, pageSize: number = 20): Promise<KpsData[]> => {
        try {
            const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
            const result = await api.get<KpsListResponse>(`/master/kps?${params}`);
            return (result.data || []) as KpsData[];
        } catch (error) {
            console.error('Error fetching KPS list:', error);
            return [];
        }
    },

    getKpsCount: async (): Promise<number> => {
        try {
            const params = new URLSearchParams({ limit: '1' });
            const result = await api.get<KpsListResponse>(`/master/kps?${params}`);
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
            const result = await api.get<KpsListResponse>(`/master/kps?${params}`);
            return (result.data || []) as KpsData[];
        } catch (error) {
            console.error('Error searching KPS:', error);
            return [];
        }
    },

    getKpsById: async (id: string): Promise<KpsData | null> => {
        if (!id) return null;
        try {
            return await api.get<KpsData>(`/master/kps/${encodeURIComponent(id)}`);
        } catch (error) {
            console.error('Error getting KPS by ID:', error);
            return null;
        }
    },

    syncKps: async (): Promise<KpsSyncResponse> => {
        try {
            return await api.post<KpsSyncResponse>('/master/kps/sync', {});
        } catch (error) {
            console.error('Error syncing KPS:', error);
            throw error;
        }
    },

    getKpsSyncStatus: async (): Promise<KpsSyncState> => {
        try {
            return await api.get<KpsSyncState>('/master/kps/sync');
        } catch (error) {
            console.error('Error getting KPS sync status:', error);
            return {
                isRunning: false,
                startedAt: null,
                finishedAt: null,
                lastError: error instanceof Error ? error.message : 'Gagal memuat status sync KPS.',
                lastResult: null,
            };
        }
    },
};
