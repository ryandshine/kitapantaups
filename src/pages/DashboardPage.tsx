import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    XCircle,
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
import type { AppActivity, Aduan } from '../types';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAduanList, useDashboardStats } from '../hooks/useAduan';

export const DashboardPage: React.FC = () => {
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
    const totalDisposisi = stats?.by_status?.['baru'] || 0;
    const totalProses = (stats?.by_status?.['proses'] || 0) +
        (stats?.by_status?.['puldasi'] || 0) +
        (stats?.by_status?.['evaluasi'] || 0) +
        (stats?.by_status?.['monitor'] || 0);
    const selesaiCount = stats?.by_status?.['selesai'] || 0;
    const ditolakCount = stats?.by_status?.['ditolak'] || 0;

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
        { label: 'Disposisi', value: totalDisposisi, icon: Send, color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        { label: 'Proses', value: totalProses, icon: Search, color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
        { label: 'Selesai', value: selesaiCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        { label: 'Ditolak', value: ditolakCount, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    ];

    const getRecentAduanLocation = (aduan: Aduan) =>
        [aduan.lokasi_kab, aduan.lokasi_prov].filter(Boolean).join(', ') || '-';

    const getRecentAduanSkema = (aduan: Aduan) => {
        const values = Array.isArray(aduan.type_kps) && aduan.type_kps.length > 0
            ? aduan.type_kps
            : Array.isArray(aduan.jenis_kps) ? aduan.jenis_kps : [];
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

    const getRecentAduanBadge = (aduan: Aduan) => {
        const createdAt = resolveAduanDate(aduan.createdAt ?? aduan.created_at);
        const updatedAt = resolveAduanDate(aduan.updatedAt ?? createdAt, createdAt);
        return Math.abs(updatedAt.getTime() - createdAt.getTime()) < 60_000 ? 'Baru' : 'Diperbarui';
    };

    const getActivityUI = (type: string) => {
        // Document
        if (['upload_document', 'upload_tl_document'].includes(type)) return { icon: Upload, color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-500/20' };
        if (['delete_document', 'delete_tl'].includes(type)) return { icon: Trash2, color: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-500/20' };
        if (['sync_drive'].includes(type)) return { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-500/20' };
        if (['export_data'].includes(type)) return { icon: Download, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-500/20' };
        
        // Aduan & Disposisi
        if (['create_aduan', 'create_tl'].includes(type)) return { icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-500/20' };
        if (['update_priority'].includes(type)) return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-500/20' };
        if (['update_status'].includes(type)) return { icon: ChevronRight, color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-500/20' };
        if (['update_kps_lokasi'].includes(type)) return { icon: Map, color: 'text-purple-600', bg: 'bg-purple-50/50', border: 'border-purple-500/20' };
        if (['send_notification'].includes(type)) return { icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-500/20' };
        if (['update_aduan', 'update_tl'].includes(type)) return { icon: FileSignature, color: 'text-slate-600', bg: 'bg-slate-50/50', border: 'border-slate-500/20' };
        
        // User & Security
        if (['user_login'].includes(type)) return { icon: LogIn, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-500/20' };
        if (['user_logout'].includes(type)) return { icon: LogOut, color: 'text-slate-600', bg: 'bg-slate-50/50', border: 'border-slate-500/20' };
        if (['create_user', 'update_user'].includes(type)) return { icon: UserPlus, color: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-500/20' };
        if (['change_role'].includes(type)) return { icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-500/20' };
        
        // Settings & Integration
        if (['update_settings'].includes(type)) return { icon: Settings, color: 'text-slate-600', bg: 'bg-slate-50/50', border: 'border-slate-500/20' };
        if (['ai_generate_summary'].includes(type)) return { icon: Bot, color: 'text-purple-600', bg: 'bg-purple-50/50', border: 'border-purple-500/20' };
        if (['sync_master_data'].includes(type)) return { icon: Database, color: 'text-slate-600', bg: 'bg-slate-50/50', border: 'border-slate-500/20' };
        
        return { icon: Zap, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' };
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
                .map((item: any) => item?.label)
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
        const systemTypes = ['user_login', 'user_logout', 'create_user', 'update_user', 'change_role', 'update_settings', 'ai_generate_summary', 'sync_master_data'];
        if (activityFilter === 'system') return systemTypes.includes(activity.type);
        return !systemTypes.includes(activity.type); // 'aduan' filter
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
            <div className="relative overflow-hidden border-y border-border/60 bg-white p-5 dark:bg-card sm:rounded-2xl sm:border md:p-6">
                <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div>
                        <motion.h1 variants={itemVariants} className="mb-1.5 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                            Dashboard Ringkasan
                        </motion.h1>
                        <motion.p variants={itemVariants} className="max-w-lg text-[0.92rem] leading-relaxed text-muted-foreground">
                            Monitor perkembangan pengaduan dan manajemen KPS secara real-time dan terintegrasi.
                        </motion.p>
                    </div>
                    <motion.div variants={itemVariants} className="flex items-center gap-5">
                        <div className="text-right">
                            <p className="text-4xl font-semibold tracking-tight text-primary md:text-[2.75rem]">{totalCount}</p>
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total Aduan</p>
                        </div>
                        <Button
                            onClick={() => navigate('/pengaduan/baru')}
                            variant="primary"
                            className="rounded-full px-5 shadow-lg shadow-primary/20 transition-all text-[0.9rem] font-medium hover:shadow-primary/30 active:scale-95"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Buat Aduan
                        </Button>
                    </motion.div>
                </div>
                {/* Decorative background - softer */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl opacity-60" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={i}
                        variants={itemVariants}
                        className={cn(
                            "group relative overflow-hidden border-y border-border/60 bg-white p-4 transition-all duration-300 dark:bg-card sm:rounded-2xl sm:border",
                        )}
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <div className={cn("rounded-full bg-background/50 p-2 transition-colors", stat.color)}>
                                <stat.icon className="h-4 w-4" />
                            </div>
                        </div>
                        <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">{stat.label}</p>
                            <h3 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{stat.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Content Section */}
            <div className="grid gap-5 lg:grid-cols-3">
                {/* Recent Aduan List */}
                <motion.div variants={itemVariants} className="space-y-4 lg:col-span-2">
                    <div className="flex items-center justify-between px-1">
                        <div>
                            <h2 className="flex items-center gap-2 text-lg font-semibold">
                                Aduan Terbaru
                            </h2>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                                Menampilkan 5 aduan dengan aktivitas terbaru.
                            </p>
                        </div>
                        <Button
                            onClick={() => navigate('/pengaduan')}
                            variant="ghost"
                            className="px-0 text-[11px] font-medium text-primary hover:bg-transparent hover:text-primary/80"
                        >
                            Lihat Semua
                            <ChevronRight size={14} className="ml-1" />
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {recentAduan.length > 0 ? (
                            recentAduan.map((aduan: Aduan) => (
                                <motion.div
                                    key={aduan.id}
                                    whileHover={{ scale: 1.005 }}
                                    onClick={() => navigate(`/pengaduan/${aduan.nomor_tiket}`)}
                                    className="group relative cursor-pointer border border-border/60 bg-white p-4 transition-all duration-300 hover:shadow-soft dark:bg-card sm:rounded-2xl"
                                >
                                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                                        <div className="flex-1 space-y-1.5">
                                            <div className="mb-1 flex items-center gap-2">
                                                <span className={cn(
                                                    "h-2 w-2 rounded-full ring-2 ring-white dark:ring-black",
                                                    aduan.status === 'selesai' ? "bg-emerald-500" :
                                                        aduan.status === 'ditolak' ? "bg-red-500" : "bg-amber-500"
                                                )} />
                                                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                                    No Aduan
                                                </span>
                                                <span className="text-[10px] font-semibold tracking-[0.14em] text-foreground">
                                                    {aduan.nomor_tiket}
                                                </span>
                                                <span className={cn(
                                                    "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]",
                                                    aduan.prioritas === 'tinggi' ? "bg-rose-50/50 text-rose-600 dark:bg-rose-500/10" :
                                                        aduan.prioritas === 'sedang' ? "bg-amber-50/50 text-amber-600 dark:bg-amber-500/10" : "bg-blue-50/50 text-blue-600 dark:bg-blue-500/10"
                                                )}>
                                                    {aduan.prioritas}
                                                </span>
                                                <span className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                                    {getRecentAduanBadge(aduan)}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                                Perihal
                                            </p>
                                            <h3 className="text-[0.92rem] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                                                {aduan.perihal}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-muted-foreground/80">
                                                <div className="flex items-center gap-1.5 text-[10px] font-medium">
                                                    <MapPin size={12} />
                                                    {getRecentAduanLocation(aduan)}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-medium">
                                                    <Tag size={12} />
                                                    {getRecentAduanSkema(aduan)}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-medium">
                                                    <Calendar size={12} />
                                                    {formatDistanceToNow(
                                                        resolveAduanDate(aduan.updatedAt ?? aduan.created_at ?? aduan.createdAt),
                                                        { addSuffix: true, locale: localeID }
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 self-start md:self-center">
                                            <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-black/5 transition-all duration-300 group-hover:bg-primary group-hover:text-white dark:bg-white/5">
                                                <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-white transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="rounded-3xl border border-dashed border-border/60 bg-white/50 py-14 text-center">
                                <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground font-medium">Belum ada aduan yang ditemukan</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Activity & Stats Sidebar */}
                <motion.div variants={itemVariants} className="space-y-4">
                    <div className="relative flex h-full max-h-[760px] flex-col overflow-hidden border-y border-border/60 bg-white p-5 dark:bg-card sm:rounded-2xl sm:border">
                        <div className="relative z-10 mb-5 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-base font-semibold">
                                Aktivitas Sistem
                            </h3>
                            <Select
                                options={[
                                    { value: 'all', label: 'Semua Aktivitas' },
                                    { value: 'aduan', label: 'Hanya Aduan' },
                                    { value: 'system', label: 'Hanya Sistem' }
                                ]}
                                value={activityFilter}
                                onChange={(val: string) => setActivityFilter(val as any)}
                                className="h-8 w-[136px] text-[11px]"
                            />
                        </div>

                        <div className="relative z-10 flex-1 space-y-5 overflow-y-auto pr-2 custom-scrollbar">
                            {filteredActivities.length > 0 ? (
                                filteredActivities.map((activity, i) => {
                                    const ui = getActivityUI(activity.type);
                                    const Icon = ui.icon;
                                    const contextTags = getActivityContextTags(activity);
                                    
                                    return (
                                        <div key={activity.id} className="group flex gap-3.5">
                                            <div className="flex flex-col items-center">
                                                <div className={cn(
                                                    "z-10 flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full border bg-background transition-transform group-hover:scale-105",
                                                    ui.border, ui.color, ui.bg
                                                )}>
                                                    <Icon size={14} />
                                                </div>
                                                {i < filteredActivities.length - 1 && (
                                                    <div className="w-[1px] flex-1 bg-border my-2" />
                                                )}
                                            </div>
                                            <div className="pb-2">
                                                <div className="prose prose-slate prose-xs max-w-none text-[11px] font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{activity.description}</ReactMarkdown>
                                                </div>
                                                {contextTags.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {contextTags.map((tag, idx) => (
                                                            <span
                                                                key={`${activity.id}-context-${idx}`}
                                                                className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[9px] font-medium text-foreground/80"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <p className="mt-1.5 flex items-center gap-2 text-[9px] font-medium text-muted-foreground">
                                                    {formatDistanceToNow(activity.createdAt, { addSuffix: true, locale: localeID })}
                                                    <span className="w-1 h-1 rounded-full bg-border" />
                                                    <span className="text-foreground/80">{activity.userName.split(' ')[0]}</span>
                                                </p>
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
