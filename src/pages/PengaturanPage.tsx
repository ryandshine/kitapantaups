import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, FeedbackBanner } from '../components/ui';
import { Save as SaveIcon, Bell, UserCircle, Mail, Phone, ShieldCheck, RefreshCw, Database } from 'lucide-react';
import { UserService } from '../lib/user.service';
import { useKpsSyncStatus, useSyncKps } from '../hooks/useKps';

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
        <div className="max-w-6xl animate-in fade-in duration-500">
            <div className="google-hero mb-6">
                <div className="relative z-10 flex flex-col gap-2">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-primary/72">Pengaturan Akun</p>
                    <h1 className="text-3xl font-bold leading-none tracking-tight text-foreground">Data pengguna dan preferensi dasar</h1>
                    <p className="max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">
                        Perbarui identitas akun yang tampil di sistem. Bagian ini disederhanakan agar fokus pada data inti yang benar-benar dipakai.
                    </p>
                </div>
                <div className="google-hero-orb" />
            </div>

            {feedback && (
                <div className="mb-6">
                    <FeedbackBanner
                        type={feedback.type}
                        message={feedback.message}
                        onClose={() => setFeedback(null)}
                    />
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                <Card className="overflow-hidden border-primary/12 shadow-[0_24px_60px_-38px_rgba(46,106,87,0.35)]">
                    <div className="h-24 bg-[radial-gradient(circle_at_top_left,rgba(210,139,54,0.18),transparent_34%),linear-gradient(135deg,rgba(255,251,245,0.85),rgba(244,236,225,0.96))]" />
                    <CardContent className="relative -mt-10 flex flex-col gap-6 p-6 pt-0">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] border-4 border-card bg-muted shadow-[0_18px_36px_-24px_rgba(46,106,87,0.4)]">
                                <UserCircle className="h-16 w-16 text-muted-foreground" />
                            </div>
                            <div className="flex flex-1 flex-col gap-1">
                                <h2 className="text-2xl font-bold tracking-tight text-foreground">{user?.displayName || '-'}</h2>
                                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">{user?.role}</p>
                                <p className="text-xs text-muted-foreground">ID Pegawai: {user?.id.substring(0, 8).toUpperCase()}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-border bg-muted/40 p-4">
                                <div className="mb-2 flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5" />
                                    Email Dinas
                                </div>
                                <p className="text-sm font-medium text-foreground">{user?.email || '-'}</p>
                            </div>
                            <div className="rounded-2xl border border-border bg-muted/40 p-4">
                                <div className="mb-2 flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Akses Sistem
                                </div>
                                <p className="text-sm font-medium text-foreground">Role dikelola oleh Administrator Sistem.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/12 shadow-[0_24px_60px_-38px_rgba(46,106,87,0.28)]">
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

                        <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/35 px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Pastikan nomor telepon aktif</p>
                                    <p className="text-xs text-muted-foreground">Nomor ini dipakai untuk koordinasi internal tindak lanjut aduan.</p>
                                </div>
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
            </div>

            <Card className="mt-6 border-dashed border-primary/18 bg-card/92">
                <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 text-muted-foreground/70">
                        <Bell size={24} />
                    </div>
                    <p className="text-base font-semibold text-foreground">Notifikasi</p>
                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                        Preferensi notifikasi belum tersedia. Saat modul ini aktif, pengaturannya akan muncul di area ini tanpa memecah halaman ke tab lain.
                    </p>
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
                        <div className="rounded-2xl border border-border bg-muted/35 p-4">
                            <p className="text-sm font-semibold text-foreground">Tarik data terbaru dari GoKUPS</p>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                Gunakan tombol ini untuk memperbarui master KPS tanpa masuk ke server. Setelah sinkron selesai, daftar KPS, pencarian, dan detail terkait akan di-refresh otomatis.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs leading-relaxed text-muted-foreground">
                                Proses bisa memakan waktu beberapa menit tergantung jumlah data dari sumber eksternal.
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
