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
import { getGoogleCardTheme, getGoogleStatusDotClass } from '../lib/google-theme';
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
            <div className="google-hero">
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
                            className="google-hero-button text-[0.9rem]"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Buat Aduan
                        </Button>
                    </motion.div>
                </div>
                <div className="google-hero-orb" />
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
                                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] opacity-70">{stat.label}</p>
                                <h3 className="text-2xl font-bold tracking-tight md:text-3xl">{stat.value}</h3>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Content Section */}
            <div className="grid gap-5 lg:grid-cols-3">
                {/* Recent Aduan List */}
                <motion.div variants={itemVariants} className="space-y-4 lg:col-span-2">
                    <div className="flex items-center justify-between px-1">
                        <div>
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                                Aduan Terbaru
                            </h2>
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
                            recentAduan.map((aduan: Aduan, index: number) => {
                                const theme = getGoogleCardTheme(index);
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
                                                        getGoogleStatusDotClass(aduan.status)
                                                    )} />
                                                    <span className={`text-[10px] font-medium uppercase tracking-[0.14em] ${theme.muted}`}>
                                                        No Aduan
                                                    </span>
                                                    <span className={`text-[10px] font-semibold tracking-[0.14em] ${theme.text}`}>
                                                        {aduan.nomor_tiket}
                                                    </span>
                                                </div>
                                                <p className={`text-[10px] font-medium uppercase tracking-[0.14em] ${theme.muted}`}>
                                                    Perihal
                                                </p>
                                                <h3 className={`text-[0.92rem] font-semibold leading-snug transition-colors ${theme.text}`}>
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
                                            <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-medium ${theme.muted}`}>
                                                <div className="flex items-center gap-1.5">
                                                    <Briefcase size={12} />
                                                    {getRecentAduanKpsName(aduan)}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin size={12} />
                                                    {getRecentAduanLocation(aduan)}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Tag size={12} />
                                                    {getRecentAduanSkema(aduan)}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={12} />
                                                    {formatDistanceToNow(
                                                        resolveAduanDate(aduan.updatedAt ?? aduan.created_at ?? aduan.createdAt),
                                                        { addSuffix: true, locale: localeID }
                                                    )}
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

                {/* Activity & Stats Sidebar */}
                <motion.div variants={itemVariants} className="space-y-4">
                    <div className="google-panel-green relative flex h-full max-h-[760px] flex-col overflow-hidden p-5 text-foreground">
                        <div className="relative z-10 mb-5 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
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
