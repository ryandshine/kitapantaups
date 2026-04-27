import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Select, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import {
    type SortingState,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    createColumnHelper
} from '@tanstack/react-table';
import { useAduanList } from '../hooks/useAduan';
import { useUIDensity } from '../hooks/useUIDensity';

const columnHelper = createColumnHelper<any>();

export const AduanListPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [sorting, setSorting] = useState<SortingState>([]);
    const { isCompact } = useUIDensity();
    const itemsPerPage = 10;

    const { data: aduanResult, isLoading: loadingItems } = useAduanList(currentPage, itemsPerPage, searchTerm, statusFilter);

    // Reset ke halaman 1 saat search atau filter berubah
    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

    const loading = loadingItems;
    const displayList = useMemo<any[]>(() => aduanResult?.data || [], [aduanResult]);
    const totalCount = aduanResult?.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
    const statusSummary = useMemo(() => {
        return displayList.reduce<Record<string, number>>((acc, row) => {
            const key = String(row.status || 'lainnya').toLowerCase();
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }, [displayList]);

    const formatDate = (val?: string) => {
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

    const getPerihalValue = (row: any) =>
        row?.perihal?.trim?.()
        || row?.surat_asal_perihal?.trim?.()
        || row?.suratMasuk?.perihal?.trim?.()
        || '-';

    const getDesktopColumnClassName = (columnId: string) => {
        switch (columnId) {
            case 'nomor_tiket':
                return 'w-[9.5rem]';
            case 'perihal':
                return 'min-w-[24rem] w-[34%]';
            case 'status':
                return 'w-[8.5rem]';
            case 'nama_kps':
                return 'w-[14rem]';
            case 'lokasi_prov':
                return 'w-[12rem]';
            case 'pengadu_nama':
                return 'w-[11rem]';
            case 'surat_nomor':
                return 'w-[11rem]';
            case 'ringkasan_masalah':
                return 'min-w-[20rem] w-[28%]';
            default:
                return '';
        }
    };

    const columns = useMemo(() => [
        columnHelper.accessor('nomor_tiket', {
            header: 'Tiket',
            cell: info => (
                <div className="space-y-1 min-w-0">
                    <span className="inline-flex max-w-full rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold text-foreground whitespace-nowrap truncate">
                        {info.getValue()}
                    </span>
                    <p className="text-[10px] text-muted-foreground truncate">
                        Dibuat: {formatDate(info.row.original.created_at || info.row.original.createdAt || info.row.original.tanggal_buat)}
                    </p>
                </div>
            ),
        }),
        columnHelper.display({
            id: 'perihal',
            header: 'Perihal',
            cell: info => (
                <div className="space-y-1 min-w-0">
                    <p className="text-xs font-semibold leading-relaxed text-foreground whitespace-normal break-words">
                        {getPerihalValue(info.row.original)}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                        KPS: {formatJoinedValue(info.row.original.nama_kps)}
                    </p>
                </div>
            ),
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: info => {
                const status = info.getValue();
                return (
                    <div className="min-w-[128px]">
                        <Badge variant="gray" className="w-fit whitespace-normal break-words text-center text-[10px] uppercase tracking-wide">
                            {status?.toUpperCase?.() || '-'}
                        </Badge>
                    </div>
                );
            },
        }),
        columnHelper.accessor('nama_kps', {
            header: 'KPS',
            cell: info => {
                const nama = info.getValue();
                const typeKps = info.row.original.type_kps;
                const noSk = info.row.original.nomor_sk;
                return (
                    <div className="space-y-1 min-w-0">
                        <p className="text-xs font-semibold truncate">
                            {nama && nama.length > 0 ? nama.join(', ') : '-'}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                            skema: {typeKps && typeKps.length > 0 ? typeKps.join(', ') : '-'}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                            surat_keputusan: {noSk && noSk.length > 0 ? noSk.join(', ') : '-'}
                        </p>
                    </div>
                );
            },
        }),
        columnHelper.accessor('lokasi_prov', {
            header: 'Lokasi',
            cell: info => {
                const prov = info.getValue() || '-';
                const kab = info.row.original.lokasi_kab || '-';
                const kec = info.row.original.lokasi_kec || '-';
                const desa = info.row.original.lokasi_desa || '-';
                const luas = Number(info.row.original.lokasi_luas_ha || 0).toFixed(2);
                const kk = info.row.original.jumlah_kk ?? '-';
                return (
                    <div className="space-y-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{prov}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{kab} | {kec} | {desa}</p>
                        <p className="text-[10px] text-muted-foreground truncate">Luas {luas} Ha | KK {kk}</p>
                    </div>
                );
            },
        }),
        columnHelper.accessor('pengadu_nama', {
            header: 'Pengadu',
            cell: info => (
                <div className="space-y-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{info.getValue() || '-'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{info.row.original.pengadu_instansi || '-'}</p>
                </div>
            ),
        }),
        columnHelper.accessor('surat_nomor', {
            header: 'Surat',
            cell: info => (
                <div className="space-y-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{info.getValue() || '-'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">Tanggal: {formatDate(info.row.original.surat_tanggal)}</p>
                </div>
            ),
        }),
        columnHelper.accessor('ringkasan_masalah', {
            header: 'Ringkasan',
            cell: info => {
                const val = info.getValue();
                if (!val) return '-';
                return (
                    <p className="max-w-none whitespace-normal break-words text-xs leading-relaxed" title={val}>
                        {val}
                    </p>
                );
            },
        }),
    ], []);

    const table = useReactTable({
        data: displayList,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

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
            className="flex flex-col gap-8"
        >
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div>
                    <motion.h1 variants={itemVariants} className="text-3xl font-semibold tracking-tight text-foreground">Daftar Pengaduan</motion.h1>
                </div>
                <motion.div variants={itemVariants} className="flex items-center gap-3">
                    <Button
                        variant="primary"
                        leftIcon={<Plus size={18} />}
                        onClick={() => navigate('/pengaduan/baru')}
                        className="h-11 rounded-xl px-6"
                    >
                        Buat Aduan
                    </Button>
                </motion.div>
            </div>

            <motion.div variants={itemVariants} className="bg-white dark:bg-card border-y sm:border sm:rounded-2xl border-border/60 p-4">
                <div className="flex flex-col items-center gap-4 lg:flex-row">
                    <div className="relative w-full lg:flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari perihal, lokasi, SK, KPS... (Global Search)"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={`w-full rounded-xl border border-border bg-card pl-10 pr-4 transition-all focus:border-primary/40 focus:ring-2 focus:ring-ring/20 ${isCompact ? 'h-9 text-xs' : 'h-11 text-sm'}`}
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
                            className={`flex-1 md:w-48 ${isCompact ? 'text-xs' : ''}`}
                        />
                    </div>
                </div>
                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="gray" className="rounded-full px-2.5 py-1 text-[10px]">Baris: {displayList.length}</Badge>
                        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">Baru: {statusSummary.baru || 0}</Badge>
                        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">Proses: {statusSummary.proses || 0}</Badge>
                        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">Selesai: {statusSummary.selesai || 0}</Badge>
                    </div>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="overflow-hidden sm:rounded-2xl border-y sm:border border-border/60 bg-white dark:bg-card">
                <div className="md:hidden">
                    {loading ? (
                        <div className="flex h-64 flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
                            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                            <span className="text-sm font-medium">Memuat data dari Dashboard...</span>
                        </div>
                    ) : displayList.length > 0 ? (
                        <div className="space-y-3 p-3">
                            {displayList.map((row) => (
                                <button
                                    key={row.nomor_tiket}
                                    type="button"
                                    onClick={() => navigate(`/pengaduan/${row.nomor_tiket}`)}
                                    className="w-full rounded-2xl border border-border/70 bg-background p-4 text-left shadow-sm transition-colors hover:bg-muted/20"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0 space-y-1">
                                            <span className="inline-flex max-w-full rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-bold text-foreground">
                                                {row.nomor_tiket}
                                            </span>
                                            <p className="line-clamp-2 text-sm font-semibold text-foreground">
                                                {getPerihalValue(row)}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                                                KPS: {formatJoinedValue(row.nama_kps)}
                                            </p>
                                        </div>
                                        <Badge variant="gray" className="max-w-[9rem] whitespace-normal break-words text-center text-[10px] uppercase tracking-wide">
                                            {row.status?.toUpperCase?.() || '-'}
                                        </Badge>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 gap-3">
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Skema</p>
                                            <p className="mt-1 text-sm text-foreground">{formatJoinedValue(row.type_kps)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">surat_keputusan</p>
                                            <p className="mt-1 text-sm text-foreground line-clamp-2">{formatJoinedValue(row.nomor_sk)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Lokasi</p>
                                            <p className="mt-1 text-sm text-foreground line-clamp-2">
                                                {[row.lokasi_prov, row.lokasi_kab, row.lokasi_kec, row.lokasi_desa].filter(Boolean).join(' | ') || '-'}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-muted/20 p-3">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Luas</p>
                                                <p className="mt-1 text-sm font-semibold text-foreground">{Number(row.lokasi_luas_ha || 0).toFixed(2)} Ha</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Jumlah KK</p>
                                                <p className="mt-1 text-sm font-semibold text-foreground">{row.jumlah_kk ?? '-'}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                                            <p>Pengadu: {row.pengadu_nama || '-'}</p>
                                            <p>Instansi: {row.pengadu_instansi || '-'}</p>
                                            <p>Surat: {row.surat_nomor || '-'} • {formatDate(row.surat_tanggal)}</p>
                                            <p className="line-clamp-2">Ringkasan: {row.ringkasan_masalah || '-'}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex h-48 items-center justify-center px-6 text-center italic text-muted-foreground">
                            Tidak ada data pengaduan yang ditemukan.
                        </div>
                    )}
                </div>

                <div className="hidden h-[600px] overflow-auto md:block">
                    {loading ? (
                        <div className="flex h-64 flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
                            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                            <span className="text-sm font-medium">Memuat data dari Dashboard...</span>
                        </div>
                    ) : (
                        <Table className="w-full min-w-[1280px] lg:table-fixed border-none shadow-none">
                            <TableHeader className="z-20 bg-gradient-to-b from-muted/60 to-muted/30 backdrop-blur">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                        {headerGroup.headers.map((header) => (
                                            <TableHead
                                                key={header.id}
                                                onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                                                className={`${isCompact ? 'p-2.5 text-[10px]' : 'p-4 text-[11px]'} ${getDesktopColumnClassName(header.column.id)} align-top ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                    {{
                                                        asc: <ChevronUp size={12} className="text-foreground/70" />,
                                                        desc: <ChevronDown size={12} className="text-foreground/70" />
                                                    }[header.column.getIsSorted() as string] ?? null}
                                                </div>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows.length > 0 ? (
                                    table.getRowModel().rows.map(row => (
                                        <TableRow
                                            key={row.id}
                                            onClick={() => navigate(`/pengaduan/${row.original.nomor_tiket}`)}
                                            style={{ cursor: 'pointer' }}
                                            className="transition-all duration-150 hover:bg-muted/30"
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell
                                                    key={cell.id}
                                                    className={`${isCompact ? 'p-2.5 text-[11px]' : 'p-4 text-xs'} ${getDesktopColumnClassName(cell.column.id)} align-top text-foreground`}
                                                >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-48 text-center italic text-muted-foreground">
                                            Tidak ada data pengaduan yang ditemukan.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {!loading && totalCount > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border bg-muted/25 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
                            <div className="rounded-md border border-border bg-card px-3 py-1 text-xs font-bold">
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
