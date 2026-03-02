import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'theme_mode';

const resolveInitialTheme = (): ThemeMode => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
};

const applyThemeToDocument = (theme: ThemeMode) => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
};

export function useTheme() {
    const [theme, setTheme] = useState<ThemeMode>(() => resolveInitialTheme());

    useEffect(() => {
        applyThemeToDocument(theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

    return {
        theme,
        isDark: theme === 'dark',
        toggleTheme,
        setTheme,
    };
}

