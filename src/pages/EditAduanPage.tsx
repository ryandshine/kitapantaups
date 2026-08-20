import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, FileText, Sparkles, Trash2, User } from 'lucide-react';
import {
    Badge,
    Button,
    FeedbackBanner,
    FileUpload,
    Input,
    KpsSearch,
    Select,
    Textarea,
    type FileUploadItemState,
} from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { AduanReferenceService } from '../lib/aduan.references';
import { AduanService } from '../lib/aduan.service';
import { KpsService } from '../lib/kps.service';
import { useAduanByTicket, useUpdateAduan } from '../hooks/useAduan';
import type { KpsData, User as AppUser } from '../types';
import {
    buildEditAduanForm,
    buildEditAduanUpdatePayload,
    buildEditFormFromSelectedKps,
    buildSelectedUploadStates,
    buildStoredUploadState,
    detailLabelClass,
    getDisplayedKpsId,
    getNormalizedKpsId,
    resolveKpsType,
    normalizeSelectedKps,
    type EditAduanForm,
    updateUploadStatusAt,
} from '../features/aduan-detail/utils';

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

type Feedback = { type: 'success' | 'error' | 'info'; message: string } | null;

export const EditAduanPage: React.FC = () => {
    const navigate = useNavigate();
    const { nomorTiket } = useParams<{ nomorTiket: string }>();
    const { user, isAdmin } = useAuth();
    const { data: aduan, isLoading, isError } = useAduanByTicket(nomorTiket);
    const updateAduan = useUpdateAduan();

    const [editForm, setEditForm] = useState<EditAduanForm>(buildEditAduanForm());
    const [selectedKps, setSelectedKps] = useState<KpsData[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [suratFile, setSuratFile] = useState<File | null>(null);
    const [suratUploadProgress, setSuratUploadProgress] = useState(0);
    const [suratFileStatuses, setSuratFileStatuses] = useState<FileUploadItemState[]>([]);
    const [feedback, setFeedback] = useState<Feedback>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const picOptions = useMemo(
        () => [
            { value: '__none__', label: '-- Pilih PIC --' },
            ...users.map((item) => ({ value: item.id, label: item.displayName || item.email })),
        ],
        [users]
    );

    const emailError = useMemo(() => {
        if (!editForm.pengaduEmail) return undefined;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.pengaduEmail)
            ? undefined
            : 'Format email tidak valid';
    }, [editForm.pengaduEmail]);

    useEffect(() => {
        if (!aduan) return;

        const baseForm = buildEditAduanForm(aduan);
        setEditForm({
            ...baseForm,
            picName: !isAdmin ? (user?.displayName || user?.email || '') : baseForm.picName,
            picId: !isAdmin ? (user?.id || '') : baseForm.picId,
        });

        const fallbackList: KpsData[] = Array.isArray(aduan.kps_items) && aduan.kps_items.length > 0
            ? aduan.kps_items.map((item) => normalizeSelectedKps(item))
            : (((aduan.kps_ids && aduan.kps_ids.length > 0)
                ? aduan.kps_ids
                : (aduan.kpsId ? [aduan.kpsId] : [])) as string[]).map((id, index) => normalizeSelectedKps({
                id,
                nama_lembaga: aduan.nama_kps?.[index] || '-',
                skema: aduan.jenis_kps?.[index] || aduan.type_kps?.[index] || '-',
                surat_keputusan: aduan.nomor_sk?.[index] || '-',
                lokasi_prov: aduan.lokasi?.provinsi || '',
                lokasi_kab: aduan.lokasi?.kabupaten || '',
                lokasi_kec: aduan.lokasi?.kecamatan || '',
                lokasi_desa: aduan.lokasi?.desa || '',
                lokasi_luas_ha: Number(aduan.lokasi?.luasHa ?? aduan.lokasi_luas_ha ?? 0),
                jumlah_kk: Number(aduan.jumlahKK ?? aduan.jumlah_kk ?? 0),
                kps_type: aduan.type_kps?.[index] || aduan.jenis_kps?.[index] || '-',
            }));

        setSelectedKps(fallbackList);
        const selectedIds = fallbackList.map(getNormalizedKpsId).filter(Boolean);
        if (selectedIds.length > 0) {
            Promise.all(selectedIds.map((id) => KpsService.getKpsById(id)))
                .then((items) => setSelectedKps(items.map((item, index) => normalizeSelectedKps(item || fallbackList[index]))))
                .catch(() => setSelectedKps(fallbackList));
        }

        const fileName = baseForm.fileUrl?.split('/').pop()?.split('?')[0];
        setSuratFileStatuses(fileName ? buildStoredUploadState(fileName) : []);
    }, [aduan, isAdmin, user?.displayName, user?.email, user?.id]);

    useEffect(() => {
        if (!isAdmin) return;
        setIsLoadingUsers(true);
        AduanReferenceService.getUsersByRole()
            .then(setUsers)
            .catch(() => setUsers([]))
            .finally(() => setIsLoadingUsers(false));
    }, [isAdmin]);

    useEffect(() => {
        if (!feedback) return;
        const timeout = window.setTimeout(() => setFeedback(null), 4500);
        return () => window.clearTimeout(timeout);
    }, [feedback]);

    const handleEditInput = (field: keyof EditAduanForm) =>
        (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const value = event.target.value;
            setEditForm((previous) => field === 'perihal' || field === 'suratPerihal'
                ? { ...previous, perihal: value, suratPerihal: value }
                : { ...previous, [field]: value });
        };

    const handleSelectKps = (kps: KpsData) => {
        const normalized = normalizeSelectedKps(kps);
        setSelectedKps((previous) => {
            if (previous.some((item) => getNormalizedKpsId(item) === getNormalizedKpsId(normalized))) return previous;
            const next = [...previous, normalized];
            setEditForm((current) => ({ ...current, ...buildEditFormFromSelectedKps(next, current) }));
            return next;
        });
    };

    const handleRemoveKps = (kpsId: string) => {
        setSelectedKps((previous) => {
            const next = previous.filter((item) => getNormalizedKpsId(item) !== kpsId);
            setEditForm((current) => ({
                ...current,
                ...buildEditFormFromSelectedKps(next, current, { clearLocationWhenEmpty: true }),
            }));
            return next;
        });
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!aduan || !user) return;
        if (emailError) return setFeedback({ type: 'info', message: emailError });
        if (!editForm.pengaduNama.trim()) return setFeedback({ type: 'info', message: 'Nama pengadu wajib diisi.' });
        if (!editForm.perihal.trim()) return setFeedback({ type: 'info', message: 'Perihal aduan wajib diisi.' });

        setIsSubmitting(true);
        try {
            let suratFileUrl = editForm.fileUrl;
            if (suratFile) {
                setSuratFileStatuses((previous) => updateUploadStatusAt(previous, [suratFile], 0, { status: 'uploading', progress: 0 }));
                suratFileUrl = await AduanService.uploadSuratMasuk(suratFile, aduan.id, (progress) => {
                    setSuratUploadProgress(progress);
                    setSuratFileStatuses((previous) => updateUploadStatusAt(previous, [suratFile], 0, { status: 'uploading', progress }));
                });
                setSuratFileStatuses((previous) => updateUploadStatusAt(previous, [suratFile], 0, {
                    status: 'success', progress: 100, message: 'Berhasil diunggah ke server',
                }));
            }

            const updateData = buildEditAduanUpdatePayload({
                aduan,
                editForm,
                editSelectedKpsList: selectedKps,
                updatedBy: user.id,
                updatedByName: user.displayName,
                suratFileUrl,
            });

            await updateAduan.mutateAsync({ id: aduan.id, data: updateData });
            navigate(`/pengaduan/${nomorTiket}`, { replace: true });
        } catch (error) {
            setFeedback({ type: 'error', message: `Gagal menyimpan perubahan: ${getErrorMessage(error, 'Error tidak diketahui')}` });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Memuat data aduan...</div>;
    }

    if (isError || !aduan) {
        return (
            <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center text-center">
                <p className="text-lg font-semibold text-foreground">Aduan tidak ditemukan</p>
                <p className="mt-2 text-sm text-muted-foreground">Data yang ingin diedit tidak dapat dimuat.</p>
                <Button className="mt-6" onClick={() => navigate(-1)}>Kembali</Button>
            </div>
        );
    }

    const SectionHeading = ({ number, eyebrow, title, icon }: { number: string; eyebrow: string; title: string; icon?: React.ReactNode }) => (
        <div className="lg:pr-6">
            <p className="font-mono text-xs font-semibold tracking-[0.2em] text-primary">{number}</p>
            <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
            <h2 className="mt-2 flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">{icon}{title}</h2>
        </div>
    );

    return (
        <div className="mx-auto max-w-6xl pb-28">
            <header className="border-b border-border/70 pb-7 pt-2">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-3 mb-5 text-muted-foreground hover:bg-transparent hover:text-primary" leftIcon={<ArrowLeft size={17} />}>
                            Kembali ke detail aduan
                        </Button>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-primary">Layanan Aduan · Edit</p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Edit Data Aduan</h1>
                        <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">Perbarui informasi inti aduan tanpa mengubah riwayat penanganan.</p>
                    </div>
                    <div className="pt-12 text-left sm:text-right">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Nomor aduan</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-foreground">{aduan.nomorTiket}</p>
                    </div>
                </div>
            </header>

            {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} className="mt-6 rounded-lg shadow-none" />}

            <form onSubmit={handleSubmit} className="mt-8">
                <div className="divide-y divide-border/70 border-y border-border/70">
                    <section className="grid gap-7 py-9 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
                        <SectionHeading number="01" eyebrow="Ringkasan" title="Informasi inti aduan" icon={<FileText size={17} className="text-primary" />} />
                        <div className="space-y-5">
                            <Input label="Perihal / Judul Aduan" value={editForm.perihal} onChange={handleEditInput('perihal')} required fullWidth />
                            <Textarea label="Ringkasan Masalah" value={editForm.ringkasanMasalah} onChange={handleEditInput('ringkasanMasalah')} rows={6} fullWidth />
                        </div>
                    </section>

                    <section className="grid gap-7 py-9 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
                        <SectionHeading number="02" eyebrow="Kelompok / KPS" title="Identitas kelompok" icon={<Sparkles size={17} className="text-primary" />} />
                        <div>
                            <KpsSearch onSelect={handleSelectKps} placeholder="Ketik id, nama lembaga, atau surat keputusan..." />
                            <p className="mt-2 text-xs text-muted-foreground">Cari dan pilih data Master KPS. Dapat memilih lebih dari satu.</p>
                            {selectedKps.length > 0 && (
                                <div className="mt-6 border-t border-border/70">
                                    <div className="flex flex-wrap gap-x-6 gap-y-3 border-b border-border/70 py-4 text-sm">
                                        <span><strong className="mr-1 text-lg tabular-nums text-foreground">{selectedKps.length}</strong><span className="text-muted-foreground">KPS</span></span>
                                        <span><strong className="mr-1 text-lg tabular-nums text-foreground">{selectedKps.reduce((sum, item) => sum + (Number(item.luas_total ?? item.lokasi_luas_ha) || 0), 0).toLocaleString('id-ID')}</strong><span className="text-muted-foreground">Ha total</span></span>
                                        <span><strong className="mr-1 text-lg tabular-nums text-foreground">{selectedKps.reduce((sum, item) => sum + (Number(item.anggota_pria) || 0), 0).toLocaleString('id-ID')}</strong><span className="text-muted-foreground">anggota pria</span></span>
                                        <span><strong className="mr-1 text-lg tabular-nums text-foreground">{selectedKps.reduce((sum, item) => sum + (Number(item.anggota_wanita) || 0), 0).toLocaleString('id-ID')}</strong><span className="text-muted-foreground">anggota wanita</span></span>
                                    </div>
                                    {selectedKps.map((kps) => {
                                        const kpsId = getNormalizedKpsId(kps);
                                        return (
                                            <div key={kpsId || kps.nama_kps} className="border-b border-border/70 py-5 last:border-b-0">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <p className="break-words text-sm font-semibold text-foreground">{kps.nama_lembaga || kps.nama_kps || '-'}</p>
                                                        <p className="mt-1 text-xs text-muted-foreground">{kps.surat_keputusan || kps.nomor_sk || '-'} · {kps.skema || resolveKpsType(kps) || '-'}</p>
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveKps(kpsId)} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><Trash2 size={13} /> Hapus</button>
                                                </div>
                                                <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
                                                    {[
                                                        ['id', getDisplayedKpsId(kps)],
                                                        ['nama_lembaga', kps.nama_lembaga || kps.nama_kps || '-'],
                                                        ['surat_keputusan', kps.surat_keputusan || kps.nomor_sk || '-'],
                                                        ['skema', kps.skema || resolveKpsType(kps) || '-'],
                                                        ['provinsi', kps.provinsi || kps.lokasi_prov || '-'],
                                                        ['kabupaten', kps.kabupaten || kps.lokasi_kab || '-'],
                                                    ].map(([label, value]) => <div key={label} className="min-w-0"><span className={detailLabelClass}>{label}</span><p className="mt-1 break-words text-xs text-foreground">{value}</p></div>)}
                                                    <div><span className={detailLabelClass}>luas_total</span><div className="mt-1"><Badge variant="outline">{(Number(kps.luas_total ?? kps.lokasi_luas_ha ?? 0) || 0).toLocaleString('id-ID')} Ha</Badge></div></div>
                                                    <div><span className={detailLabelClass}>anggota</span><p className="mt-1 text-xs text-foreground">{(Number(kps.jumlah_anggota ?? kps.jumlah_kk ?? 0) || 0).toLocaleString('id-ID')}</p></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="grid gap-7 py-9 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
                        <SectionHeading number="03" eyebrow="Pengadu & PIC" title="Pihak terkait" icon={<User size={17} className="text-primary" />} />
                        <div className="space-y-5">
                            {isAdmin && <Select label="PIC (Penanggung Jawab)" options={picOptions} value={editForm.picId || '__none__'} onChange={(value) => { const selected = users.find((item) => item.id === (value === '__none__' ? '' : value)); setEditForm((previous) => ({ ...previous, picId: value === '__none__' ? '' : value, picName: selected?.displayName || selected?.email || '' })); }} fullWidth disabled={isLoadingUsers} />}
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Input label="Nama Pengadu / Kelompok" value={editForm.pengaduNama} onChange={handleEditInput('pengaduNama')} required fullWidth />
                                <Input label="Lembaga / Kelompok Pengadu" value={editForm.pengaduInstansi} onChange={handleEditInput('pengaduInstansi')} placeholder="Contoh: KTH Wana Makmur" fullWidth />
                                <Input label="Nomor Telepon" value={editForm.pengaduTelepon} onChange={handleEditInput('pengaduTelepon')} fullWidth />
                                <Input label="Email Pengadu" value={editForm.pengaduEmail} onChange={handleEditInput('pengaduEmail')} placeholder="nama@email.com" error={emailError} fullWidth />
                            </div>
                            {selectedKps.length === 0 && <div className="grid gap-5 sm:grid-cols-2"><Input label="Desa" value={editForm.lokasiDesa} onChange={handleEditInput('lokasiDesa')} fullWidth /><Input label="Kecamatan" value={editForm.lokasiKecamatan} onChange={handleEditInput('lokasiKecamatan')} fullWidth /></div>}
                        </div>
                    </section>

                    <section className="grid gap-7 py-9 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
                        <SectionHeading number="04" eyebrow="Administrasi" title="Dokumen surat" icon={<FileText size={17} className="text-primary" />} />
                        <div className="space-y-5">
                            <Input label="Perihal Surat" value={editForm.suratPerihal || ''} onChange={handleEditInput('suratPerihal')} placeholder="Masukkan perihal surat..." fullWidth />
                            <FileUpload onFileSelected={(files) => { const file = files[0] || null; setSuratFile(file); setSuratUploadProgress(0); setSuratFileStatuses(file ? buildSelectedUploadStates([file]) : []); }} onFileRemoved={() => { setSuratFile(null); setSuratFileStatuses([]); setSuratUploadProgress(0); }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" maxSizeMB={10} helperText="Opsional. Unggah surat masuk terbaru jika perlu mengganti dokumen tersimpan." uploadProgress={suratUploadProgress} />
                            {suratFileStatuses.length > 0 && <div className="space-y-2 text-xs text-muted-foreground">{suratFileStatuses.map((item) => <div key={item.fileName} className="flex items-center justify-between gap-3 border-b border-border/70 py-2"><span className="truncate">{item.fileName}</span><span className="shrink-0">{item.status === 'success' ? 'Tersimpan' : item.status === 'uploading' ? `${item.progress || 0}%` : 'Dipilih'}</span></div>)}</div>}
                        </div>
                    </section>
                </div>

                <div className="sticky bottom-0 z-10 -mx-4 mt-0 flex flex-col-reverse gap-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-end sm:px-6 lg:-mx-8 lg:px-8">
                    <Button type="button" variant="ghost" onClick={() => navigate(-1)} className="w-full sm:w-auto">Batal</Button>
                    <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<CheckCircle size={18} />} className="w-full sm:w-auto">Simpan Perubahan</Button>
                </div>
            </form>
        </div>
    );
};
