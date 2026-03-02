import { useCallback } from 'react';

export type UIDensity = 'comfortable' | 'compact';

export function useUIDensity() {
  const density: UIDensity = 'compact';
  const setDensity = useCallback((_value: UIDensity) => {}, []);
  return { density, setDensity, isCompact: true };
}
