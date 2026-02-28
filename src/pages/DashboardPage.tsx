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
    const { data: recentAduanResult, isLoading: isLoadingAduan } = useAduanList(1, 5);
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
            className="space-y-6"
        >
            {/* Hero Section */}
            <div className="relative overflow-hidden sm:rounded-2xl bg-white dark:bg-card border-y sm:border border-border/60 p-6 md:p-8">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <motion.h1 variants={itemVariants} className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-2">
                            Dashboard Ringkasan
                        </motion.h1>
                        <motion.p variants={itemVariants} className="text-muted-foreground text-sm md:text-base max-w-lg leading-relaxed">
                            Monitor perkembangan pengaduan dan manajemen KPS secara real-time dan terintegrasi.
                        </motion.p>
                    </div>
                    <motion.div variants={itemVariants} className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-5xl font-semibold tracking-tighter text-primary">{totalCount}</p>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-1">Total Aduan</p>
                        </div>
                        <Button
                            onClick={() => navigate('/pengaduan/baru')}
                            variant="primary"
                            className="h-11 px-6 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 text-sm font-medium"
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
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={i}
                        variants={itemVariants}
                        className={cn(
                            "group relative overflow-hidden sm:rounded-2xl p-5 bg-white dark:bg-card border-y sm:border border-border/60 transition-all duration-300",
                        )}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn("rounded-full p-2.5 transition-colors bg-background/50", stat.color)}>
                                <stat.icon className="h-4 w-4" />
                            </div>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 opacity-70">{stat.label}</p>
                            <h3 className="text-2xl font-semibold tracking-tight text-foreground">{stat.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Content Section */}
            <div className="grid gap-8 lg:grid-cols-3">
                {/* Recent Aduan List */}
                <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            Aduan Terbaru
                        </h2>
                        <Button
                            onClick={() => navigate('/pengaduan')}
                            variant="ghost"
                            className="text-primary hover:text-primary/80 font-medium text-xs hover:bg-transparent px-0"
                        >
                            Lihat Semua
                            <ChevronRight size={14} className="ml-1" />
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {recentAduan.length > 0 ? (
                            recentAduan.map((aduan: Aduan) => (
                                <motion.div
                                    key={aduan.id}
                                    whileHover={{ scale: 1.005 }}
                                    onClick={() => navigate(`/pengaduan/${aduan.nomor_tiket}`)}
                                    className="group relative bg-white dark:bg-card border border-border/60 sm:rounded-2xl p-5 hover:shadow-soft transition-all duration-300 cursor-pointer"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={cn(
                                                    "h-2 w-2 rounded-full ring-2 ring-white dark:ring-black",
                                                    aduan.status === 'selesai' ? "bg-emerald-500" :
                                                        aduan.status === 'ditolak' ? "bg-red-500" : "bg-amber-500"
                                                )} />
                                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                                    #{aduan.surat_nomor?.split('/').pop() || aduan.id.slice(0, 8)}
                                                </span>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
                                                    aduan.prioritas === 'tinggi' ? "bg-rose-50/50 text-rose-600 dark:bg-rose-500/10" :
                                                        aduan.prioritas === 'sedang' ? "bg-amber-50/50 text-amber-600 dark:bg-amber-500/10" : "bg-blue-50/50 text-blue-600 dark:bg-blue-500/10"
                                                )}>
                                                    {aduan.prioritas}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                                                {aduan.perihal}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 opacity-60">
                                                <div className="flex items-center gap-1.5 text-[11px] font-medium">
                                                    <MapPin size={12} />
                                                    {aduan.lokasi_kab}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11px] font-medium">
                                                    <Tag size={12} />
                                                    {Array.isArray(aduan.jenis_kps) ? aduan.jenis_kps[0] : aduan.jenis_kps}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11px] font-medium">
                                                    <Calendar size={12} />
                                                    {formatDistanceToNow(new Date(aduan.created_at ?? aduan.createdAt ?? Date.now()), { addSuffix: true, locale: localeID })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 self-start md:self-center">
                                            <div className="h-8 w-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                                <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-white transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-16 rounded-3xl border border-dashed border-border/60 bg-white/50">
                                <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground font-medium">Belum ada aduan yang ditemukan</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Activity & Stats Sidebar */}
                <motion.div variants={itemVariants} className="space-y-6">
                    <div className="bg-white dark:bg-card border-y sm:border border-border/60 sm:rounded-2xl p-6 relative overflow-hidden flex flex-col h-full max-h-[800px]">
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
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
                                className="h-8 text-xs w-[140px]"
                            />
                        </div>

                        <div className="space-y-6 relative z-10 overflow-y-auto custom-scrollbar pr-2 flex-1">
                            {filteredActivities.length > 0 ? (
                                filteredActivities.map((activity, i) => {
                                    const ui = getActivityUI(activity.type);
                                    const Icon = ui.icon;
                                    
                                    return (
                                        <div key={activity.id} className="flex gap-4 group">
                                            <div className="flex flex-col items-center">
                                                <div className={cn(
                                                    "h-8 w-8 rounded-full border bg-background flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 z-10",
                                                    ui.border, ui.color, ui.bg
                                                )}>
                                                    <Icon size={14} />
                                                </div>
                                                {i < filteredActivities.length - 1 && (
                                                    <div className="w-[1px] flex-1 bg-border my-2" />
                                                )}
                                            </div>
                                            <div className="pb-2">
                                                <div className="text-xs font-medium text-foreground leading-snug group-hover:text-primary transition-colors prose prose-slate prose-xs max-w-none">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{activity.description}</ReactMarkdown>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-1.5 font-medium flex items-center gap-2">
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
