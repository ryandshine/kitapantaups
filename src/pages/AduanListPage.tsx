import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Badge } from '../components/ui';
import { useAduanCount, useAduanList } from '../hooks/useAduan';
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
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const { isCompact } = useUIDensity();
    const itemsPerPage = 10;
    const listSectionRef = useRef<HTMLDivElement>(null);

    const rkpsParam = searchParams.get('rkps') || '';
    const kupsKelasParam = searchParams.get('kups_kelas') || '';

    const aduanOptions = useMemo(() => {
        const opt: Record<string, string> = {};
        if (rkpsParam) opt.rkps = rkpsParam;
        if (kupsKelasParam) opt.kups_kelas = kupsKelasParam;
        return opt;
    }, [rkpsParam, kupsKelasParam]);

    const { data: aduanResult, isLoading: loadingItems } = useAduanList(
        currentPage,
        itemsPerPage,
        searchTerm,
        statusFilter,
        aduanOptions
    );
    const { data: totalBaru } = useAduanCount({ status: 'baru' });
    const { data: totalProses } = useAduanCount({ status: 'proses' });
    const { data: totalMenungguTanggapan } = useAduanCount({ status: 'menunggu_tanggapan' });
    const { data: totalSelesai } = useAduanCount({ status: 'selesai' });

    // Reset ke halaman 1 saat search atau filter berubah
    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, rkpsParam, kupsKelasParam]);

    const loading = loadingItems;
    const displayList = useMemo<Aduan[]>(() => aduanResult?.data || [], [aduanResult]);
    const totalCount = aduanResult?.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
    const summaryCards = useMemo<Array<{ key: typeof SUMMARY_STATUS_ORDER[number]; label: string; count: number }>>(() => {
        return [
            { key: 'baru', label: STATUS_LABELS.baru, count: totalBaru || 0 },
            { key: 'proses', label: STATUS_LABELS.proses, count: totalProses || 0 },
            { key: 'menunggu_tanggapan', label: STATUS_LABELS.menunggu_tanggapan, count: totalMenungguTanggapan || 0 },
            { key: 'selesai', label: STATUS_LABELS.selesai, count: totalSelesai || 0 },
        ];
    }, [totalBaru, totalProses, totalMenungguTanggapan, totalSelesai]);

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

    const formatRelativeDateValue = (value?: Date) => {
        if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '-';
        const diffInSeconds = Math.max(0, Math.floor((Date.now() - value.getTime()) / 1000));
        if (diffInSeconds < 60) return 'Baru saja';
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} jam lalu`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} hari lalu`;
    };

    const getKpsStatusKelas = (row: Aduan) => {
        if (Array.isArray(row.kps_items) && row.kps_items.length > 0) {
            const classes = row.kps_items
                .map((item) => item.status_kelas)
                .filter(Boolean)
                .filter((val) => val !== '-');
            return classes.length > 0 ? Array.from(new Set(classes)).join(', ') : '-';
        }
        return '-';
    };

    const getKpsStatusRkps = (row: Aduan) => {
        if (Array.isArray(row.kps_items) && row.kps_items.length > 0) {
            const rkps = row.kps_items
                .map((item) => item.status_rkps)
                .filter(Boolean)
                .filter((val) => val !== '-');
            return rkps.length > 0 ? Array.from(new Set(rkps)).join(', ') : '-';
        }
        return '-';
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
                        <motion.h1 variants={itemVariants} className="hero-heading text-2xl font-semibold tracking-tight md:text-3xl">Daftar Pengaduan</motion.h1>
                        <motion.p variants={itemVariants} className="hero-muted mt-1.5 text-[0.92rem] leading-relaxed">Kelola dan pantau seluruh data pengaduan yang masuk.</motion.p>
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
                            placeholder="Cari tiket, KPS, lokasi, pengadu..."
                            aria-label="Cari nomor tiket, perihal, KPS, lokasi, pengadu, atau instansi"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={`w-full rounded-2xl border border-border bg-muted pl-12 pr-4 font-medium text-foreground placeholder:text-muted-foreground transition-all focus:border-primary/60 focus:ring-4 focus:ring-primary/10 ${isCompact ? 'h-11 text-[0.95rem]' : 'h-13 text-[1rem]'}`}
                        />
                    </div>
                </div>

                {/* Active Filters Display */}
                {(rkpsParam || kupsKelasParam) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-2 text-[0.88rem]">
                        <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">Filter Aktif:</span>
                        {rkpsParam && (
                            <Badge variant="info" className="gap-1.5 px-2.5 py-1 font-bold text-xs uppercase rounded-lg">
                                RKPS: {rkpsParam}
                                <button
                                    onClick={() => {
                                        const newParams = new URLSearchParams(searchParams);
                                        newParams.delete('rkps');
                                        setSearchParams(newParams);
                                    }}
                                    className="ml-1 hover:text-destructive font-black text-xs inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/40 dark:bg-black/20"
                                >
                                    ×
                                </button>
                            </Badge>
                        )}
                        {kupsKelasParam && (
                            <Badge variant="warning" className="gap-1.5 px-2.5 py-1 font-bold text-xs uppercase rounded-lg">
                                KUPS Kelas: {kupsKelasParam}
                                <button
                                    onClick={() => {
                                        const newParams = new URLSearchParams(searchParams);
                                        newParams.delete('kups_kelas');
                                        setSearchParams(newParams);
                                    }}
                                    className="ml-1 hover:text-destructive font-black text-xs inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/40 dark:bg-black/20"
                                >
                                    ×
                                </button>
                            </Badge>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                                const newParams = new URLSearchParams(searchParams);
                                newParams.delete('rkps');
                                newParams.delete('kups_kelas');
                                setSearchParams(newParams);
                            }}
                        >
                            Hapus Semua Filter
                        </Button>
                    </div>
                )}
                {statusFilter !== 'all' && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-2 text-[0.88rem]">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status aktif:</span>
                        <Badge variant="gray" className="rounded-lg px-2.5 py-1 text-xs font-bold uppercase">
                            {STATUS_LABELS[statusFilter] || statusFilter}
                        </Badge>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className="ml-auto text-xs font-bold text-destructive hover:underline"
                        >
                            Hapus status
                        </button>
                    </div>
                )}
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
                    <>
                        <div className="hidden overflow-hidden md:block">
                        <table className="w-full table-fixed text-left text-[0.82rem]">
                            <thead>
                                <tr className="border-b border-primary/20 bg-primary text-primary-foreground">
                                    <th className="w-[13%] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/90">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-foreground/70">Nomor Aduan</span>
                                            <span className="border-t border-white/15 pt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-foreground/85">Status</span>
                                        </div>
                                    </th>
                                    <th className="w-[12%] px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/90">Pengadu</th>
                                    <th className="w-[24%] px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/90">Ringkasan Masalah</th>
                                    <th className="w-[23%] px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/90">KPS</th>
                                    <th className="w-[18%] px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/90">Wilayah</th>
                                    <th className="w-[10%] px-4 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/90" title="Waktu pembaruan terakhir">Update</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayList.map((row) => (
                                    <tr
                                        key={row.nomor_tiket}
                                        onClick={() => navigate(`/pengaduan/${row.nomor_tiket}`)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                navigate(`/pengaduan/${row.nomor_tiket}`);
                                            }
                                        }}
                                        tabIndex={0}
                                        role="link"
                                        className="group cursor-pointer border-b border-border/60 transition-colors hover:bg-primary/4 focus-visible:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                                    >
                                        <td className="min-w-0 px-4 py-3 align-top">
                                            <div className="flex flex-col gap-2">
                                                <span className="inline-flex w-fit rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[12px] font-bold text-foreground shadow-sm">
                                                    {row.nomor_tiket}
                                                </span>
                                                <Badge variant="gray" className="w-fit whitespace-nowrap border border-border bg-muted text-[10px] font-bold uppercase tracking-[0.16em] text-foreground">
                                                    {STATUS_LABELS[String(row.status || '').toLowerCase()] || row.status?.toUpperCase?.() || '-'}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="min-w-0 px-4 py-3 align-top text-foreground">
                                            <p className="font-medium">{row.pengadu_nama || '-'}</p>
                                            {row.pengadu_instansi && <p className="mt-0.5 text-[12px] text-muted-foreground">{row.pengadu_instansi}</p>}
                                        </td>
                                        <td className="min-w-0 px-4 py-3 align-top">
                                            <p className="break-words font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">{getRingkasanMasalahValue(row)}</p>
                                        </td>
                                        <td className="min-w-0 px-4 py-3 align-top text-foreground">
                                            <div className="space-y-1 text-[12px]">
                                                <div className="flex gap-2">
                                                    <span className="w-14 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">KPS</span>
                                                    <span className="min-w-0 break-words leading-snug">{formatJoinedValue(row.nama_kps)}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="w-14 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">SK</span>
                                                    <span className="min-w-0 break-words leading-snug">{formatJoinedValue(row.nomor_sk)}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="w-14 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Skema</span>
                                                    <span className="min-w-0 break-words leading-snug">{formatJoinedValue(row.type_kps)}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="w-14 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Luas</span>
                                                    <span className="font-medium tabular-nums whitespace-nowrap">
                                                        {Number(row.lokasi_luas_ha || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ha
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="w-14 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">KK</span>
                                                    <span className="font-medium tabular-nums">{row.jumlah_kk ?? '-'}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="w-14 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Kelas</span>
                                                    <span className="min-w-0 break-words leading-snug">{getKpsStatusKelas(row)}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="w-14 shrink-0 pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">RKPS</span>
                                                    <span className="min-w-0 break-words leading-snug">{getKpsStatusRkps(row)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="min-w-0 px-4 py-3 align-top text-foreground">
                                            <div className="space-y-2 text-[12px]">
                                                <div>
                                                    <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Provinsi</span>
                                                    <span className="block break-words leading-snug">{row.lokasi_prov || '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Kabupaten</span>
                                                    <span className="block break-words leading-snug">{row.lokasi_kab || '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Desa</span>
                                                    <span className="block break-words leading-snug">{row.lokasi_desa || '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">BPS</span>
                                                    <span className="block break-words leading-snug">{(row as any).balai || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="min-w-0 px-4 py-3 align-top text-foreground">
                                            <div className="space-y-2 text-[12px]">
                                                <div>
                                                    <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Surat</span>
                                                    <span className="block break-words leading-snug">{formatDateValue(row.surat_tanggal)}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Update</span>
                                                    <span className="block break-words leading-snug" title={formatDateValue(row.updatedAt)}>{formatRelativeDateValue(row.updatedAt)}</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                        <div className="grid gap-3 p-3 md:hidden">
                            {displayList.map((row) => (
                                <button
                                    key={row.nomor_tiket}
                                    type="button"
                                    onClick={() => navigate(`/pengaduan/${row.nomor_tiket}`)}
                                    className="w-full rounded-xl border border-border bg-muted/20 p-4 text-left transition-colors hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <span className="font-mono text-xs font-bold text-foreground">{row.nomor_tiket}</span>
                                            <p className="mt-1 truncate text-sm font-semibold text-foreground">{getRingkasanMasalahValue(row)}</p>
                                        </div>
                                        <Badge variant="gray" className="shrink-0 whitespace-nowrap text-[10px] font-bold uppercase">
                                            {STATUS_LABELS[String(row.status || '').toLowerCase()] || row.status?.toUpperCase?.() || '-'}
                                        </Badge>
                                    </div>
                                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                        <div>
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pengadu</span>
                                            <p className="mt-0.5 text-foreground">{row.pengadu_nama || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">KPS</span>
                                            <p className="mt-0.5 text-foreground">{formatJoinedValue(row.nama_kps)}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Wilayah</span>
                                            <p className="mt-0.5 text-foreground">{[row.lokasi_kab, row.lokasi_prov].filter(Boolean).join(', ') || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Diperbarui</span>
                                            <p className="mt-0.5 text-foreground" title={formatDateValue(row.updatedAt)}>{formatRelativeDateValue(row.updatedAt)}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
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
