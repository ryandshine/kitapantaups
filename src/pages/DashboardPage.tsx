import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowUpRight,
    BarChart3,
    ChevronRight,
    CircleAlert,
    Clock3,
    Download,
    MapPin,
    Plus,
    UserRound,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { Button } from '../components/ui';
import type { Aduan } from '../types';
import { useAduanList, useDashboardStats } from '../hooks/useAduan';
import { SummaryReportService } from '../lib/summary-report.service';
import { SummaryPdfService } from '../lib/summary-pdf.service';
import './DashboardPage.css';

type TrendPoint = {
    month: string;
    received: number;
    resolved: number;
};

const statusLabels: Record<string, string> = {
    baru: 'Baru',
    proses: 'Dalam proses',
    menunggu_tanggapan: 'Menunggu tanggapan',
    selesai: 'Selesai',
};

const getStatusLabel = (status: string) => statusLabels[status] || status.replaceAll('_', ' ');

const getStatusClass = (status: string) => {
    if (status === 'selesai') return 'dashboard-status dashboard-status-success';
    if (status === 'menunggu_tanggapan') return 'dashboard-status dashboard-status-warning';
    if (status === 'proses') return 'dashboard-status dashboard-status-info';
    return 'dashboard-status';
};

const resolveDate = (value: unknown) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
};

const getKpsName = (aduan: Aduan) => {
    const names = Array.isArray(aduan.nama_kps) && aduan.nama_kps.length > 0
        ? aduan.nama_kps
        : aduan.kps_items?.map((item) => item.nama_lembaga || item.nama_kps || '').filter(Boolean) || [];
    if (names.length === 0) return '-';
    return names.length > 1 ? `${names[0]} +${names.length - 1} lainnya` : names[0];
};

const getLocation = (aduan: Aduan) =>
    [aduan.lokasi_kab, aduan.lokasi_prov].filter(Boolean).join(', ') || '-';

const getSubject = (aduan: Aduan) => aduan.perihal || aduan.ringkasan_masalah || aduan.ringkasanMasalah || '-';

const getUpdatedAt = (aduan: Aduan) => resolveDate(aduan.updatedAt ?? aduan.created_at ?? aduan.createdAt);

const monthName = (value: string) => {
    const date = resolveDate(value);
    return format(date, 'MMM', { locale: localeID }).replace('.', '');
};

