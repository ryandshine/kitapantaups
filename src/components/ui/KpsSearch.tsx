import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, MapPin } from 'lucide-react';
import { KpsService } from '../../lib/kps.service';
import { type KpsData } from '../../types';
import { Input } from './input';

interface KpsSearchProps {
    onSelect: (kps: KpsData) => void;
    placeholder?: string;
    label?: string;
}

export const KpsSearch: React.FC<KpsSearchProps> = ({
    onSelect,
    placeholder = 'Ketik Nama KPS atau Nomor SK...',
    label = 'Cari Master KPS (Auto-fill)'
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<KpsData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length >= 1) {
                setIsLoading(true);
                const data = await KpsService.searchKps(query);
                setResults(data);
                setIsLoading(false);
                setIsOpen(true);
                setSelectedIndex(0); // Select first result by default
            } else {
                setResults([]);
                setIsOpen(false);
                setSelectedIndex(-1);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSelect = (kps: KpsData) => {
        onSelect(kps);
        setQuery('');
        setResults([]);
        setIsOpen(false);
        setSelectedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < results.length) {
                handleSelect(results[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <Input
                label={label}
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                leftIcon={<Search size={18} />}
                rightIcon={
                    isLoading ? (
                        <Loader2 size={18} className="animate-spin text-primary" />
                    ) : query ? (
                        <button onClick={() => setQuery('')} className="hover:text-foreground">
                            <X size={18} />
                        </button>
                    ) : null
                }
                fullWidth
            />

            {isOpen && (results.length > 0 || isLoading) && (
                <div className="absolute left-0 right-0 z-50 mt-1 w-full max-h-[min(22rem,calc(100vh-14rem))] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-white shadow-lg animate-in fade-in zoom-in-95 duration-200">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground italic">
                            Mencari data...
                        </div>
                    ) : results.length > 0 ? (
                        <ul className="py-1">
                            {results.map((kps, index) => (
                                <li
                                    key={kps.id_kps_api}
                                    className={`group cursor-pointer border-b border-border/70 px-4 py-3 transition-all last:border-0 ${selectedIndex === index ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : 'hover:bg-primary/5'
                                        }`}
                                    onClick={() => handleSelect(kps)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    <div className="mb-1 flex min-w-0 items-start justify-between gap-2">
                                        <div className="min-w-0 text-sm font-semibold text-foreground transition-colors group-hover:text-primary break-words">{kps.nama_kps}</div>
                                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-tight text-muted-foreground">
                                            {kps.kps_type || kps.jenis_kps}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1 mt-1 text-[11px] text-muted-foreground">
                                        <div className="flex flex-wrap items-center gap-1.5 break-all">
                                            <span className="font-semibold text-foreground/80">ID:</span> {kps.id_kps_api}
                                            <span className="mx-1">•</span>
                                            <span className="font-semibold text-foreground/80">SK:</span> <span className="break-words">{kps.nomor_sk}</span>
                                        </div>
                                        <div className="flex min-w-0 items-start gap-1.5">
                                            <MapPin size={10} className="mt-0.5 shrink-0" />
                                            <span className="break-words">{kps.lokasi_kab}, {kps.lokasi_prov}</span>
                                        </div>
                                        {kps.balai && (
                                            <div className="text-[10px] italic break-words">Balai: {kps.balai}</div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Data tidak ditemukan
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
