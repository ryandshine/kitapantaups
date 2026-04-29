import { api } from './api';
import type { User } from '../types';

type UserApiRow = {
    id: string;
    email: string;
    display_name: string;
    role: User['role'];
    phone?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

type ProvincesResponse = {
    data?: string[];
};

export const AduanReferenceService = {
    deleteDocument: async (aduanId: string, docId: string): Promise<void> => {
        await api.delete(`/aduan/${aduanId}/documents/${docId}`);
    },

    getUniqueProvinces: async () => {
        try {
            const result = await api.get<string[] | ProvincesResponse>('/aduan/provinces');
            return Array.isArray(result) ? result : (result.data || []);
        } catch { return []; }
    },

    getMasterStatuses: async () => {
        try { return await api.get('/master/status') as { id: number; nama_status: string }[]; }
        catch { return []; }
    },

    getUsersByRole: async (_role?: string): Promise<User[]> => {
        try {
            const data = await api.get('/users') as UserApiRow[];
            return (data || []).map((u) => ({
                id: u.id,
                email: u.email,
                displayName: u.display_name,
                role: u.role,
                phone: u.phone,
                isActive: u.is_active,
                createdAt: new Date(u.created_at),
                updatedAt: new Date(u.updated_at),
            } as User));
        } catch { return []; }
    },

    updateUserProfile: async (userId: string, data: Partial<User>) => {
        const payload: Record<string, unknown> = {};
        if (data.displayName) payload.display_name = data.displayName;
        if (data.phone !== undefined) payload.phone = data.phone;
        if (data.role) payload.role = data.role;
        if (data.isActive !== undefined) payload.is_active = data.isActive;
        await api.patch(`/users/${userId}`, payload);
        return true;
    },
};
