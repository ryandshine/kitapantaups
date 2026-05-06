import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, FeedbackBanner } from '../components/ui';
import { Save as SaveIcon, UserCircle, ShieldCheck, RefreshCw, Database } from 'lucide-react';
import { UserService } from '../lib/user.service';
import { useKpsSyncStatus, useSyncKps } from '../hooks/useKps';
import './PengaturanPage.css';

export const PengaturanPage: React.FC = () => {
    const { user, refreshUser, isAdmin } = useAuth();
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const syncKpsMutation = useSyncKps();
    const syncStatusQuery = useKpsSyncStatus(isAdmin);
    const syncStatus = syncStatusQuery.data;
    const isSyncRunning = Boolean(syncKpsMutation.isPending || syncStatus?.isRunning);

    React.useEffect(() => {
        if (!feedback) return;
        const timeout = window.setTimeout(() => setFeedback(null), 4000);
        return () => window.clearTimeout(timeout);
    }, [feedback]);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await UserService.updateMe({
                displayName,
                phone,
            });
            await refreshUser();
            setFeedback({ type: 'success', message: 'Profil berhasil diperbarui.' });
        } catch (err) {
            console.error(err);
            setFeedback({ type: 'error', message: 'Gagal memperbarui profil.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSyncKps = async () => {
        try {
            setFeedback({ type: 'info', message: 'Sinkronisasi KPS dimulai. Status akan dipantau otomatis.' });
            const result = await syncKpsMutation.mutateAsync();
            setFeedback({ type: 'info', message: result.message });
        } catch (err) {
            console.error(err);
            setFeedback({ type: 'error', message: 'Gagal menjalankan sinkronisasi KPS.' });
        }
    };

    return (
        <div className="mx-auto max-w-4xl animate-in fade-in duration-500">
            <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2e6a57] to-[#1e4639] p-6 shadow-2xl md:p-10">
                <div className="absolute top-0 right-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
                <div className="relative z-10 flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:text-left">
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[2.2rem] border-4 border-white/20 bg-white/15 shadow-2xl backdrop-blur-xl">
                        <UserCircle className="h-20 w-20 text-white/90" />
                    </div>
                    <div className="flex flex-col gap-1.5 text-white">
                        <p className="text-[0.72rem] font-bold uppercase tracking-[0.3em] text-white/60">Profil Saya</p>
                        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{user?.displayName || '-'}</h1>
                        <div className="mt-1 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                            <span className="rounded-lg bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                                {user?.role}
                            </span>
                            <span className="text-[11px] font-medium text-white/50">
                                ID: {user?.id.substring(0, 8).toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {feedback && (
                <div className="mb-8">
                    <FeedbackBanner
                        type={feedback.type}
                        message={feedback.message}
                        onClose={() => setFeedback(null)}
                    />
                </div>
            )}

            <Card className="border-primary/12 shadow-[var(--shadow-card)]">
                <CardHeader className="page-section-header">
                    <CardTitle>Perbarui Profil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <Input
                            label="Nama Lengkap"
                            placeholder="Masukkan nama lengkap"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            fullWidth
                        />
                        <Input
                            label="Email Dinas"
                            value={user?.email || ''}
                            disabled
                            fullWidth
                            helperText="Email tidak dapat diubah secara mandiri."
                        />
                        <Input
                            label="Nomor Telepon"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+62 812..."
                            fullWidth
                        />
                        <div className="flex flex-col gap-1.5">
                            <label className="ml-0.5 text-[0.82rem] font-semibold text-foreground/72">Role Sistem</label>
                            <div className="flex h-10 items-center rounded-xl border border-border/80 bg-background/88 px-3 text-[0.92rem] font-medium text-foreground">
                                {user?.role?.toUpperCase()}
                            </div>
                            <span className="ml-0.5 text-[10px] leading-relaxed text-muted-foreground">Perubahan hak akses dikelola oleh Administrator Sistem.</span>
                        </div>
                    </div>

                    <div className="flex justify-end border-t border-border pt-5">
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            isLoading={isSaving}
                            className="px-8 shadow-lg shadow-primary/20"
                            leftIcon={<SaveIcon size={16} />}
                        >
                            Simpan Perubahan
                        </Button>
                    </div>
                </CardContent>
            </Card>



            {isAdmin && (
                <Card className="mt-6 border-primary/12 shadow-[0_24px_60px_-38px_rgba(46,106,87,0.24)]">
                    <CardHeader className="page-section-header">
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-primary" />
                            Sinkronisasi Master KPS
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs leading-relaxed text-muted-foreground">
                                {isSyncRunning
                                    ? 'Sinkronisasi sedang berjalan. Halaman akan memperbarui status secara otomatis.'
                                    : 'Sinkronisasi master KPS dapat dijalankan kapan saja dari sini.'}
                            </div>
                            <Button
                                variant="primary"
                                onClick={handleSyncKps}
                                isLoading={isSyncRunning}
                                disabled={isSyncRunning}
                                className="px-6 shadow-lg shadow-primary/20"
                                leftIcon={<RefreshCw size={16} />}
                            >
                                    {isSyncRunning ? 'Sedang sync...' : 'Sync KPS'}
                            </Button>
                        </div>

                        {isSyncRunning && (
                            <div className="space-y-2" aria-live="polite">
                                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    <span>Progress Sync</span>
                                    <span>Berjalan</span>
                                </div>
                                <div className="sync-progress-track" role="progressbar" aria-label="Progres sinkronisasi KPS" aria-valuetext="Sinkronisasi sedang berjalan">
                                    <div className="sync-progress-bar" />
                                </div>
                            </div>
                        )}

                        {(syncStatus?.isRunning || syncStatus?.lastResult || syncStatus?.lastError) && (
                            <div className="rounded-2xl border border-border bg-background/90 p-4">
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${syncStatus?.isRunning ? 'bg-primary/10 text-primary' : syncStatus?.lastError ? 'bg-destructive/10 text-destructive' : 'bg-secondary/10 text-secondary'}`}>
                                        {syncStatus?.isRunning ? (
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                        ) : syncStatus?.lastError ? (
                                            <ShieldCheck className="h-4 w-4" />
                                        ) : (
                                            <Database className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground">
                                            {syncStatus?.isRunning
                                                ? 'Sinkronisasi sedang berjalan'
                                                : syncStatus?.lastError
                                                    ? 'Sinkronisasi gagal'
                                                    : 'Sinkronisasi terakhir selesai'}
                                        </p>
                                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                            {syncStatus?.isRunning
                                                ? 'Halaman ini memantau job aktif di backend. Anda tidak perlu menutup layar.'
                                                : syncStatus?.lastError
                                                    ? syncStatus.lastError
                                                    : syncStatus?.lastResult
                                                        ? `Berhasil memproses ${syncStatus.lastResult.uniqueRows.toLocaleString('id-ID')} data.`
                                                        : 'Belum ada status sync yang tercatat.'}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                            {syncStatus?.startedAt && <span>Mulai: {new Date(syncStatus.startedAt).toLocaleString('id-ID')}</span>}
                                            {syncStatus?.finishedAt && <span>Selesai: {new Date(syncStatus.finishedAt).toLocaleString('id-ID')}</span>}
                                            {syncStatus?.lastResult?.processedRows !== undefined && (
                                                <span>Diproses: {syncStatus.lastResult.processedRows.toLocaleString('id-ID')}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
