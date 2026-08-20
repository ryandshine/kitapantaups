import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Card, FeedbackBanner } from '../components/ui';
import { Save as SaveIcon, ShieldCheck, RefreshCw, Database, Pencil, Search, Loader2 } from 'lucide-react';
import { UserService } from '../lib/user.service';
import { useKpsSyncStatus, useSyncKps } from '../hooks/useKps';
import { KpsService } from '../lib/kps.service';
import type { KpsData } from '../types';
import { EditKpsModal } from '../components/ui/EditKpsModal';
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
    const [kpsSearch, setKpsSearch] = useState('');
    const [kpsResults, setKpsResults] = useState<KpsData[]>([]);
    const [isSearchingKps, setIsSearchingKps] = useState(false);
    const [editingKps, setEditingKps] = useState<KpsData | null>(null);
    const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'master' | 'sync'>('profile');

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

    const handleSearchKps = async (event: React.FormEvent) => {
        event.preventDefault();
        const query = kpsSearch.trim();
        if (!query) {
            setKpsResults([]);
            return;
        }
        setIsSearchingKps(true);
        try {
            setKpsResults(await KpsService.searchKps(query));
        } catch (err) {
            console.error(err);
            setFeedback({ type: 'error', message: 'Gagal mencari data KPS.' });
        } finally {
            setIsSearchingKps(false);
        }
    };

    const handleKpsSaved = (saved: KpsData) => {
        setKpsResults((previous) => previous.map((item) => item.id === saved.id ? saved : item));
        setFeedback({ type: 'success', message: 'Data KPS berhasil diperbarui.' });
    };

    return (
        <div className="mx-auto flex max-w-4xl flex-col gap-5 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2 px-1 py-2">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-primary">Administrasi Akun</p>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Pengaturan</h1>
                <p className="max-w-2xl text-[0.92rem] leading-relaxed text-muted-foreground">Kelola profil, akses akun, dan data master sistem dari satu tempat.</p>
            </div>

            {feedback && (
                <FeedbackBanner
                    type={feedback.type}
                    message={feedback.message}
                    onClose={() => setFeedback(null)}
                />
            )}

            <Card className="overflow-hidden">
                <div className="flex border-b border-border bg-muted/25" role="tablist" aria-label="Bagian pengaturan">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeSettingsTab === 'profile'}
                        onClick={() => setActiveSettingsTab('profile')}
                        className={`flex flex-1 items-center justify-center border-b-2 px-4 py-4 text-sm font-semibold transition-colors ${activeSettingsTab === 'profile' ? 'border-primary bg-card text-foreground' : 'border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground'}`}
                    >
                        Profil
                    </button>
                    {isAdmin && (
                        <>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeSettingsTab === 'master'}
                                onClick={() => setActiveSettingsTab('master')}
                                className={`flex flex-1 items-center justify-center border-b-2 px-4 py-4 text-sm font-semibold transition-colors ${activeSettingsTab === 'master' ? 'border-primary bg-card text-foreground' : 'border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground'}`}
                            >
                                Master KPS
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeSettingsTab === 'sync'}
                                onClick={() => setActiveSettingsTab('sync')}
                                className={`flex flex-1 items-center justify-center border-b-2 px-4 py-4 text-sm font-semibold transition-colors ${activeSettingsTab === 'sync' ? 'border-primary bg-card text-foreground' : 'border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground'}`}
                            >
                                Sinkronisasi
                            </button>
                        </>
                    )}
                </div>

                {activeSettingsTab === 'profile' && (
                    <section role="tabpanel">
                        <div className="flex flex-col gap-4 border-b border-border/70 p-5 sm:flex-row sm:items-center sm:p-7">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
                                {(user?.displayName?.trim() || user?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Profil saya</p>
                                <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground">{user?.displayName || '-'}</h2>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold uppercase tracking-wider text-primary">{user?.role}</span>
                                    <span>ID: {user?.id.substring(0, 8).toUpperCase()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 sm:p-7">
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-foreground">Informasi Profil</h3>
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Perbarui informasi yang digunakan untuk komunikasi internal.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <Input
                                    label="Nama lengkap"
                                    placeholder="Masukkan nama lengkap"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    fullWidth
                                />
                                <Input
                                    label="Email dinas"
                                    value={user?.email || ''}
                                    disabled
                                    fullWidth
                                    helperText="Email tidak dapat diubah secara mandiri."
                                />
                                <Input
                                    label="Nomor telepon"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+62 812..."
                                    fullWidth
                                />
                                <div className="flex flex-col gap-1.5">
                                    <label className="ml-0.5 text-[0.82rem] font-semibold text-foreground/72">Role sistem</label>
                                    <div className="flex h-10 items-center rounded-xl border border-border/80 bg-background/88 px-3 text-[0.92rem] font-medium text-foreground">
                                        {user?.role?.toUpperCase()}
                                    </div>
                                    <span className="ml-0.5 text-[10px] leading-relaxed text-muted-foreground">Hak akses dikelola oleh Administrator Sistem.</span>
                                </div>
                            </div>

                            <div className="mt-7 flex flex-col gap-4 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs leading-relaxed text-muted-foreground">Perubahan akan diterapkan ke profil akun Anda.</p>
                                <Button
                                    variant="primary"
                                    onClick={handleSave}
                                    isLoading={isSaving}
                                    className="w-full rounded-xl sm:w-auto"
                                    leftIcon={<SaveIcon size={16} />}
                                >
                                    Simpan Perubahan
                                </Button>
                            </div>
                        </div>
                    </section>
                )}

                {isAdmin && activeSettingsTab === 'master' && (
                    <section role="tabpanel" className="p-5 sm:p-7">
                        <div className="mb-6 flex items-start gap-3">
                            <Pencil className="mt-0.5 h-5 w-5 text-primary" />
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">Koreksi Data Master KPS</h2>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Cari berdasarkan nama lembaga, ID, nomor SK, provinsi, atau kabupaten untuk memperbaiki data KPS.</p>
                            </div>
                        </div>
                        <form onSubmit={handleSearchKps} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <Input
                                    label="Cari KPS atau lembaga"
                                    placeholder="Nama lembaga, nomor SK, provinsi..."
                                    value={kpsSearch}
                                    onChange={(event) => setKpsSearch(event.target.value)}
                                    leftIcon={<Search size={16} />}
                                    fullWidth
                                />
                            </div>
                            <Button type="submit" variant="primary" isLoading={isSearchingKps} leftIcon={!isSearchingKps ? <Search size={16} /> : undefined}>
                                Cari Data
                            </Button>
                        </form>
                        {isSearchingKps && <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Mencari data KPS...</div>}
                        {!isSearchingKps && kpsSearch.trim() && kpsResults.length === 0 && (
                            <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Data KPS tidak ditemukan.</p>
                        )}
                        {kpsResults.length > 0 && (
                            <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border">
                                {kpsResults.map((kps) => (
                                    <div key={kps.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-foreground">{kps.nama_lembaga || kps.nama_kps || '-'}</p>
                                            <p className="mt-1 truncate text-[11px] text-muted-foreground">{kps.id} · {kps.surat_keputusan || kps.nomor_sk || '-'} · {kps.kabupaten || kps.lokasi_kab || '-'}, {kps.provinsi || kps.lokasi_prov || '-'}</p>
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setEditingKps(kps)} leftIcon={<Pencil size={14} />}>Edit</Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {isAdmin && activeSettingsTab === 'sync' && (
                    <section role="tabpanel" className="p-5 sm:p-7">
                        <div className="mb-6 flex items-start gap-3">
                            <Database className="mt-0.5 h-5 w-5 text-primary" />
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">Sinkronisasi Master KPS</h2>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Perbarui data master KPS dari sumber sistem secara berkala.</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
                            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
                                {isSyncRunning
                                    ? 'Sinkronisasi sedang berjalan. Halaman akan memperbarui status secara otomatis.'
                                    : 'Sinkronisasi master KPS dapat dijalankan kapan saja dari halaman ini.'}
                            </p>
                            <Button
                                variant="primary"
                                onClick={handleSyncKps}
                                isLoading={isSyncRunning}
                                disabled={isSyncRunning}
                                className="w-full rounded-xl sm:w-auto"
                                leftIcon={<RefreshCw size={16} />}
                            >
                                {isSyncRunning ? 'Sedang sync...' : 'Sync KPS'}
                            </Button>
                        </div>

                        {isSyncRunning && (
                            <div className="mt-5 space-y-2" aria-live="polite">
                                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    <span>Progress sync</span>
                                    <span>Berjalan</span>
                                </div>
                                <div className="sync-progress-track" role="progressbar" aria-label="Progres sinkronisasi KPS" aria-valuetext="Sinkronisasi sedang berjalan">
                                    <div className="sync-progress-bar" />
                                </div>
                            </div>
                        )}

                        {(syncStatus?.isRunning || syncStatus?.lastResult || syncStatus?.lastError) && (
                            <div className="mt-5 rounded-xl border border-border bg-background/90 p-4">
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${syncStatus?.isRunning ? 'bg-primary/10 text-primary' : syncStatus?.lastError ? 'bg-destructive/10 text-destructive' : 'bg-secondary/10 text-secondary'}`}>
                                        {syncStatus?.isRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : syncStatus?.lastError ? <ShieldCheck className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground">
                                            {syncStatus?.isRunning ? 'Sinkronisasi sedang berjalan' : syncStatus?.lastError ? 'Sinkronisasi gagal' : 'Sinkronisasi terakhir selesai'}
                                        </p>
                                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                            {syncStatus?.isRunning ? '' : syncStatus?.lastError ? syncStatus.lastError : syncStatus?.lastResult ? `Berhasil memproses ${syncStatus.lastResult.uniqueRows.toLocaleString('id-ID')} data.` : 'Belum ada status sync yang tercatat.'}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                            {syncStatus?.startedAt && <span>Mulai: {new Date(syncStatus.startedAt).toLocaleString('id-ID')}</span>}
                                            {syncStatus?.finishedAt && <span>Selesai: {new Date(syncStatus.finishedAt).toLocaleString('id-ID')}</span>}
                                            {syncStatus?.lastResult?.processedRows !== undefined && <span>Diproses: {syncStatus.lastResult.processedRows.toLocaleString('id-ID')}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                )}
            </Card>

            <EditKpsModal
                isOpen={Boolean(editingKps)}
                kps={editingKps}
                onClose={() => setEditingKps(null)}
                onSaved={handleKpsSaved}
            />
        </div>
    );
};
