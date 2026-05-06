import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Badge } from '../components/ui';
import { useAduanList } from '../hooks/useAduan';
import { useUIDensity } from '../hooks/useUIDensity';
import type { Aduan } from '../types';

const STATUS_LABELS: Record<string, string> = {
    baru: 'Baru',
    proses: 'Proses Penanganan',
    menunggu_tanggapan: 'Menunggu Tanggapan',
    selesai: 'Selesai',
    ditolak: 'Ditolak',
};

const SUMMARY_STATUS_ORDER = ['baru', 'proses', 'menunggu_tanggapan', 'selesai'] as const;
const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});

export const AduanListPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const { isCompact } = useUIDensity();
    const itemsPerPage = 10;
    const listSectionRef = useRef<HTMLDivElement>(null);

    const { data: aduanResult, isLoading: loadingItems } = useAduanList(currentPage, itemsPerPage, searchTerm, statusFilter);

    // Reset ke halaman 1 saat search atau filter berubah
    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

    const loading = loadingItems;
    const displayList = useMemo<Aduan[]>(() => aduanResult?.data || [], [aduanResult]);
    const totalCount = aduanResult?.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
    const statusSummary = useMemo(() => {
        return displayList.reduce<Record<string, number>>((acc, row) => {
            const key = String(row.status || 'lainnya').toLowerCase();
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }, [displayList]);

    const summaryCards = useMemo(() => {
        return SUMMARY_STATUS_ORDER.map((statusKey) => ({
            key: statusKey,
            label: STATUS_LABELS[statusKey],
            count: statusSummary[statusKey] || 0,
        }));
    }, [statusSummary]);

    const scrollToListSection = () => {
        window.requestAnimationFrame(() => {
            listSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    const handleSummaryCardClick = (statusKey: typeof SUMMARY_STATUS_ORDER[number]) => {
        setCurrentPage(1);
        setStatusFilter(statusKey);
        scrollToListSection();
    };

    const handleAllSummaryCardClick = () => {
        setCurrentPage(1);
        setStatusFilter('all');
        scrollToListSection();
    };



    const formatJoinedValue = (value: unknown) => {
        if (Array.isArray(value)) {
            const items = value.filter((item) => typeof item === 'string' && item.trim().length > 0);
            return items.length > 0 ? items.join(', ') : '-';
        }
        if (typeof value === 'string' && value.trim().length > 0) {
            return value;
        }
        return '-';
    };

    const getRingkasanMasalahValue = (row: Aduan) =>
        row?.ringkasanMasalah?.trim?.()
        || row?.ringkasan_masalah?.trim?.()
        || row?.perihal?.trim?.()
        || row?.surat_asal_perihal?.trim?.()
        || row?.suratMasuk?.perihal?.trim?.()
        || '-';

    const formatDateValue = (value?: Date) => {
        if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '-';
        return DATE_FORMATTER.format(value);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 10, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-col gap-5"
        >
            <div className="hero-panel">
                <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <motion.h1 variants={itemVariants} className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Daftar Pengaduan</motion.h1>
                        <motion.p variants={itemVariants} className="mt-1.5 text-[0.92rem] leading-relaxed text-muted-foreground">Kelola dan pantau seluruh data pengaduan yang masuk.</motion.p>
                    </div>
                    <motion.div variants={itemVariants} className="flex items-center gap-3">
                        <Button
                            className="hero-button"
                            onClick={() => navigate('/pengaduan/baru')}
                        >
                            <Plus size={18} className="mr-2" />
                            Buat Aduan
                        </Button>
                    </motion.div>
                </div>
                <div className="hero-orb" />
            </div>

            <motion.div variants={itemVariants} className="page-filter-panel">
                <div className="flex flex-col items-center gap-3 lg:flex-row">
                    <div className="relative w-full">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari nomor tiket, perihal, KPS, lokasi, SK, pengadu, atau instansi... (Global Search)"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={`w-full rounded-2xl border border-border bg-muted pl-12 pr-4 font-medium text-foreground placeholder:text-muted-foreground transition-all focus:border-primary/60 focus:ring-4 focus:ring-primary/10 ${isCompact ? 'h-11 text-[0.95rem]' : 'h-13 text-[1rem]'}`}
                        />
                    </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-5">
                        <button
                            type="button"
                            onClick={handleAllSummaryCardClick}
                            className={`flex min-h-[4.5rem] flex-col justify-center rounded-2xl border px-3 py-2 text-left transition-all ${statusFilter === 'all'
                                ? 'border-primary/35 bg-primary/8 shadow-sm'
                                : 'border-border bg-muted/40 hover:border-primary/20 hover:bg-muted/70'
                                }`}
                        >
                            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Semua</span>
                            <span className="mt-1 text-xl font-semibold text-foreground">{totalCount}</span>
                        </button>
                        {summaryCards.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => handleSummaryCardClick(item.key)}
                                className={`flex min-h-[4.5rem] flex-col justify-center rounded-2xl border px-3 py-2 text-left transition-all ${statusFilter === item.key
                                    ? 'border-primary/35 bg-primary/8 shadow-sm'
                                    : 'border-border bg-muted/40 hover:border-primary/20 hover:bg-muted/70'
                                    }`}
                            >
                                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{item.label}</span>
                                <span className="mt-1 text-xl font-semibold text-foreground">{item.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]" ref={listSectionRef}>
                {loading ? (
                    <div className="flex h-64 flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                        <span className="text-sm font-medium">Memuat data dari Dashboard...</span>
                    </div>
                ) : displayList.length > 0 ? (
                    <div className="overflow-x-auto custom-scrollbar-horizontal">
                        <table className="w-full min-w-[1180px] text-left text-[0.88rem]">
                            <thead>
                                <tr className="border-b border-primary/20 bg-primary text-primary-foreground">
                                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/90">No. Tiket</th>
                                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/90">Ringkasan Masalah</th>
                                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/90">Tanggal</th>
                                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/90">Legalitas</th>
                                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/90">Wilayah</th>
                                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/90">Pengadu</th>
                                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/90">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayList.map((row) => (
                                    <tr
                                        key={row.nomor_tiket}
                                        onClick={() => navigate(`/pengaduan/${row.nomor_tiket}`)}
                                        className="border-b border-border/60 transition-colors hover:bg-primary/4 cursor-pointer group"
                                    >
                                        <td className="px-4 py-3 align-top">
                                            <span className="inline-flex rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[12px] font-bold text-foreground">
                                                {row.nomor_tiket}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-top min-w-[200px]">
                                            <p className="font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">{getRingkasanMasalahValue(row)}</p>
                                        </td>
                                        <td className="px-4 py-3 align-top min-w-[180px] text-foreground">
                                            <div className="divide-y divide-border/50 rounded-xl border border-border/50 bg-muted/25">
                                                <div className="flex gap-2 px-3 py-2">
                                                    <span className="w-14 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Surat</span>
                                                    <span className="leading-snug">{formatDateValue(row.surat_tanggal)}</span>
                                                </div>
                                                <div className="flex gap-2 px-3 py-2">
                                                    <span className="w-14 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Dibuat</span>
                                                    <span className="leading-snug">{formatDateValue(row.created_at || row.createdAt)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top min-w-[220px] text-foreground">
                                            <div className="divide-y divide-border/50 rounded-xl border border-border/50 bg-muted/25">
                                                <div className="flex gap-2 px-3 py-2">
                                                    <span className="w-14 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">KPS</span>
                                                    <span className="leading-snug">{formatJoinedValue(row.nama_kps)}</span>
                                                </div>
                                                <div className="flex gap-2 px-3 py-2">
                                                    <span className="w-14 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">SK</span>
                                                    <span className="leading-snug">{formatJoinedValue(row.nomor_sk)}</span>
                                                </div>
                                                <div className="flex gap-2 px-3 py-2">
                                                    <span className="w-14 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Skema</span>
                                                    <span className="leading-snug">{formatJoinedValue(row.type_kps)}</span>
                                                </div>
                                                <div className="flex gap-2 px-3 py-2">
                                                    <span className="w-14 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Luas</span>
                                                    <span className="font-medium tabular-nums whitespace-nowrap">
                                                        {Number(row.lokasi_luas_ha || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ha
                                                    </span>
                                                </div>
                                                <div className="flex gap-2 px-3 py-2">
                                                    <span className="w-14 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">KK</span>
                                                    <span className="font-medium tabular-nums">{row.jumlah_kk ?? '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top min-w-[240px] text-foreground">
                                            <div className="divide-y divide-border/50 rounded-xl border border-border/50 bg-muted/25">
                                                <div className="flex gap-2 px-3 py-2">
                                                    <span className="w-20 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Provinsi</span>
                                                    <span className="leading-snug">{row.lokasi_prov || '-'}</span>
                                                </div>
                                                <div className="flex gap-2 px-3 py-2">
                                                    <span className="w-20 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Kabupaten</span>
                                                    <span className="leading-snug">{row.lokasi_kab || '-'}</span>
                                                </div>
                                                <div className="flex gap-2 px-3 py-2">
                                                    <span className="w-20 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Desa</span>
                                                    <span className="leading-snug">{row.lokasi_desa || '-'}</span>
                                                </div>
                                                <div className="flex gap-2 px-3 py-2">
                                                    <span className="w-20 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">BPS</span>
                                                    <span className="leading-snug">{(row as any).balai || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top text-foreground min-w-[140px]">
                                            <p className="font-medium">{row.pengadu_nama || '-'}</p>
                                            {row.pengadu_instansi && <p className="mt-0.5 text-[12px] text-muted-foreground">{row.pengadu_instansi}</p>}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <Badge variant="gray" className="whitespace-nowrap text-[10px] uppercase tracking-wide border border-border bg-muted text-foreground">
                                                {STATUS_LABELS[String(row.status || '').toLowerCase()] || row.status?.toUpperCase?.() || '-'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex h-48 items-center justify-center px-6 text-center italic text-muted-foreground">
                        Tidak ada data pengaduan yang ditemukan.
                    </div>
                )}

                {!loading && totalCount > 0 && (
                    <div className="flex flex-col justify-between gap-3 border-t border-border p-3.5 sm:flex-row sm:items-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            <span className="hidden sm:inline">Menampilkan {(currentPage - 1) * itemsPerPage + 1} s/d {Math.min(currentPage * itemsPerPage, totalCount)} dari {totalCount} Data</span>
                            <span className="sm:hidden">{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalCount)} / {totalCount}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={currentPage <= 1}
                                onClick={() => setCurrentPage(currentPage - 1)}
                            >
                                Sebelumnya
                            </Button>
                            <div className="rounded-md border border-border bg-muted px-3 py-1 text-[11px] font-bold">
                                {currentPage} / {totalPages}
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(currentPage + 1)}
                            >
                                Selanjutnya
                            </Button>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};
