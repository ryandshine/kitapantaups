import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Columns3, Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Select, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import {
    type SortingState,
    type VisibilityState,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    createColumnHelper
} from '@tanstack/react-table';
import { useAduanList, useAduanCount } from '../hooks/useAduan';
import { useUIDensity } from '../hooks/useUIDensity';

const columnHelper = createColumnHelper<any>();

export const AduanListPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        tanggal_buat: false,
        jenis_kps: false,
        nomor_sk: false,
        jumlah_kk: false,
        lokasi_kab: false,
        lokasi_kec: false,
        lokasi_desa: false,
        lembaga_pengadu: false,
        surat_tanggal: false,
    });
    const [showColumnPanel, setShowColumnPanel] = useState(false);
    const { density, setDensity, isCompact } = useUIDensity();
    const itemsPerPage = 10;

    const { data: aduanList, isLoading: loadingItems } = useAduanList(currentPage, itemsPerPage, searchTerm);
    const { data: totalCount = 0, isLoading: loadingCount } = useAduanCount(
        statusFilter === 'all' ? undefined : { status: statusFilter }
    );

    const loading = loadingItems || loadingCount;
    const displayList = useMemo<any[]>(() => aduanList || [], [aduanList]);
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

    const columns = useMemo(() => [
        columnHelper.accessor('nomor_tiket', {
            header: 'Tiket',
            cell: info => (
                <div className="space-y-1">
                    <span className="inline-flex rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold text-foreground whitespace-nowrap">
                        {info.getValue()}
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                        Dibuat: {formatDate(info.row.original.tanggal_buat)}
                    </p>
                </div>
            ),
        }),
        columnHelper.accessor('tanggal_buat', {
            header: 'Tanggal Buat',
            cell: info => formatDate(info.getValue()),
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
                const jenis = info.row.original.jenis_kps;
                const noSk = info.row.original.nomor_sk;
                return (
                    <div className="max-w-[260px] space-y-1">
                        <p className="text-xs font-semibold whitespace-normal break-words">
                            {nama && nama.length > 0 ? nama.join(', ') : '-'}
                        </p>
                        <p className="text-[10px] text-muted-foreground whitespace-normal break-words">
                            Jenis: {jenis && jenis.length > 0 ? jenis.join(', ') : '-'}
                        </p>
                        <p className="text-[10px] text-muted-foreground whitespace-normal break-words">
                            SK: {noSk && noSk.length > 0 ? noSk.join(', ') : '-'}
                        </p>
                    </div>
                );
            },
        }),
        columnHelper.accessor('jenis_kps', {
            header: 'Jenis KPS',
            cell: info => {
                const val = info.getValue();
                return val && val.length > 0 ? val.join(', ') : '-';
            },
        }),
        columnHelper.accessor('nomor_sk', {
            header: 'No SK',
            cell: info => {
                const val = info.getValue();
                return val && val.length > 0 ? val.join(', ') : '-';
            },
        }),
        columnHelper.accessor('balai_ps', {
            header: 'Balai PS',
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
                    <div className="max-w-[300px] space-y-1">
                        <p className="text-xs font-semibold whitespace-normal break-words">{prov}</p>
                        <p className="text-[10px] text-muted-foreground whitespace-normal break-words">{kab} | {kec} | {desa}</p>
                        <p className="text-[10px] text-muted-foreground">Luas {luas} Ha | KK {kk}</p>
                    </div>
                );
            },
        }),
        columnHelper.accessor('lokasi_luas_ha', {
            header: 'Luas (Ha)',
            cell: info => {
                const val = info.getValue();
                return val !== undefined ? Number(val).toFixed(2) : '0.00';
            },
        }),
        columnHelper.accessor('jumlah_kk', {
            header: 'KK',
        }),
        columnHelper.accessor('lokasi_kab', {
            header: 'Kabupaten',
        }),
        columnHelper.accessor('lokasi_kec', {
            header: 'Kecamatan',
        }),
        columnHelper.accessor('lokasi_desa', {
            header: 'Desa',
        }),
        columnHelper.accessor('pengadu_nama', {
            header: 'Pengadu',
            cell: info => (
                <div className="max-w-[240px] space-y-1">
                    <p className="text-xs font-semibold whitespace-normal break-words">{info.getValue() || '-'}</p>
                    <p className="text-[10px] text-muted-foreground whitespace-normal break-words">{info.row.original.lembaga_pengadu || '-'}</p>
                </div>
            ),
        }),
        columnHelper.accessor('lembaga_pengadu', {
            header: 'Lembaga',
        }),
        columnHelper.accessor('surat_nomor', {
            header: 'Surat',
            cell: info => (
                <div className="space-y-1">
                    <p className="max-w-[260px] text-xs font-semibold whitespace-normal break-words">{info.getValue() || '-'}</p>
                    <p className="text-[10px] text-muted-foreground">Tanggal: {formatDate(info.row.original.surat_tanggal)}</p>
                </div>
            ),
        }),
        columnHelper.accessor('surat_tanggal', {
            header: 'Tanggal Surat',
            cell: info => formatDate(info.getValue()),
        }),
        columnHelper.accessor('ringkasan_masalah', {
            header: 'Ringkasan',
            cell: info => {
                const val = info.getValue();
                if (!val) return '-';
                return (
                    <p className="max-w-[360px] text-xs whitespace-normal break-words" title={val}>
                        {val}
                    </p>
                );
            },
        }),
    ], []);

    const table = useReactTable({
        data: displayList,
        columns,
        state: { sorting, columnVisibility },
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
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
                        <div className="hidden sm:flex items-center gap-1 rounded-xl border border-border bg-card p-1">
                            <button
                                type="button"
                                onClick={() => setDensity('comfortable')}
                                className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors ${density === 'comfortable' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Comfortable
                            </button>
                            <button
                                type="button"
                                onClick={() => setDensity('compact')}
                                className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors ${density === 'compact' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Compact
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="gray" className="rounded-full px-2.5 py-1 text-[10px]">Baris: {displayList.length}</Badge>
                        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">Baru: {statusSummary.baru || 0}</Badge>
                        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">Proses: {statusSummary.proses || 0}</Badge>
                        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">Selesai: {statusSummary.selesai || 0}</Badge>
                    </div>
                    <div className="relative flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Columns3 size={14} />}
                            onClick={() => setShowColumnPanel((prev) => !prev)}
                        >
                            Kolom
                        </Button>
                        {showColumnPanel && (
                            <div className="absolute right-0 top-11 z-40 w-64 rounded-xl border border-border/80 bg-card p-3 shadow-lg backdrop-blur">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tampilkan Kolom</p>
                                <div className="max-h-72 space-y-1 overflow-auto pr-1">
                                    {table.getAllLeafColumns().map((column) => (
                                        <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50">
                                            <input
                                                type="checkbox"
                                                checked={column.getIsVisible()}
                                                onChange={column.getToggleVisibilityHandler()}
                                                className="h-3.5 w-3.5 rounded border-border"
                                            />
                                            <span className="truncate">{String(column.columnDef.header)}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="overflow-hidden sm:rounded-2xl border-y sm:border border-border/60 bg-white dark:bg-card">
                <div className="h-[600px] overflow-auto custom-scrollbar-horizontal">
                    {loading ? (
                        <div className="flex h-64 flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
                            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                            <span className="text-sm font-medium">Memuat data dari Dashboard...</span>
                        </div>
                    ) : (
                        <Table className="min-w-[1280px] border-none shadow-none">
                            <TableHeader className="z-20 bg-gradient-to-b from-muted/60 to-muted/30 backdrop-blur">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                        {headerGroup.headers.map((header) => (
                                            <TableHead
                                                key={header.id}
                                                onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                                                className={`${isCompact ? 'p-2.5 text-[10px]' : 'p-4 text-[11px]'} align-top ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
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
                                                    className={`${isCompact ? 'p-2.5 text-[11px]' : 'p-4 text-xs'} align-top text-foreground`}
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
