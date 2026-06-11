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
            className="space-y-5"
        >
            {/* Hero Section */}
            <div className="hero-panel">
                <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div>
                        <motion.h1 variants={itemVariants} className="mb-2 text-2xl font-bold tracking-tight text-foreground md:text-4xl">
                            Halo, {user?.displayName?.split(' ')[0] || 'Admin'}!
                        </motion.h1>

                    </div>
                    <motion.div variants={itemVariants} className="flex items-center gap-5">
                        <div className="text-right">
                            <p className="text-4xl font-semibold tracking-tight text-foreground md:text-[2.75rem]">{totalCount}</p>
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total Aduan</p>
                        </div>
                        <Button
                            onClick={() => navigate('/pengaduan/baru')}
                            className="hero-button text-[0.9rem]"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Buat Aduan
                        </Button>
                    </motion.div>
                </div>
                <div className="hero-orb" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {statCards.map((stat, i) => {
                    const colors = [
                        'border-blue-500/20 bg-blue-50/30 text-blue-700',
                        'border-orange-500/20 bg-orange-50/30 text-orange-700',
                        'border-amber-500/20 bg-amber-50/30 text-amber-700',
                        'border-emerald-500/20 bg-emerald-50/30 text-emerald-700',
                    ];
                    return (
                        <motion.div
                            key={i}
                            variants={itemVariants}
                            className={cn(
                                "group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5",
                                colors[i % colors.length]
                            )}
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <div className="rounded-xl bg-white/50 p-2 shadow-sm backdrop-blur-sm">
                                    <stat.icon className="h-5 w-5" />
                                </div>
                            </div>
                            <div>
                                <p className="mb-1 text-[12px] font-bold uppercase tracking-[0.2em] opacity-70">{stat.label}</p>
                                <h3 className="text-2xl font-bold tracking-tight md:text-3xl">{stat.value}</h3>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Rekap Perencanaan dan Kelembagaan */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight text-foreground px-1">
                    Rekap Perencanaan dan Kelembagaan
                </h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {/* RKPS Card */}
                    <motion.div
                        variants={itemVariants}
                        className="relative overflow-hidden rounded-3xl border border-blue-500/10 bg-gradient-to-br from-blue-50/10 to-transparent p-6 shadow-sm backdrop-blur-sm dark:border-blue-500/20 dark:from-blue-950/10"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">
                                    Dokumen RKPS
                                </h3>
                                <p className="text-2xl font-black text-foreground mt-1">
                                    {stats?.rkps || 0} <span className="text-sm font-semibold text-muted-foreground">/ {totalCount} aduan</span>
                                </p>
                            </div>
                            <span className="rounded-xl bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                Real-time
                            </span>
                        </div>

                        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
                            <div className="flex-1 space-y-3">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Menunjukkan proporsi aduan kelompok Perhutanan Sosial yang <strong>telah memiliki</strong> dokumen Rencana Kerja Perhutanan Sosial (RKPS).
                                </p>
                                <div className="flex items-center gap-3 text-xs font-semibold">
                                    <button
                                        onClick={() => navigate('/aduan?rkps=Sudah')}
                                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border border-blue-500/20 bg-blue-500/5 transition-all hover:bg-blue-500/10 hover:border-blue-500/40 text-blue-700 dark:text-blue-400 group"
                                        title="Filter aduan dengan RKPS: Sudah"
                                    >
                                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500 group-hover:scale-110 transition-transform" />
                                        <span>Sudah ({stats?.rkps || 0})</span>
                                    </button>
                                    <button
                                        onClick={() => navigate('/aduan?rkps=Belum')}
                                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border border-muted bg-muted/15 transition-all hover:bg-muted/30 hover:border-muted-foreground/30 text-muted-foreground group"
                                        title="Filter aduan dengan RKPS: Belum"
                                    >
                                        <span className="h-2.5 w-2.5 rounded-full bg-muted group-hover:scale-110 transition-transform" />
                                        <span>Belum ({totalCount - (stats?.rkps || 0)})</span>
                                    </button>
                                </div>
                            </div>

                            {/* Donut Gauge */}
                            <div 
                                onClick={() => navigate('/aduan?rkps=Sudah')}
                                className="relative flex shrink-0 items-center justify-center h-28 w-28 cursor-pointer hover:scale-105 transition-transform duration-300 group"
                                title="Klik untuk memfilter aduan yang sudah memiliki dokumen RKPS"
                            >
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        className="stroke-muted/20 dark:stroke-muted/10"
                                        strokeWidth="8"
                                        fill="transparent"
                                    />
                                    <motion.circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        className="stroke-blue-500 dark:stroke-blue-400 group-hover:stroke-blue-600 transition-colors"
                                        strokeWidth="8"
                                        fill="transparent"
                                        strokeDasharray={2 * Math.PI * 38}
                                        initial={{ strokeDashoffset: 2 * Math.PI * 38 }}
                                        animate={{ strokeDashoffset: 2 * Math.PI * 38 * (1 - (totalCount > 0 ? (stats?.rkps || 0) / totalCount : 0)) }}
                                        transition={{ duration: 1.2, ease: "easeOut" }}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center group-hover:translate-y-[-1px] transition-transform">
                                    <span className="text-2xl font-black text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {totalCount > 0 ? Math.round(((stats?.rkps || 0) / totalCount) * 100) : 0}%
                                    </span>
                                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground mt-0.5">Memiliki</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* KUPS Card */}
                    <motion.div
                        variants={itemVariants}
                        className="relative overflow-hidden rounded-3xl border border-orange-500/10 bg-gradient-to-br from-orange-50/10 to-transparent p-6 shadow-sm backdrop-blur-sm dark:border-orange-500/20 dark:from-orange-950/10"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-400">
                                    Unit Usaha (KUPS)
                                </h3>
                                <p className="text-2xl font-black text-foreground mt-1">
                                    {((stats?.kups?.BIRU || 0) + (stats?.kups?.PERAK || 0) + (stats?.kups?.EMAS || 0) + (stats?.kups?.PLATINUM || 0))} <span className="text-sm font-semibold text-muted-foreground">unit terproses</span>
                                </p>
                            </div>
                            <span className="rounded-xl bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                                Status Proses
                            </span>
                        </div>

                        {/* Visual Progress Bars */}
                        <div className="space-y-3.5">
                            {[
                                { key: 'BIRU', label: 'Kelas Biru', value: stats?.kups?.BIRU || 0, gradient: 'from-blue-500 to-cyan-400', glow: 'shadow-blue-500/10', text: 'text-blue-500' },
                                { key: 'PERAK', label: 'Kelas Silver', value: stats?.kups?.PERAK || 0, gradient: 'from-slate-400 to-zinc-300', glow: 'shadow-slate-400/10', text: 'text-slate-400' },
                                { key: 'EMAS', label: 'Kelas Emas', value: stats?.kups?.EMAS || 0, gradient: 'from-amber-500 to-yellow-400', glow: 'shadow-amber-500/10', text: 'text-amber-500' },
                                { key: 'PLATINUM', label: 'Kelas Platinum', value: stats?.kups?.PLATINUM || 0, gradient: 'from-indigo-500 to-purple-400', glow: 'shadow-indigo-500/10', text: 'text-indigo-500' },
                            ].map((item, index) => {
                                const maxVal = Math.max(1, stats?.kups?.BIRU || 0, stats?.kups?.PERAK || 0, stats?.kups?.EMAS || 0, stats?.kups?.PLATINUM || 0);
                                const percentage = (item.value / maxVal) * 100;

                                return (
                                    <div 
                                        key={index} 
                                        onClick={() => navigate(`/aduan?kups_kelas=${item.key}`)}
                                        className="space-y-1 rounded-xl border border-transparent p-1.5 transition-all hover:bg-orange-500/5 dark:hover:bg-orange-500/10 hover:border-orange-500/10 cursor-pointer group"
                                        title={`Klik untuk memfilter aduan dengan KUPS ${item.label}`}
                                    >
                                        <div className="flex justify-between items-center text-xs font-semibold">
                                            <span className="text-foreground/90 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{item.label}</span>
                                            <span className={`${item.text} font-bold group-hover:scale-105 transition-transform`}>{item.value} unit</span>
                                        </div>
                                        <div className="relative h-2 w-full rounded-full bg-muted/50 overflow-hidden dark:bg-muted/20">
                                            <motion.div
                                                className={`absolute h-full rounded-full bg-gradient-to-r ${item.gradient} ${item.glow} shadow-sm group-hover:brightness-110 transition-all`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Content Section */}
            <div className="grid gap-5 lg:grid-cols-3 items-stretch">
                {/* Recent Aduan List */}
                <motion.div variants={itemVariants} className="flex h-full flex-col space-y-4 lg:col-span-2">
                    <div className="flex h-10 items-center justify-between px-1">
                        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground leading-none">
                            Aduan Terbaru
                        </h2>
                        <Link to="/aduan" className="group flex items-center gap-1 text-[13px] font-semibold text-muted-foreground transition-all hover:text-primary leading-none">
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
