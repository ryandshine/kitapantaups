import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    placeholder = 'Ketik id, nama_lembaga, atau surat_keputusan...',
    label = 'Cari KPS'
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<KpsData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});
    const latestRequestRef = useRef(0);

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
        if (!isOpen) return;

        const updateOverlayPosition = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            setOverlayStyle({
                position: 'fixed',
                top: rect.bottom + 8,
                left: rect.left,
                width: rect.width,
                zIndex: 2147483647,
            });
        };

        updateOverlayPosition();
        window.addEventListener('resize', updateOverlayPosition);
        window.addEventListener('scroll', updateOverlayPosition, true);

        return () => {
            window.removeEventListener('resize', updateOverlayPosition);
            window.removeEventListener('scroll', updateOverlayPosition, true);
        };
    }, [isOpen]);

    useEffect(() => {
        const currentQuery = query.trim();

        if (currentQuery.length < 1) {
            setResults([]);
            setIsOpen(false);
            setSelectedIndex(-1);
            setIsLoading(false);
            return;
        }

        let isCancelled = false;
        const requestId = latestRequestRef.current + 1;
        latestRequestRef.current = requestId;

        const delayDebounceFn = setTimeout(async () => {
            try {
                setIsLoading(true);
                const data = await KpsService.searchKps(currentQuery);

                if (isCancelled || latestRequestRef.current !== requestId) return;

                setResults(data);
                setIsOpen(true);
                setSelectedIndex(data.length > 0 ? 0 : -1);
            } catch (error) {
                if (isCancelled || latestRequestRef.current !== requestId) return;
                console.error('KPS search failed:', error);
                setResults([]);
                setIsOpen(true);
                setSelectedIndex(-1);
            } finally {
                if (!isCancelled && latestRequestRef.current === requestId) {
                    setIsLoading(false);
                }
            }
        }, 300);

        return () => {
            isCancelled = true;
            clearTimeout(delayDebounceFn);
        };
    }, [query]);

    const handleSelect = (kps: KpsData) => {
        onSelect(kps);
        setQuery('');
        setResults([]);
        setIsOpen(false);
        setSelectedIndex(-1);
    };

    const getDisplayName = (kps: KpsData) => kps.nama_lembaga || kps.nama_kps || '-';
    const getDisplayType = (kps: KpsData) => kps.skema || kps.kps_type || kps.jenis_kps || '-';
    const getDisplaySk = (kps: KpsData) => kps.surat_keputusan || kps.nomor_sk || '-';
    const getDisplayId = (kps: KpsData) => kps.id;
    const getDisplayKabupaten = (kps: KpsData) => kps.kabupaten || kps.lokasi_kab || '';
    const getDisplayProvinsi = (kps: KpsData) => kps.provinsi || kps.lokasi_prov || '';

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
        <div className="relative w-full overflow-visible" ref={containerRef}>
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

            {isOpen && (results.length > 0 || isLoading) && createPortal(
                <div style={overlayStyle} className="pointer-events-none">
                    <div className="pointer-events-auto relative z-[2147483647] max-h-[min(22rem,calc(100vh-6rem))] overflow-y-auto overflow-x-hidden rounded-2xl border border-primary/15 bg-white/95 shadow-2xl ring-1 ring-border/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                        {isLoading ? (
                            <div className="p-4 text-center text-sm text-muted-foreground italic">
                                Mencari data...
                            </div>
                        ) : results.length > 0 ? (
                            <ul className="py-1">
                                {results.map((kps, index) => (
                                    <li
                                        key={kps.id}
                                        className={`group cursor-pointer border-b border-border/70 px-4 py-3 transition-all last:border-0 ${selectedIndex === index ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : 'hover:bg-primary/5'
                                            }`}
                                        onClick={() => handleSelect(kps)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                    >
                                        <div className="mb-1 flex min-w-0 items-start justify-between gap-2">
                                            <div className="min-w-0 text-sm font-semibold text-foreground transition-colors group-hover:text-primary break-words">{getDisplayName(kps)}</div>
                                            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-tight text-muted-foreground">
                                                {getDisplayType(kps)}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex flex-col gap-1 text-[11px] text-muted-foreground">
                                            <div className="flex flex-wrap items-center gap-1.5 break-all">
                                                <span className="font-semibold text-foreground/80">id:</span> {getDisplayId(kps)}
                                                <span className="mx-1">•</span>
                                                <span className="font-semibold text-foreground/80">SK:</span> <span className="break-words">{getDisplaySk(kps)}</span>
                                            </div>
                                            <div className="flex min-w-0 items-start gap-1.5">
                                                <MapPin size={10} className="mt-0.5 shrink-0" />
                                                <span className="break-words">{getDisplayKabupaten(kps)}, {getDisplayProvinsi(kps)}</span>
                                            </div>
                                            {(kps.anggota_pria || kps.anggota_wanita) ? (
                                                <div className="text-[10px] italic break-words">
                                                    Anggota: {Number(kps.anggota_pria || 0) + Number(kps.anggota_wanita || 0)}
                                                </div>
                                            ) : kps.balai ? (
                                                <div className="text-[10px] italic break-words">Balai: {kps.balai}</div>
                                            ) : null}
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
                </div>,
                document.body
            )}
        </div>
    );
};
