import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setTokens, clearTokens, refreshAccessToken, getAccessToken } from '../lib/api';
import type { User } from '../types';

type AuthMeResponse = {
    id: string;
    email: string;
    display_name?: string;
    role: User['role'];
    phone?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
};

type LoginResponse = {
    access_token: string;
    user: {
        id: string;
        email: string;
        display_name?: string;
        role: User['role'];
        phone?: string;
    };
};

interface AuthContextType {
    user: User | null;
    session: null;
    loading: boolean;
    error: string | null;
    isAdmin: boolean;
    login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fallbackDisplayName = (displayName: string | undefined, email: string | undefined) => {
    const normalized = (displayName || '').trim();
    if (normalized) return normalized;
    const emailPrefix = (email || '').split('@')[0]?.trim();
    if (emailPrefix) return emailPrefix;
    return 'User';
};

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    return 'Login gagal.';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const bootstrapSession = async () => {
            try {
                if (!getAccessToken()) {
                    const nextToken = await refreshAccessToken();
                    if (!nextToken) {
                        setUser(null);
                        return;
                    }
                }

                const data = await api.get<AuthMeResponse>('/auth/me');
                setUser({
                    id: data.id,
                    email: data.email,
                    displayName: fallbackDisplayName(data.display_name, data.email),
                    role: data.role,
                    phone: data.phone,
                    isActive: data.is_active,
                    createdAt: new Date(data.created_at || Date.now()),
                    updatedAt: new Date(data.updated_at || Date.now()),
                });
            } catch {
                clearTokens();
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        void bootstrapSession();
    }, []);

    const login = async (email: string, password: string, turnstileToken?: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.post<LoginResponse>('/auth/login', { 
                email, 
                password,
                turnstile_token: turnstileToken 
            });
            setTokens(data.access_token);
            setUser({
                id: data.user.id,
                email: data.user.email,
                displayName: fallbackDisplayName(data.user.display_name, data.user.email),
                role: data.user.role,
                phone: data.user.phone,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        } catch (err: unknown) {
            setError(getErrorMessage(err));
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
        setLoading(true);
        try {
            if (!getAccessToken()) {
                const nextToken = await refreshAccessToken();
                if (!nextToken) {
                    setUser(null);
                    return;
                }
            }

            const data = await api.get<AuthMeResponse>('/auth/me');
            setUser({
                id: data.id,
                email: data.email,
                displayName: fallbackDisplayName(data.display_name, data.email),
                role: data.role,
                phone: data.phone,
                isActive: data.is_active,
                createdAt: new Date(data.created_at || Date.now()),
                updatedAt: new Date(data.updated_at || Date.now()),
            });
        } catch {
            clearTokens();
            setUser(null);
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
