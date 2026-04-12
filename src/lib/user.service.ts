import { api } from './api';
import type { User } from '../types';

const mapUser = (u: any): User => ({
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    role: u.role,
    phone: u.phone,
    isActive: u.is_active,
    createdAt: new Date(u.created_at),
    updatedAt: new Date(u.updated_at),
});

export const UserService = {
    getAllUsers: async (): Promise<User[]> => {
        try {
            const data = await api.get('/users');
            return (data || []).map(mapUser);
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    },

    createUser: async (email: string, password: string, displayName: string, role: string) => {
        try {
            await api.post('/users', { email, password, display_name: displayName, role });
            return true;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },

    updateUserRole: async (userId: string, role: string) => {
        try {
            await api.patch(`/users/${userId}`, { role });
            return true;
        } catch (error) {
            console.error('Error updating user role:', error);
            throw error;
        }
    },

    toggleUserStatus: async (userId: string, isActive: boolean) => {
        try {
            await api.patch(`/users/${userId}`, { is_active: isActive });
            return true;
        } catch (error) {
            console.error('Error toggling user status:', error);
            throw error;
        }
    },

    resetUserPassword: async (userId: string, password: string) => {
        try {
            await api.patch(`/users/${userId}`, { password });
            return true;
        } catch (error) {
            console.error('Error resetting user password:', error);
            throw error;
        }
    },

    updateUserProfile: async (userId: string, data: Partial<User> & { password?: string }) => {
        try {
            const payload: any = {};
            if (data.displayName) payload.display_name = data.displayName;
            if (data.phone !== undefined) payload.phone = data.phone;
            if (data.role) payload.role = data.role;
            if (data.isActive !== undefined) payload.is_active = data.isActive;
            if ((data as any).password) payload.password = (data as any).password;
            await api.patch(`/users/${userId}`, payload);
            return true;
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    },

    updateMe: async (data: { displayName?: string; phone?: string }) => {
        try {
            const payload: any = {};
            if (data.displayName) payload.display_name = data.displayName;
            if (data.phone !== undefined) payload.phone = data.phone;
            await api.patch('/auth/profile', payload);
            return true;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    },
    deleteUser: async (userId: string) => {
        try {
            await api.delete(`/users/${userId}`);
            return true;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },
};
