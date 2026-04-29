import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Select, Badge } from '../components/ui';
import { useAduanList } from '../hooks/useAduan';
import { useUIDensity } from '../hooks/useUIDensity';
import { getGoogleCardTheme } from '../lib/google-theme';
import type { Aduan } from '../types';

export const AduanListPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const { isCompact } = useUIDensity();
    const itemsPerPage = 10;

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

    const formatDate = (val?: string | Date) => {
        return val ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(val)) : '-';
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

    const getPerihalValue = (row: Aduan) =>
        row?.perihal?.trim?.()
        || row?.surat_asal_perihal?.trim?.()
        || row?.suratMasuk?.perihal?.trim?.()
        || '-';

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
            <div className="google-hero">
                <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <motion.h1 variants={itemVariants} className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Daftar Pengaduan</motion.h1>
                        <motion.p variants={itemVariants} className="mt-1.5 text-[0.92rem] leading-relaxed text-muted-foreground">Kelola dan pantau seluruh data pengaduan yang masuk.</motion.p>
                    </div>
                    <motion.div variants={itemVariants} className="flex items-center gap-3">
                        <Button
                            className="google-hero-button"
                            onClick={() => navigate('/pengaduan/baru')}
                        >
                            <Plus size={18} className="mr-2" />
                            Buat Aduan
                        </Button>
                    </motion.div>
                </div>
                <div className="google-hero-orb" />
            </div>

            <motion.div variants={itemVariants} className="page-filter-panel">
                <div className="flex flex-col items-center gap-3 lg:flex-row">
                    <div className="relative w-full lg:flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari perihal, lokasi, SK, KPS... (Global Search)"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={`w-full rounded-xl border border-border bg-muted pl-10 pr-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 ${isCompact ? 'h-10 text-[0.9rem]' : 'h-11 text-sm'}`}
                        />
                    </div>
                    <div className="flex w-full items-center gap-3 lg:w-auto">
                        <Select
                            options={[
                                { value: 'all', label: 'Semua Status' },
                                { value: 'baru', label: 'Baru' },
                                { value: 'proses', label: 'Proses' },
                                { value: 'selesai', label: 'Selesai' },
                                { value: 'ditolak', label: 'Ditolak' },
                            ]}
                            value={statusFilter}
                            onChange={setStatusFilter}
                            className={`flex-1 md:w-44 ${isCompact ? 'text-[0.86rem]' : ''}`}
                        />
                    </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="gray" className="rounded-full border-border bg-muted px-2.5 py-1 text-[9px] text-foreground">Baris: {displayList.length}</Badge>
                        <Badge variant="outline" className="rounded-full border-border bg-muted px-2.5 py-1 text-[9px] text-foreground">Baru: {statusSummary.baru || 0}</Badge>
                        <Badge variant="outline" className="rounded-full border-border bg-muted px-2.5 py-1 text-[9px] text-foreground">Proses: {statusSummary.proses || 0}</Badge>
                        <Badge variant="outline" className="rounded-full border-border bg-muted px-2.5 py-1 text-[9px] text-foreground">Selesai: {statusSummary.selesai || 0}</Badge>
                    </div>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="sm:rounded-2xl">
                <div className="p-4">
                    {loading ? (
                        <div className="flex h-64 flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
                            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                            <span className="text-sm font-medium">Memuat data dari Dashboard...</span>
                        </div>
                    ) : displayList.length > 0 ? (
                        <div className="flex flex-col gap-4">
                            {displayList.map((row, index) => {
                                const theme = getGoogleCardTheme(index);
                                const statPanelClass = "page-subpanel";

                                return (
                                <button
                                    key={row.nomor_tiket}
                                    type="button"
                                    onClick={() => navigate(`/pengaduan/${row.nomor_tiket}`)}
                                    className={`flex w-full flex-col rounded-2xl border p-4.5 text-left transition-colors hover:border-primary/25 ${theme.bg} ${theme.border}`}
                                >
                                    <div className="flex w-full items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1 space-y-1.5">
                                            <span className={`inline-flex rounded-md px-2 py-0.5 font-mono text-[11px] font-bold backdrop-blur-sm ${theme.badge}`}>
                                                {row.nomor_tiket}
                                            </span>
                                            <p className={`text-[1rem] font-semibold ${theme.text}`}>
                                                {getPerihalValue(row)}
                                            </p>
                                            <p className={`text-[11px] font-medium ${theme.muted}`}>
                                                KPS: {formatJoinedValue(row.nama_kps)}
                                            </p>
                                        </div>
                                        <Badge variant="gray" className={`shrink-0 max-w-[7rem] whitespace-normal break-words text-center text-[10px] uppercase tracking-wide backdrop-blur-sm ${theme.badge}`}>
                                            {row.status?.toUpperCase?.() || '-'}
                                        </Badge>
                                    </div>

                                    <div className="mt-5 grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.muted}`}>Skema</p>
                                            <p className={`mt-1 text-[0.9rem] font-medium ${theme.text}`}>{formatJoinedValue(row.type_kps)}</p>
                                        </div>
                                        <div>
                                            <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.muted}`}>Surat Keputusan</p>
                                            <p className={`mt-1 text-[0.9rem] font-medium ${theme.text}`}>{formatJoinedValue(row.nomor_sk)}</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.muted}`}>Lokasi</p>
                                            <p className={`mt-1 text-[0.9rem] font-medium ${theme.text}`}>
                                                {[row.lokasi_prov, row.lokasi_kab, row.lokasi_kec, row.lokasi_desa].filter(Boolean).join(' | ') || '-'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-col md:flex-row gap-4 w-full">
                                        <div className={`grid grid-cols-2 gap-3 md:w-64 shrink-0 p-3 ${statPanelClass}`}>
                                            <div>
                                                <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.muted}`}>Luas</p>
                                                <p className={`mt-1 text-[0.9rem] font-semibold ${theme.text}`}>{Number(row.lokasi_luas_ha || 0).toFixed(2)} Ha</p>
                                            </div>
                                            <div>
                                                <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.muted}`}>Jumlah KK</p>
                                                <p className={`mt-1 text-[0.9rem] font-semibold ${theme.text}`}>{row.jumlah_kk ?? '-'}</p>
                                            </div>
                                        </div>
                                        <div className={`flex-1 grid grid-cols-1 gap-2 text-[0.85rem] ${theme.muted}`}>
                                            <div className="flex flex-col sm:flex-row sm:gap-6">
                                                <p><span className={`font-semibold ${theme.text}`}>Pengadu:</span> {row.pengadu_nama || '-'}</p>
                                                <p><span className={`font-semibold ${theme.text}`}>Instansi:</span> {row.pengadu_instansi || '-'}</p>
                                                <p><span className={`font-semibold ${theme.text}`}>Surat:</span> {row.surat_nomor || '-'} • {formatDate(row.surat_tanggal)}</p>
                                            </div>
                                            <p className="whitespace-pre-wrap leading-relaxed mt-1"><span className={`font-semibold ${theme.text}`}>Ringkasan:</span> {row.ringkasan_masalah || '-'}</p>
                                        </div>
                                    </div>
                                </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex h-48 items-center justify-center px-6 text-center italic text-muted-foreground">
                            Tidak ada data pengaduan yang ditemukan.
                        </div>
                    )}
                </div>

                {!loading && totalCount > 0 && (
                    <div className="mt-2 flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 sm:flex-row sm:items-center">
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
                            <div className="rounded-md border border-border bg-card px-3 py-1 text-[11px] font-bold">
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
