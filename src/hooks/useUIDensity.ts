import { useEffect, useState } from 'react';

export type UIDensity = 'comfortable' | 'compact';

const STORAGE_KEY = 'ui_density';

export function useUIDensity() {
  const [density, setDensity] = useState<UIDensity>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'compact' ? 'compact' : 'comfortable';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, density);
  }, [density]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        setDensity(event.newValue === 'compact' ? 'compact' : 'comfortable');
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { density, setDensity, isCompact: density === 'compact' };
}

