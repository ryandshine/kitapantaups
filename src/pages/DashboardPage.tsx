import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    FileText,
    CheckCircle2,
    Plus,
    ChevronRight,
    ArrowUpRight,
    Search,
    Send,
    MapPin,
    Tag,
    Calendar,
    Clock,
    Briefcase,
    Zap,
    Upload,
    Trash2,
    RefreshCw,
    Download,
    AlertTriangle,
    Map,
    Bell,
    FileSignature,
    LogIn,
    LogOut,
    UserPlus,
    Settings,
    Bot,
    Database,
    ShieldAlert,
    Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Select } from '../components/ui';
import { ActivityService } from '../lib/activity.service';
import { getAduanCardTheme, getAduanStatusDotClass } from '../lib/neutral-theme';
import type { AppActivity, Aduan, ActivityType } from '../types';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAduanList, useDashboardStats } from '../hooks/useAduan';
import { useAuth } from '../contexts/AuthContext';

const isActivityFilter = (value: string): value is 'all' | 'aduan' | 'system' =>
    value === 'all' || value === 'aduan' || value === 'system';

export const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const systemActivityTypes: ActivityType[] = [
        'user_login',
        'user_logout',
        'create_user',
        'update_user',
        'change_role',
        'update_settings',
        'ai_generate_summary',
        'sync_master_data',
    ];
    const navigate = useNavigate();
    const [activities, setActivities] = useState<AppActivity[]>([]);
    const [isLoadingActivities, setIsLoadingActivities] = useState(true);
    const [activityFilter, setActivityFilter] = useState<'all' | 'aduan' | 'system'>('all');
    const [, setTick] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(timer);
    }, []);

    // Consolidated Dashboard Stats Query
    const { data: stats, isLoading: isLoadingStats } = useDashboardStats();
    const { data: recentAduanResult, isLoading: isLoadingAduan } = useAduanList(1, 5, undefined, undefined, { sortBy: 'updated_at' });
    const recentAduan = recentAduanResult?.data || [];

    const totalCount = stats?.total || 0;
    const totalBaru = stats?.by_status?.['baru'] || 0;
    const totalProses = stats?.by_status?.['proses'] || 0;
    const totalMenungguTanggapan = stats?.by_status?.['menunggu_tanggapan'] || 0;
    const selesaiCount = stats?.by_status?.['selesai'] || 0;

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                // Fetch more to allow local filtering
                const activityList = await ActivityService.getRecentActivities(20);
                setActivities(activityList);
            } catch (error) {
                console.error("Dashboard Activity Error:", error);
            } finally {
                setIsLoadingActivities(false);
            }
        };
        fetchActivities();
    }, []);

    const isLoading = isLoadingAduan || isLoadingActivities || isLoadingStats;

    const statCards = [
        { label: 'Baru', value: totalBaru, icon: Send },
        { label: 'Proses Penanganan', value: totalProses, icon: Search },
        { label: 'Menunggu Tanggapan', value: totalMenungguTanggapan, icon: Clock },
        { label: 'Selesai', value: selesaiCount, icon: CheckCircle2 },
    ];

    const getRecentAduanLocation = (aduan: Aduan) =>
        [aduan.lokasi_kab, aduan.lokasi_prov].filter(Boolean).join(', ') || '-';

    const getRecentAduanSkema = (aduan: Aduan) => {
        const values = Array.isArray(aduan.type_kps) && aduan.type_kps.length > 0
            ? aduan.type_kps
            : Array.isArray(aduan.jenis_kps) ? aduan.jenis_kps : [];
        return values.filter(Boolean)[0] || '-';
    };

    const getRecentAduanKpsName = (aduan: Aduan) => {
        const values = Array.isArray(aduan.nama_kps) && aduan.nama_kps.length > 0
            ? aduan.nama_kps
            : Array.isArray(aduan.kps_items) ? aduan.kps_items.map((item) => item.nama_lembaga || item.nama_kps || '') : [];
        return values.filter(Boolean)[0] || '-';
    };

    const resolveAduanDate = (value: unknown, fallback?: Date) => {
        if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
        if (typeof value === 'string' || typeof value === 'number') {
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) return parsed;
        }
        return fallback ?? new Date();
    };

    const getActivityUI = (type: ActivityType) => {
        // Document
        if (['upload_document', 'upload_tl_document'].includes(type)) return { icon: Upload };
        if (['delete_document', 'delete_tl'].includes(type)) return { icon: Trash2 };
        if (['sync_drive'].includes(type)) return { icon: RefreshCw };
        if (['export_data'].includes(type)) return { icon: Download };
        
        // Aduan & Disposisi
        if (['create_aduan', 'create_tl'].includes(type)) return { icon: Plus };
        if (['update_priority'].includes(type)) return { icon: AlertTriangle };
        if (['update_status'].includes(type)) return { icon: ChevronRight };
        if (['update_kps_lokasi'].includes(type)) return { icon: Map };
        if (['send_notification'].includes(type)) return { icon: Bell };
        if (['update_aduan', 'update_tl'].includes(type)) return { icon: FileSignature };
        
        // User & Security
        if (['user_login'].includes(type)) return { icon: LogIn };
        if (['user_logout'].includes(type)) return { icon: LogOut };
        if (['create_user', 'update_user'].includes(type)) return { icon: UserPlus };
        if (['change_role'].includes(type)) return { icon: ShieldAlert };
        
        // Settings & Integration
        if (['update_settings'].includes(type)) return { icon: Settings };
        if (['ai_generate_summary'].includes(type)) return { icon: Bot };
        if (['sync_master_data'].includes(type)) return { icon: Database };
        
        return { icon: Zap };
    };

    const getActivityContextTags = (activity: AppActivity): string[] => {
        const metadata = activity.metadata || {};
        const tags: string[] = [];

        const ticket = metadata.nomor_tiket || metadata.nomorTiket;
        if (typeof ticket === 'string' && ticket.trim()) {
            tags.push(`Tiket: ${ticket}`);
        }

        if (activity.aduanId) {
            tags.push(`Aduan: ${activity.aduanId.slice(0, 8)}`);
        }

        if (typeof metadata.jenisTL === 'string' && metadata.jenisTL.trim()) {
            tags.push(`Jenis Dokumen: ${metadata.jenisTL}`);
        }

        if (typeof metadata.file_name === 'string' && metadata.file_name.trim()) {
            tags.push(`File: ${metadata.file_name}`);
        }

        if (Array.isArray(metadata.fields) && metadata.fields.length > 0) {
            const visibleFields = metadata.fields.slice(0, 3).join(', ');
            tags.push(
                metadata.fields.length > 3
                    ? `Field: ${visibleFields} +${metadata.fields.length - 3} lainnya`
                    : `Field: ${visibleFields}`
            );
        }

        if (Array.isArray(metadata.changes) && metadata.changes.length > 0) {
            const visibleChanges = metadata.changes
                .slice(0, 2)
                .map((item: { label?: string } | null | undefined) => item?.label)
                .filter(Boolean)
                .join(', ');
            if (visibleChanges) {
                tags.push(
                    metadata.changes.length > 2
                        ? `Perubahan: ${visibleChanges} +${metadata.changes.length - 2}`
                        : `Perubahan: ${visibleChanges}`
                );
            }
        }

        if (typeof metadata.from_status === 'string' && typeof metadata.to_status === 'string' && metadata.from_status && metadata.to_status) {
            tags.push(`Status: ${metadata.from_status} -> ${metadata.to_status}`);
        }

        return tags;
    };

    const filteredActivities = activities.filter(activity => {
        if (activityFilter === 'all') return true;
        if (activityFilter === 'system') return systemActivityTypes.includes(activity.type);
        return !systemActivityTypes.includes(activity.type); // 'aduan' filter
    }).slice(0, 8); // Show max 8 items

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4 text-muted-foreground">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                <span className="text-sm font-medium">Memuat dashboard...</span>
            </div>
        );
    }

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-6"
        >
            {/* Hero + Stats bento cluster */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-stretch">
                {/* Hero tile */}
                <div className="hero-panel flex flex-col justify-between lg:col-span-5">
                    <motion.h1 variants={itemVariants} className="hero-heading relative z-10 mb-2 text-2xl font-bold tracking-tight md:text-4xl">
                        Halo, {user?.displayName?.split(' ')[0] || 'Admin'}!
                    </motion.h1>

                    <motion.div variants={itemVariants} className="relative z-10 mt-6 flex items-end justify-between gap-4">
                        <div>
                            <p className="hero-heading text-4xl font-semibold tracking-tight md:text-[2.75rem]">{totalCount}</p>
                            <p className="hero-muted mt-1 text-[10px] font-semibold uppercase tracking-[0.16em]">Total Aduan</p>
                        </div>
                        <Button
                            onClick={() => navigate('/pengaduan/baru')}
                            className="hero-button text-[0.9rem]"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Buat Aduan
                        </Button>
                    </motion.div>
                    <div className="hero-orb" />
                </div>

                {/* Stats 2x2 tile grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
                    {statCards.map((stat, i) => {
                        // Reuses the app's existing semantic tokens (secondary/accent/destructive/primary)
                        // instead of ad hoc rainbow colors, to match neutral-theme.ts conventions.
                        const accents = ['bg-secondary', 'bg-accent', 'bg-destructive', 'bg-primary'];
                        const accent = accents[i % accents.length];
                        return (
                            <motion.div
                                key={i}
                                layout
                                variants={itemVariants}
                                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
                            >
                                <span className={cn("absolute inset-y-0 left-0 w-1", accent)} />
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="rounded-xl bg-muted p-2 text-foreground/70 shadow-sm">
                                        <stat.icon className="h-5 w-5" />
                                    </div>
                                </div>
                                <div>
                                    <p className="mb-1 text-[12px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
                                    <h3 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">{stat.value}</h3>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Rekap Perencanaan dan Kelembagaan */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight text-foreground px-1">
                    Rekap Perencanaan dan Kelembagaan
                </h2>

                <motion.div
                    layout
                    variants={itemVariants}
                    className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-sm backdrop-blur-sm"
                >
                    <div className="relative flex flex-col lg:flex-row">
                        {/* RKPS side */}
                        <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
                            <div>
                                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-secondary">
                                    Dokumen RKPS
                                </h3>
                            </div>

                            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
                                {/* Donut Gauge */}
                                <div
                                    onClick={() => navigate('/pengaduan?rkps=Sudah')}
                                    className="group relative flex h-36 w-36 shrink-0 cursor-pointer items-center justify-center transition-transform duration-300 hover:scale-105 sm:h-44 sm:w-44"
                                    title="Klik untuk memfilter aduan yang sudah memiliki dokumen RKPS"
                                >
                                    <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="41"
                                            className="stroke-muted/20 dark:stroke-muted/10"
                                            strokeWidth="11"
                                            fill="transparent"
                                        />
                                        <motion.circle
                                            cx="50"
                                            cy="50"
                                            r="41"
                                            className="stroke-secondary transition-colors group-hover:stroke-secondary/80"
                                            strokeWidth="11"
                                            fill="transparent"
                                            strokeDasharray={2 * Math.PI * 41}
                                            initial={{ strokeDashoffset: 2 * Math.PI * 41 }}
                                            animate={{ strokeDashoffset: 2 * Math.PI * 41 * (1 - (totalCount > 0 ? (stats?.rkps || 0) / totalCount : 0)) }}
                                            transition={{ duration: 1.2, ease: "easeOut" }}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center justify-center transition-transform group-hover:translate-y-[-1px]">
                                        <span className="text-5xl font-black text-secondary transition-colors">
                                            {totalCount > 0 ? Math.round(((stats?.rkps || 0) / totalCount) * 100) : 0}%
                                        </span>
                                        <span className="mt-1 text-[11px] font-black uppercase tracking-widest text-secondary/90">Memiliki</span>
                                    </div>
                                </div>

                                <div className="space-y-3 text-center sm:text-left">
                                    <p className="text-3xl font-black text-foreground">
                                        {stats?.rkps || 0} <span className="text-base font-semibold text-muted-foreground">/ {totalCount} aduan</span>
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold sm:justify-start">
                                        <button
                                            onClick={() => navigate('/pengaduan?rkps=Sudah')}
                                            className="flex items-center gap-1.5 rounded-lg border border-secondary/25 bg-secondary/5 px-2.5 py-1.5 transition-all hover:border-secondary/40 hover:bg-secondary/10 text-secondary group"
                                            title="Filter aduan dengan RKPS: Sudah"
                                        >
                                            <span className="h-2.5 w-2.5 rounded-full bg-secondary transition-transform group-hover:scale-110" />
                                            <span>Sudah ({stats?.rkps || 0})</span>
                                        </button>
                                        <button
                                            onClick={() => navigate('/pengaduan?rkps=Belum')}
                                            className="flex items-center gap-1.5 rounded-lg border border-muted bg-muted/15 px-2.5 py-1.5 transition-all hover:border-muted-foreground/30 hover:bg-muted/30 text-foreground/85 group"
                                            title="Filter aduan dengan RKPS: Belum"
                                        >
                                            <span className="h-2.5 w-2.5 rounded-full bg-muted transition-transform group-hover:scale-110" />
                                            <span>Belum ({totalCount - (stats?.rkps || 0)})</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="mx-6 border-t border-border/60 lg:mx-0 lg:my-7 lg:border-l lg:border-t-0" />

                        {/* KUPS side */}
                        <div className="flex flex-1 flex-col gap-4 p-6 lg:p-7">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent">
                                        Kelas KUPS
                                    </h3>
                                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                        Kelas Kelompok Usaha Perhutanan Sosial dari <strong>seluruh</strong> aduan yang tercatat.
                                    </p>
                                </div>
                                <span className="shrink-0 rounded-xl bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-accent">
                                    {((stats?.kups?.BIRU || 0) + (stats?.kups?.PERAK || 0) + (stats?.kups?.EMAS || 0) + (stats?.kups?.PLATINUM || 0))} unit
                                </span>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { key: 'PLATINUM', label: 'Kelas Platinum', value: stats?.kups?.PLATINUM || 0, dot: 'bg-indigo-500', bar: 'bg-indigo-500', text: 'text-foreground' },
                                    { key: 'EMAS', label: 'Kelas Emas', value: stats?.kups?.EMAS || 0, dot: 'bg-amber-500', bar: 'bg-amber-500', text: 'text-foreground' },
                                    { key: 'PERAK', label: 'Kelas Silver', value: stats?.kups?.PERAK || 0, dot: 'bg-slate-400', bar: 'bg-slate-400', text: 'text-foreground' },
                                    { key: 'BIRU', label: 'Kelas Biru', value: stats?.kups?.BIRU || 0, dot: 'bg-blue-500', bar: 'bg-blue-500', text: 'text-foreground' },
                                ].map((item, index) => {
                                    const maxVal = Math.max(1, stats?.kups?.BIRU || 0, stats?.kups?.PERAK || 0, stats?.kups?.EMAS || 0, stats?.kups?.PLATINUM || 0);
                                    const percentage = (item.value / maxVal) * 100;
                                    const hasValue = item.value > 0;

                                    return (
                                        <motion.div
                                            key={item.key}
                                            layout
                                            onClick={() => navigate(`/pengaduan?kups_kelas=${item.key}`)}
                                            className="group flex items-center gap-3 rounded-xl border border-transparent p-1.5 transition-all hover:border-border hover:bg-muted/40 cursor-pointer"
                                            title={`Klik untuk memfilter aduan dengan KUPS ${item.label}`}
                                        >
                                            <span
                                                className={cn(
                                                    "h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-card transition-transform group-hover:scale-110",
                                                    hasValue ? item.dot : "bg-transparent",
                                                    hasValue ? "ring-transparent" : "ring-border"
                                                )}
                                            />
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between text-xs font-semibold">
                                                    <span className="text-foreground/90">{item.label}</span>
                                                    <span className={`${item.text} font-bold`}>{item.value} unit</span>
                                                </div>
                                                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/50 dark:bg-muted/20">
                                                    <motion.div
                                                        className={`absolute h-full rounded-full ${item.bar} shadow-sm transition-all group-hover:brightness-110`}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Content Section */}
            <div className="grid gap-5 lg:grid-cols-3 items-stretch">
                {/* Recent Aduan List */}
                <motion.div variants={itemVariants} className="flex h-full flex-col space-y-4 lg:col-span-2">
                    <div className="flex h-10 items-center justify-between px-1">
                        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground leading-none">
                            Aduan Terbaru
                        </h2>
                        <Link to="/pengaduan" className="group flex items-center gap-1 text-[13px] font-semibold text-muted-foreground transition-all hover:text-primary leading-none">
                            Lihat Semua
                            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {recentAduan.length > 0 ? (
                            recentAduan.map((aduan: Aduan, index: number) => {
                                const theme = getAduanCardTheme(index);
                                const detailPanelClass = "bg-muted/70";

                                return (
                                    <motion.div
                                        key={aduan.id}
                                        whileHover={{ scale: 1.005 }}
                                        onClick={() => navigate(`/pengaduan/${aduan.nomor_tiket}`)}
                                        className={cn("group relative cursor-pointer rounded-2xl border p-4 transition-colors duration-300 hover:border-primary/25", theme.bg, theme.border)}
                                    >
                                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                                            <div className="flex-1 space-y-1.5">
                                                <div className="mb-1 flex items-center gap-2">
                                                    <span className={cn(
                                                        "h-2 w-2 rounded-full ring-2 ring-white/50",
                                                        getAduanStatusDotClass(aduan.status)
                                                    )} />
                                                    <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${theme.muted}`}>
                                                        No Aduan
                                                    </span>
                                                    <span className={`text-[11px] font-bold tracking-[0.18em] ${theme.text}`}>
                                                        {aduan.nomor_tiket}
                                                    </span>
                                                </div>
                                                <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${theme.muted}`}>
                                                    Perihal
                                                </p>
                                                <h3 className={`text-[1.05rem] font-bold leading-snug transition-colors ${theme.text}`}>
                                                    {aduan.perihal}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-3 self-start md:self-center">
                                                <div className={`flex h-7.5 w-7.5 items-center justify-center rounded-full transition-all duration-300 ${theme.iconBg}`}>
                                                    <ArrowUpRight size={14} className={`transition-colors ${theme.iconText}`} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`mt-4 rounded-xl border border-border px-3.5 py-3 ${detailPanelClass}`}>
                                            <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold ${theme.muted}`}>
                                                <div className="flex items-center gap-2">
                                                    <Briefcase size={13} className="shrink-0" />
                                                    <span className="leading-none">{getRecentAduanKpsName(aduan)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={13} className="shrink-0" />
                                                    <span className="leading-none">{getRecentAduanLocation(aduan)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Tag size={13} className="shrink-0" />
                                                    <span className="leading-none">{getRecentAduanSkema(aduan)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={13} className="shrink-0" />
                                                    <span className="leading-none">
                                                        {formatDistanceToNow(
                                                            resolveAduanDate(aduan.updatedAt ?? aduan.created_at ?? aduan.createdAt),
                                                            { addSuffix: true, locale: localeID }
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="rounded-3xl border border-dashed border-border bg-card py-14 text-center">
                                <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground font-medium">Belum ada aduan yang ditemukan</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex h-full flex-col space-y-4">
                    <div className="flex h-10 items-center justify-between px-1">
                        <h3 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground leading-none">
                            Aktivitas Sistem
                        </h3>
                        <Select
                            options={[
                                { value: 'all', label: 'Semua Aktivitas' },
                                { value: 'aduan', label: 'Hanya Aduan' },
                                { value: 'system', label: 'Hanya Sistem' }
                            ]}
                            value={activityFilter}
                            onChange={(val: string) => {
                                if (isActivityFilter(val)) setActivityFilter(val);
                            }}
                            className="h-8 w-[136px] text-[11px]"
                        />
                    </div>

                    <div className="surface-panel relative flex h-full max-h-[920px] flex-col overflow-hidden p-5 text-foreground">
                        <div className="relative z-10 flex-1 space-y-5 overflow-y-auto pr-2 custom-scrollbar">
                            {filteredActivities.length > 0 ? (
                                filteredActivities.map((activity, i) => {
                                    const ui = getActivityUI(activity.type);
                                    const Icon = ui.icon;
                                    const contextTags = getActivityContextTags(activity);
                                    
                                    return (
                                        <div key={activity.id} className="group rounded-xl border border-border/70 bg-card/80 px-3 py-3 shadow-sm">
                                            <div className="flex gap-3.5">
                                                <div className="flex flex-col items-center">
                                                    <div className={cn(
                                                        "z-10 flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted text-primary transition-transform group-hover:scale-105"
                                                    )}>
                                                        <Icon size={14} />
                                                    </div>
                                                    {i < filteredActivities.length - 1 && (
                                                        <div className="my-2 w-[1px] flex-1 bg-border" />
                                                    )}
                                                </div>
                                                <div className="pb-2">
                                                    <div className="prose prose-slate prose-xs max-w-none text-[11px] font-medium leading-snug text-foreground transition-colors group-hover:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-a:text-primary">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{activity.description}</ReactMarkdown>
                                                    </div>
                                                    {contextTags.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                                            {contextTags.map((tag, idx) => (
                                                                <span
                                                                    key={`${activity.id}-context-${idx}`}
                                                                    className="rounded-full border border-border bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <p className="mt-1.5 flex items-center gap-2 text-[9px] font-medium text-muted-foreground">
                                                        {formatDistanceToNow(activity.createdAt, { addSuffix: true, locale: localeID })}
                                                        <span className="h-1 w-1 rounded-full bg-border" />
                                                        <span className="text-foreground">{activity.userName.split(' ')[0]}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8">
                                    <Filter className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                                    <p className="text-[11px] text-muted-foreground italic">Tidak ada log aktivitas untuk filter ini</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div >
        </motion.div >
    );
};
