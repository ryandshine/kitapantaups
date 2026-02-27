import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setTokens, clearTokens } from '../lib/api';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    session: null;
    loading: boolean;
    error: string | null;
    isAdmin: boolean;
    login: (email: string, password: string) => Promise<void>;
    loginAsGuest: () => Promise<void>;
    register: (email: string, password: string, displayName: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            api.get('/auth/me')
                .then((data: any) => {
                    setUser({
                        id: data.id,
                        email: data.email,
                        displayName: data.display_name,
                        role: data.role,
                        phone: data.phone,
                        photoURL: data.photo_url,
                        isActive: data.is_active,
                        createdAt: new Date(data.created_at || Date.now()),
                        updatedAt: new Date(data.updated_at || Date.now()),
                    });
                })
                .catch(() => {
                    clearTokens();
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.post('/auth/login', { email, password });
            setTokens(data.access_token, data.refresh_token);
            setUser({
                id: data.user.id,
                email: data.user.email,
                displayName: data.user.display_name,
                role: data.user.role,
                phone: data.user.phone,
                photoURL: data.user.photo_url,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        } catch (err: any) {
            setError(err.message || 'Login gagal.');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const loginAsGuest = async () => {
        setLoading(true);
        setError(null);
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            setUser({
                id: 'demo-user-id',
                email: 'demo@klhk.go.id',
                displayName: 'Demo User (KLHK)',
                role: 'admin',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        } catch {
            setError('Gagal masuk sebagai demo.');
        } finally {
            setLoading(false);
        }
    };

    const register = async (email: string, password: string, displayName: string) => {
        setLoading(true);
        setError(null);
        try {
            await api.post('/users', { email, password, display_name: displayName, role: 'staf' });
        } catch (err: any) {
            setError(err.message || 'Registrasi gagal.');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout', {});
        } catch {
            // ignore
        } finally {
            clearTokens();
            setUser(null);
        }
    };

    const refreshUser = async () => {
        if (!localStorage.getItem('access_token')) return;
        setLoading(true);
        try {
            const data = await api.get('/auth/me');
            setUser({
                id: data.id,
                email: data.email,
                displayName: data.display_name,
                role: data.role,
                phone: data.phone,
                photoURL: data.photo_url,
                isActive: data.is_active,
                createdAt: new Date(data.created_at || Date.now()),
                updatedAt: new Date(data.updated_at || Date.now()),
            });
        } finally {
            setLoading(false);
        }
    };

    const clearError = () => setError(null);

    return (
        <AuthContext.Provider
            value={{
                user,
                session: null,
                loading,
                error,
                isAdmin: user?.role === 'admin',
                login,
                loginAsGuest,
                register,
                logout,
                refreshUser,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
