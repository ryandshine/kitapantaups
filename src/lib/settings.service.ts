import { api } from './api';
import type { AppSettings } from '../types';

export const SettingsService = {
    getSettings: async (): Promise<AppSettings> => {
        try {
            const map = await api.get('/settings');
            return {
                ai_provider: (map.ai_provider as any) || 'openrouter',
                openrouter_api_key: map.openrouter_api_key || '',
                openrouter_model: map.openrouter_model || '',
                gemini_api_key: map.gemini_api_key || '',
                gemini_model: map.gemini_model || '',
                ai_custom_instructions: map.ai_custom_instructions || '',
            };
        } catch (error) {
            console.error('Error fetching settings:', error);
            return {
                ai_provider: 'openrouter',
                openrouter_api_key: '',
                openrouter_model: '',
                gemini_api_key: '',
                gemini_model: '',
            };
        }
    },

    getSetting: async (key: string): Promise<string | null> => {
        try {
            const map = await api.get('/settings');
            return map[key] || null;
        } catch {
            return null;
        }
    },

    updateSetting: async (key: string, value: string, _userId?: string): Promise<void> => {
        await api.put(`/settings/${key}`, { value });
    },

    clearAISettings: async (): Promise<void> => {
        const keys = ['ai_provider', 'openrouter_api_key', 'openrouter_model', 'gemini_api_key', 'gemini_model', 'ai_custom_instructions'];
        for (const key of keys) {
            await api.put(`/settings/${key}`, { value: '' }).catch(() => {});
        }
    },
};
