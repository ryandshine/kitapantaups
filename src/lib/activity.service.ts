import { api } from './api';
import type { AppActivity, ActivityType } from '../types';

export const ActivityService = {
    logActivity: async (data: {
        type: ActivityType;
        description: string;
        aduanId?: string;
        userId: string;
        userName: string;
        metadata?: any;
    }) => {
        try {
            await api.post('/activities', {
                type: data.type,
                description: data.description,
                aduan_id: data.aduanId,
                user_id: data.userId,
                user_name: data.userName,
                metadata: data.metadata,
            });
            return true;
        } catch (error) {
            console.error('Error logging activity:', error);
            return false;
        }
    },

    getRecentActivities: async (limit: number = 10): Promise<AppActivity[]> => {
        try {
            const rows = await api.get(`/activities?limit=${limit}`);
            return (rows || []).map((row: any) => ({
                id: row.id,
                type: row.type as ActivityType,
                description: row.description,
                aduanId: row.aduan_id,
                userId: row.user_id,
                userName: row.user_name,
                createdAt: new Date(row.created_at),
                metadata: row.metadata,
            }));
        } catch (error) {
            console.error('Error fetching recent activities:', error);
            return [];
        }
    },
};