const chartPath = (data: TrendPoint[], key: 'received' | 'resolved', width: number, height: number, padding: { left: number; right: number; top: number; bottom: number }, max: number) => {
    if (data.length === 0) return '';
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    return data.map((point, index) => {
        const x = padding.left + (data.length === 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth);
        const y = padding.top + innerHeight - (point[key] / max) * innerHeight;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
};

const chartPoint = (data: TrendPoint[], key: 'received' | 'resolved', index: number, width: number, height: number, padding: { left: number; right: number; top: number; bottom: number }, max: number) => {
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    return {
        x: padding.left + (data.length === 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth),
        y: padding.top + innerHeight - (data[index]?.[key] || 0) / max * innerHeight,
    };
};

const TrendChart: React.FC<{ data: TrendPoint[] }> = ({ data }) => {
    const width = 760;
    const height = 230;
    const padding = { left: 34, right: 18, top: 18, bottom: 34 };
    const max = Math.max(1, ...data.flatMap((point) => [point.received, point.resolved]));
    const ticks = [0, Math.ceil(max / 2), max];

    return (
        <div className="dashboard-chart-wrap">
            <div className="dashboard-chart-legend" aria-label="Legenda grafik">
                <span><i className="dashboard-legend-dot dashboard-legend-dot-received" />Aduan Diterima</span>
                <span><i className="dashboard-legend-dot dashboard-legend-dot-resolved" />Aduan Diselesaikan</span>
            </div>
            {data.length > 0 ? (
                <svg className="dashboard-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tren aduan tahun berjalan">
                    {ticks.map((tick) => {
                        const y = padding.top + (height - padding.top - padding.bottom) - (tick / max) * (height - padding.top - padding.bottom);
                        return (
                            <g key={tick}>
                                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="dashboard-chart-grid" />
                                <text x={padding.left - 9} y={y + 4} textAnchor="end" className="dashboard-chart-label">{tick}</text>
                            </g>
                        );
                    })}
                    <path d={chartPath(data, 'received', width, height, padding, max)} className="dashboard-chart-line dashboard-chart-line-received" />
                    <path d={chartPath(data, 'resolved', width, height, padding, max)} className="dashboard-chart-line dashboard-chart-line-resolved" />
                    {data.map((point, index) => {
                        const received = chartPoint(data, 'received', index, width, height, padding, max);
                        const resolved = chartPoint(data, 'resolved', index, width, height, padding, max);
                        const x = received.x;
                        return (
                            <g key={`${point.month}-${index}`}>
                                <circle cx={received.x} cy={received.y} r="3.5" className="dashboard-chart-point dashboard-chart-point-received" />
                                <circle cx={resolved.x} cy={resolved.y} r="3.5" className="dashboard-chart-point dashboard-chart-point-resolved" />
                                <text x={x} y={height - 10} textAnchor="middle" className="dashboard-chart-label">{monthName(point.month)}</text>
                            </g>
                        );
                    })}
                </svg>
            ) : (
                <div className="dashboard-chart-empty">Belum ada data tren untuk tahun berjalan.</div>
            )}
        </div>
    );
};

export const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { data: stats, isLoading: isLoadingStats } = useDashboardStats();
    const { data: recentAduanResult, isLoading: isLoadingAduan } = useAduanList(1, 5, undefined, undefined, { sortBy: 'updated_at' });
    const recentAduan = recentAduanResult?.data || [];
    const [tick, setTick] = useState(0);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [summaryFeedback, setSummaryFeedback] = useState<string | null>(null);

    useEffect(() => {
        const timer = window.setInterval(() => setTick((value) => value + 1), 60000);
        return () => window.clearInterval(timer);
    }, []);

    const total = stats?.total || 0;
    const totalBaru = stats?.by_status?.baru || 0;
    const totalProses = stats?.by_status?.proses || 0;
    const totalMenunggu = stats?.by_status?.menunggu_tanggapan || 0;
    const rkpsCount = stats?.rkps || 0;
    const rkpsPercentage = total > 0 ? Math.round((rkpsCount / total) * 100) : 0;
    const kupsTotal = Object.values(stats?.kups || {}).reduce((sum, value) => sum + value, 0);
    const maxKups = Math.max(1, ...Object.values(stats?.kups || {}));
    const trend = stats?.monthly_trend || [];

    const priorityAduan = useMemo(() => recentAduan.filter((aduan) => (
        aduan.prioritas === 'tinggi' ||
        !aduan.picName ||
        aduan.status === 'menunggu_tanggapan'
    )).slice(0, 3), [recentAduan]);

    const isLoading = isLoadingStats || isLoadingAduan;

    const handleDownloadSummary = async () => {
        setIsGeneratingSummary(true);
        setSummaryFeedback(null);
        try {
            const summary = await SummaryReportService.getSummary();
            SummaryPdfService.exportSummary(summary);
        } catch (error) {
            console.error('Failed to create summary report:', error);
            setSummaryFeedback(error instanceof Error ? error.message : 'Gagal membuat laporan summary.');
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    if (isLoading) {
        return (
            <div className="dashboard-loading">
                <div className="dashboard-loading-spinner" />
                <span>Memuat dashboard...</span>
            </div>
        );
    }

    return (
        <motion.div
            key={tick}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="dashboard-forest-shell"
        >
            <div className="dashboard-intro">
                <div>
                    <p className="dashboard-kicker">Pusat kendali pengaduan</p>
                    <h1>Ringkasan hari ini</h1>
                    <p className="dashboard-intro-copy">Prioritas kerja, kelengkapan dokumen, dan perkembangan aduan dalam satu tampilan.</p>
                </div>
                <div className="dashboard-intro-actions">
                    <Button onClick={() => void handleDownloadSummary()} variant="ghost" disabled={isGeneratingSummary} className="dashboard-report-action" leftIcon={<Download className="h-4 w-4" />}>
                        {isGeneratingSummary ? 'Membuat PDF...' : 'Download Laporan Summary'}
                    </Button>
                    <Button onClick={() => navigate('/pengaduan/baru')} className="dashboard-primary-action">
                        <Plus className="mr-2 h-4 w-4" /> Buat Aduan
                    </Button>
                </div>
            </div>

            {summaryFeedback && <p className="dashboard-report-feedback" role="status">{summaryFeedback}</p>}

            <section className="dashboard-metrics" aria-label="Ringkasan metrik">
                <div className="dashboard-metric"><span>Total Aduan</span><strong>{total}</strong><small>Seluruh aduan tercatat</small></div>
                <div className="dashboard-metric"><span>Aduan Baru</span><strong>{totalBaru}</strong><small className="dashboard-metric-positive">{stats?.last_30_days || 0} aduan 30 hari terakhir</small></div>
                <div className="dashboard-metric"><span>Dalam Proses</span><strong>{totalProses}</strong><small>{totalMenunggu} menunggu tanggapan</small></div>
                <div className="dashboard-metric"><span>Selesai</span><strong>{stats?.by_status?.selesai || 0}</strong><small className="dashboard-metric-positive">Status penanganan selesai</small></div>
            </section>

            <section>
                <div className="dashboard-section-heading">
                    <div><h2>Rekap Perencanaan dan Kelembagaan</h2><p>Ringkasan dokumen RKPS dan kelas KUPS dari seluruh aduan.</p></div>
                    <span>{total} aduan · {kupsTotal} unit KUPS</span>
                </div>
                <div className="dashboard-surface dashboard-recap">
                    <div className="dashboard-rkps">
                        <button className="dashboard-donut" type="button" onClick={() => navigate('/pengaduan?rkps=Sudah')} aria-label="Lihat aduan yang memiliki dokumen RKPS">
                            <svg viewBox="0 0 100 100" aria-hidden="true">
                                <circle cx="50" cy="50" r="40" className="dashboard-donut-track" />
                                <motion.circle cx="50" cy="50" r="40" className="dashboard-donut-value" strokeDasharray={2 * Math.PI * 40} initial={{ strokeDashoffset: 2 * Math.PI * 40 }} animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - rkpsPercentage / 100) }} transition={{ duration: 1 }} />
                            </svg>
                            <span><strong>{rkpsPercentage}%</strong><small>Memiliki</small></span>
                        </button>
                        <div className="dashboard-recap-copy">
                            <p className="dashboard-eyebrow">Dokumen RKPS</p>
                            <strong>{rkpsCount} <small>/ {total} aduan</small></strong>
                            <div className="dashboard-filter-stack">
                                <button type="button" onClick={() => navigate('/pengaduan?rkps=Sudah')}><i className="dashboard-dot dashboard-dot-sage" />Sudah ({rkpsCount})</button>
                                <button type="button" onClick={() => navigate('/pengaduan?rkps=Belum')}><i className="dashboard-dot dashboard-dot-muted" />Belum ({Math.max(0, total - rkpsCount)})</button>
                            </div>
                        </div>
                    </div>
                    <div className="dashboard-kups">
                        <div className="dashboard-kups-heading"><div><p className="dashboard-eyebrow dashboard-eyebrow-amber">Kelas KUPS</p><p>Kelas Kelompok Usaha Perhutanan Sosial dari seluruh aduan yang tercatat.</p></div><span>{kupsTotal} unit</span></div>
                        <div className="dashboard-kups-list">
                            {[
                                { key: 'PLATINUM' as const, label: 'Kelas Platinum', className: 'dashboard-bar-platinum' },
                                { key: 'EMAS' as const, label: 'Kelas Emas', className: 'dashboard-bar-gold' },
                                { key: 'PERAK' as const, label: 'Kelas Silver', className: 'dashboard-bar-silver' },
                                { key: 'BIRU' as const, label: 'Kelas Biru', className: 'dashboard-bar-blue' },
                            ].map((item) => {
                                const value = stats?.kups?.[item.key] || 0;
                                return (
                                    <button key={item.key} type="button" className="dashboard-kups-row" onClick={() => navigate(`/pengaduan?kups_kelas=${item.key}`)}>
                                        <span className={`dashboard-kups-mark ${item.className}`} />
                                        <span className="dashboard-kups-label">{item.label}</span>
                                        <strong>{value} unit</strong>
                                        <span className="dashboard-kups-track"><span className={`dashboard-kups-fill ${item.className}`} style={{ width: `${(value / maxKups) * 100}%` }} /></span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            <div className="dashboard-two-column">
                <section className="dashboard-surface dashboard-priority">
                    <div className="dashboard-panel-heading"><div><h2>Prioritas Penanganan</h2><p>Aduan yang memerlukan perhatian atau tindakan lanjutan.</p></div><span>{priorityAduan.length} item</span></div>
                    <div className="dashboard-priority-list">
                        {priorityAduan.length > 0 ? priorityAduan.map((aduan) => (
                            <button type="button" key={aduan.id} className="dashboard-priority-row" onClick={() => navigate(`/pengaduan/${aduan.nomor_tiket}`)}>
                                <CircleAlert className="dashboard-priority-icon" />
                                <span><strong>{getSubject(aduan)}</strong><small>{aduan.nomor_tiket} · {getKpsName(aduan)}</small></span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </button>
                        )) : <div className="dashboard-empty-inline">Tidak ada prioritas penanganan saat ini.</div>}
                    </div>
                </section>
                <section className="dashboard-surface dashboard-trend">
                    <div className="dashboard-panel-heading"><div><h2>Tren Aduan Tahun Berjalan</h2><p>Perbandingan jumlah aduan diterima dan diselesaikan per bulan.</p></div><BarChart3 className="h-5 w-5 text-muted-foreground" /></div>
                    <TrendChart data={trend} />
                </section>
            </div>

            <section className="dashboard-surface dashboard-recent">
                <div className="dashboard-panel-heading"><div><h2>Aduan Terbaru</h2><p>Nomor tiket, KPS, status, dan waktu pembaruan terakhir.</p></div><Link to="/pengaduan" className="dashboard-text-link">Lihat semua aduan <ArrowUpRight className="h-4 w-4" /></Link></div>
                <div className="dashboard-table-wrap">
                    <div className="dashboard-table dashboard-table-head"><span>Tiket &amp; KPS</span><span>Ringkasan Aduan</span><span>Lokasi &amp; PIC</span><span>Status</span><span>Pembaruan</span><span /></div>
                    {recentAduan.length > 0 ? recentAduan.map((aduan) => (
                        <button type="button" key={aduan.id} className="dashboard-table dashboard-table-row" onClick={() => navigate(`/pengaduan/${aduan.nomor_tiket}`)}>
                            <span className="dashboard-ticket-cell"><strong>{aduan.nomor_tiket}</strong><small>KPS: {getKpsName(aduan)}</small></span>
                            <span className="dashboard-subject-cell">{getSubject(aduan)}</span>
                            <span className="dashboard-location-cell"><span><MapPin className="h-3 w-3" />{getLocation(aduan)}</span><span><UserRound className="h-3 w-3" />{aduan.picName || 'Belum ditugaskan'}</span></span>
                            <span className={getStatusClass(aduan.status)}>{getStatusLabel(aduan.status)}</span>
                            <span className="dashboard-updated-cell"><Clock3 className="h-3 w-3" />{formatDistanceToNowStrict(getUpdatedAt(aduan), { addSuffix: true, locale: localeID })}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                    )) : <div className="dashboard-empty">Belum ada aduan yang ditemukan.</div>}
                </div>
                <div className="dashboard-mobile-list">
                    {recentAduan.map((aduan) => (
                        <button type="button" key={`mobile-${aduan.id}`} className="dashboard-mobile-row" onClick={() => navigate(`/pengaduan/${aduan.nomor_tiket}`)}>
                            <div className="dashboard-mobile-top"><span><strong>{aduan.nomor_tiket}</strong><small>KPS: {getKpsName(aduan)}</small></span><span className={getStatusClass(aduan.status)}>{getStatusLabel(aduan.status)}</span></div>
                            <p>{getSubject(aduan)}</p>
                            <div className="dashboard-mobile-meta"><span>{getLocation(aduan)}</span><span>{aduan.picName || 'Belum ditugaskan'}</span><span>Diperbarui {formatDistanceToNowStrict(getUpdatedAt(aduan), { addSuffix: true, locale: localeID })}</span></div>
                        </button>
                    ))}
                </div>
            </section>
        </motion.div>
    );
};
