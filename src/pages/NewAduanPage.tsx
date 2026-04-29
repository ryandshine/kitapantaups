import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, MapPin, User, AlertCircle, Save, X, Info } from 'lucide-react';
import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Input,
    Select,
    Textarea,
    FileUpload,
    FeedbackBanner,
    type FileUploadItemState
} from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { AduanService } from '../lib/aduan.service';
import { MasterDataService } from '../lib/master.service';
import { KpsSearch } from '../components/ui/KpsSearch';
import { type KpsData } from '../types';
import { cn } from '../lib/utils';
import { useUIDensity } from '../hooks/useUIDensity';
import {
    applySelectedKpsToForm,
    buildCreateAduanPayload,
    buildSelectedFileStates,
    createInitialNewAduanFormData,
    DEFAULT_KATEGORI_OPTIONS,
    DEFAULT_SKEMA,
    getKpsDisplayAnggotaPria,
    getKpsDisplayAnggotaWanita,
    getKpsDisplayId,
    getKpsDisplayKabupaten,
    getKpsDisplayName,
    getKpsDisplayProvinsi,
    getKpsDisplaySk,
    getKpsDisplayLuas,
    getKpsDisplayTotalAnggotaPria,
    getKpsDisplayTotalAnggotaWanita,
    getKpsDisplayTotalLuas,
    normalizeSelectedKps,
    resetSelectedKpsFormState,
    resolveKpsType,
    sortKategoriMasalahOptions,
    type NewAduanFormData,
    updateFileStatusAt,
    validateNewAduanSubmission,
} from '../features/new-aduan/utils';

type KategoriOption = { nama_kategori: string };

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

export const NewAduanPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isCompact } = useUIDensity();

    // Master data state
    const [kategoriOptions, setKategoriOptions] = useState<KategoriOption[]>([]);

    const categorySortOrder = [
        'konflik areal',
        'perlindungan',
        'dan lain-lain'
    ];

    const [selectedKpsList, setSelectedKpsList] = useState<KpsData[]>([]);
    const [selectedKps, setSelectedKps] = useState<KpsData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formError, setFormError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    // Fetch master data on mount
    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [, categories] = await Promise.all([
                    MasterDataService.getStatusLayanan(),
                    MasterDataService.getKategoriMasalah()
                ]);
                setKategoriOptions((categories || []) as KategoriOption[]);
            } catch (err) {
                console.error('Failed to load master data:', err);
                setFormError('Gagal memuat data master.');
            }
        };
        loadMasterData();
    }, []);
    useEffect(() => {
        if (!feedback) return;
        const timeout = window.setTimeout(() => setFeedback(null), 4000);
        return () => window.clearTimeout(timeout);
    }, [feedback]);
    const [suratFiles, setSuratFiles] = useState<File[]>([]);
    const [docUploadProgress, setDocUploadProgress] = useState(0);
    const [suratFileStatuses, setSuratFileStatuses] = useState<FileUploadItemState[]>([]);


    const [formData, setFormData] = useState<NewAduanFormData>(createInitialNewAduanFormData());


    const handleSuratChange = (field: keyof NewAduanFormData['suratMasuk'], value: string) => {
        setFormData((prev: NewAduanFormData) => ({
            ...prev,
            suratMasuk: {
                ...prev.suratMasuk,
                [field]: value
            }
        }));
    };

    const handlePengaduChange = (field: keyof NewAduanFormData['pengadu'], value: string) => {
        setFormData((prev: NewAduanFormData) => ({
            ...prev,
            pengadu: {
                ...prev.pengadu,
                [field]: value
            }
        }));
    };

    const handleInputChange = (
        field: keyof Pick<NewAduanFormData, 'skema' | 'kategoriMasalah' | 'jumlahKK' | 'ringkasanMasalah'>,
        value: string | number
    ) => {
        setFormData((prev: NewAduanFormData) => ({ ...prev, [field]: value }));
    };

    const handleKpsSelect = (kps: KpsData) => {
        const normalizedKps = normalizeSelectedKps(kps);
        // Prevent duplicates
        if (selectedKpsList.some(item => item.id === normalizedKps.id)) return;

        const newKps = { ...normalizedKps };
        const newList = [...selectedKpsList, newKps];
        setSelectedKpsList(newList);
        setSelectedKps(newKps);
        setFormData((prev) => applySelectedKpsToForm(prev, newList));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSubmitting(true);
        setFormError(null);
        try {
            const { trimmedEmail } = validateNewAduanSubmission(formData, selectedKpsList);
            const dbPayload = buildCreateAduanPayload(formData, selectedKpsList, trimmedEmail);

            const result = await AduanService.createAduanWithFiles(
                dbPayload,
                selectedKpsList,
                {
                    documents: suratFiles
                },
                user.id,
                user.displayName,
                {
                    onDocumentUploadProgress: (progress) => {
                        setDocUploadProgress(progress.batchProgress);
                        setSuratFileStatuses((prev) => updateFileStatusAt(prev, suratFiles, progress.fileIndex, {
                            status: progress.status,
                            progress: progress.status === 'error' ? undefined : progress.fileProgress,
                            message: progress.errorMessage,
                        }));
                    }
                }
            );

            if (result.uploadErrors.length > 0) {
                setFeedback({
                    type: 'info',
                    message: `Aduan tersimpan, tetapi ${result.uploadErrors.length} lampiran gagal diunggah. Anda akan diarahkan ke detail aduan.`
                });
                if (result.nomorTiket) {
                    window.setTimeout(() => navigate(`/pengaduan/${result.nomorTiket}`), 1200);
                } else {
                    window.setTimeout(() => navigate('/pengaduan'), 1200);
                }
                return;
            }

            setFeedback({ type: 'success', message: 'Aduan berhasil disimpan dan sedang diproses.' });
            window.setTimeout(() => navigate('/pengaduan'), 700);
        } catch (err) {
            console.error('Submission failed:', err);
            const message = getErrorMessage(err, 'Terjadi kesalahan saat menyimpan aduan.');
            setFormError(`Gagal menyimpan aduan: ${message}`);
            setFeedback({ type: 'error', message: `Gagal menyimpan aduan: ${message}` });
        } finally {
            if (suratFiles.length === 0) {
                setDocUploadProgress(0);
                setSuratFileStatuses([]);
            }
            setIsSubmitting(false);
        }
    };



    return (
        <div className={cn("mx-auto flex max-w-5xl flex-col animate-in fade-in slide-in-from-bottom-4 pb-16 duration-700", isCompact ? "gap-5" : "gap-8")}>
            {/* Page Header */}
            <div className="flex flex-col gap-4 pt-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(-1)}
                    className="-ml-3 w-fit text-muted-foreground hover:text-primary transition-colors hover:bg-transparent"
                    leftIcon={<ArrowLeft size={18} />}
                >
                    Kembali
                </Button>
                <div className="google-hero mb-2">
                    <div className="relative z-10 flex flex-col gap-1.5">
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                            Input Aduan Baru
                        </h1>
                        <p className="max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">
                            Lengkapi formulir di bawah untuk mendaftarkan pengaduan baru ke dalam sistem.
                        </p>
                    </div>
                    <div className="google-hero-orb" />
                </div>
            </div>

            {formError && (
                <div className="bg-destructive/5 border border-destructive/20 text-destructive px-5 py-4 rounded-2xl flex items-center gap-3 animate-in shake duration-500 shadow-sm">
                    <AlertCircle size={20} />
                    <span className="font-medium">{formError}</span>
                </div>
            )}

            {feedback && (
                <FeedbackBanner
                    type={feedback.type}
                    message={feedback.message}
                    onClose={() => setFeedback(null)}
                />
            )}

            <form onSubmit={handleSubmit} className={cn("flex flex-col", isCompact ? "gap-5" : "gap-8")}>
                <div className={cn("grid grid-cols-1", isCompact ? "gap-5" : "gap-8")}>
                    {/* 1. Data Surat Masuk */}
                    <Card className="apple-card overflow-hidden">
                        <CardHeader className="page-section-header pb-6">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <div className="page-section-icon">
                                    <FileText size={20} />
                                </div>
                                Administrasi Surat Masuk
                            </CardTitle>
                        </CardHeader>
                        <CardContent className={cn(isCompact ? "pt-5 px-5" : "pt-8 px-8")}>
                            <div className={cn("grid grid-cols-1 sm:grid-cols-2", isCompact ? "gap-3" : "gap-4")}>
                                <div className="sm:col-span-2">
                                    <Input
                                        label="Nomor Surat"
                                        placeholder="Contoh: 012/EXT/XII/2025"
                                        value={formData.suratMasuk.nomorSurat}
                                        onChange={e => handleSuratChange('nomorSurat', e.target.value)}
                                        fullWidth
                                        required
                                    />
                                </div>
                                <Input
                                    type="date"
                                    label="Tanggal Surat"
                                    value={formData.suratMasuk.tanggalSurat}
                                    onChange={e => handleSuratChange('tanggalSurat', e.target.value)}
                                    fullWidth
                                    required
                                />

                                {formData.suratMasuk.asalSuratKategori && formData.suratMasuk.asalSuratKategori !== 'Masyarakat' && (
                                    <div className="sm:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Input
                                            label={`Detail Asal Surat (${formData.suratMasuk.asalSuratKategori})`}
                                            placeholder={`Masukkan nama ${formData.suratMasuk.asalSuratKategori.toLowerCase()} pengirim...`}
                                            value={formData.suratMasuk.asalSurat}
                                            onChange={e => handleSuratChange('asalSurat', e.target.value)}
                                            fullWidth
                                            required
                                        />
                                    </div>
                                )}
                                <div className="sm:col-span-2">
                                    <Input
                                        label="Perihal Surat"
                                        placeholder="Contoh: Pengaduan perusakan kawasan hutan..."
                                        value={formData.suratMasuk.perihal || ''}
                                        onChange={e => handleSuratChange('perihal', e.target.value)}
                                        fullWidth
                                    />
                                </div>
                                <div className="sm:col-span-2 space-y-2">
                                    <FileUpload
                                        label="Upload Dokumen Pendukung"
                                        helperText="Klik atau seret berkas surat masuk di sini"
                                        onFileSelected={(files) => {
                                            setSuratFiles(files);
                                            setDocUploadProgress(0);
                                            setSuratFileStatuses(buildSelectedFileStates(files));
                                        }}
                                        onFileRemoved={(idx) => {
                                            const newFiles = [...suratFiles];
                                            newFiles.splice(idx, 1);
                                            setSuratFiles(newFiles);
                                            setSuratFileStatuses((prev) => prev.filter((_, stateIdx) => stateIdx !== idx));
                                            if (newFiles.length === 0) {
                                                setDocUploadProgress(0);
                                            }
                                        }}
                                        multiple
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.zip,.shp,.dbf,.prj,.shx,.mp3,.m4a,.wav,.ogg,.aac"
                                        uploadProgress={docUploadProgress}
                                        fileStatuses={suratFileStatuses}
                                        isLoading={isSubmitting && suratFiles.length > 0 && docUploadProgress > 0 && docUploadProgress < 100}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Data Pengadu */}
                    <Card className="apple-card overflow-hidden">
                        <CardHeader className="page-section-header pb-6">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <div className="page-section-icon">
                                    <User size={20} />
                                </div>
                                Identitas Pengadu
                            </CardTitle>
                        </CardHeader>
                        <CardContent className={cn(isCompact ? "pt-5 px-5" : "pt-8 px-8")}>
                            <div className={cn("grid grid-cols-1 sm:grid-cols-2", isCompact ? "gap-4" : "gap-6")}>
                                <div className="sm:col-span-2">
                                    <Input
                                        label="Nama Pengadu"
                                        placeholder="Contoh: Bpk. Ahmad"
                                        value={formData.pengadu.nama}
                                        onChange={e => handlePengaduChange('nama', e.target.value)}
                                        fullWidth
                                        required
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <Input
                                        label="Lembaga / Kelompok Pengadu"
                                        placeholder="Contoh: KTH Wana Makmur"
                                        value={formData.pengadu.instansi || ''}
                                        onChange={e => handlePengaduChange('instansi', e.target.value)}
                                        fullWidth
                                    />
                                </div>
                                <Input
                                    label="Nomor Telepon"
                                    placeholder="0812..."
                                    value={formData.pengadu.telepon}
                                    onChange={e => handlePengaduChange('telepon', e.target.value)}
                                    fullWidth
                                />
                                <Input
                                    label="Email Pengadu"
                                    placeholder="nama@email.com"
                                    value={formData.pengadu.email || ''}
                                    onChange={e => handlePengaduChange('email', e.target.value)}
                                    error={formData.pengadu.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.pengadu.email) ? 'Format email tidak valid' : undefined}
                                    fullWidth
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Lokasi Objek */}
                    <Card className="apple-card overflow-hidden">
                        <CardHeader className="page-section-header pb-6">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <div className="page-section-icon">
                                    <MapPin size={20} />
                                </div>
                                Lokasi Objek Konflik / Pengaduan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className={cn(isCompact ? "pt-5 px-5" : "pt-8 px-8")}>
                            <div className={cn("rounded-2xl border border-border bg-muted/40", isCompact ? "mb-5 p-4 space-y-4" : "mb-8 p-6 space-y-6")}>
                                <KpsSearch onSelect={handleKpsSelect} />

                                {selectedKps && (
                                    <div className="page-filter-panel animate-in fade-in slide-in-from-top-2 p-4 duration-300">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">KPS Terpilih</p>
                                                <h4 className="mt-1 text-sm font-semibold text-foreground break-words">{getKpsDisplayName(selectedKps)}</h4>
                                                <p className="mt-1 text-xs text-muted-foreground break-words">
                                                    {getKpsDisplayKabupaten(selectedKps)}, {getKpsDisplayProvinsi(selectedKps)}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
                                                <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-foreground">
                                                    id: {getKpsDisplayId(selectedKps)}
                                                </span>
                                                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-primary">
                                                    skema: {resolveKpsType(selectedKps) || DEFAULT_SKEMA}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-foreground sm:grid-cols-2 xl:grid-cols-4">
                                            <div className="page-subpanel px-3 py-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">surat_keputusan</p>
                                                <p className="mt-1 break-words">{getKpsDisplaySk(selectedKps)}</p>
                                            </div>
                                            <div className="page-subpanel px-3 py-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">luas_total</p>
                                                <p className="mt-1">{getKpsDisplayLuas(selectedKps).toLocaleString('id-ID')} Ha</p>
                                            </div>
                                            <div className="page-subpanel px-3 py-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">anggota_pria</p>
                                                <p className="mt-1">{getKpsDisplayAnggotaPria(selectedKps).toLocaleString('id-ID')}</p>
                                            </div>
                                            <div className="page-subpanel px-3 py-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">anggota_wanita</p>
                                                <p className="mt-1">{getKpsDisplayAnggotaWanita(selectedKps).toLocaleString('id-ID')}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedKpsList.length > 0 && (
                                    <div className="flex flex-wrap gap-2 px-1">
                                        {selectedKpsList.map((kps) => (
                                            <div
                                                key={kps.id}
                                                className="flex items-center gap-2 rounded-full border border-border bg-card pl-3 pr-1 py-1 shadow-sm animate-in zoom-in-95 duration-200"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-semibold leading-none text-foreground">{getKpsDisplayName(kps)}</span>
                                                    <span className="text-[8px] text-muted-foreground">{getKpsDisplaySk(kps)}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const nextList = selectedKpsList.filter((item) => item.id !== kps.id);
                                                        setSelectedKpsList(nextList);
                                                        if (selectedKps?.id === kps.id) {
                                                            setSelectedKps(nextList[nextList.length - 1] || null);
                                                        }
                                                        setFormData((prev) => applySelectedKpsToForm(prev, nextList));
                                                    }}
                                                    className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-full transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {selectedKpsList.length > 0 && (
                                    <div className={cn("flex flex-col animate-in fade-in slide-in-from-top-4 duration-500", isCompact ? "mt-5 gap-4" : "mt-8 gap-6")}>
                                        {/* 1. Summary Header & Global Actions */}
                                        <div className="page-filter-panel flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
                                            <div className="flex flex-wrap gap-6 text-sm">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Total luas_total</span>
                                                    <span className="text-xl font-semibold text-foreground leading-none">
                                                        {getKpsDisplayTotalLuas(selectedKpsList).toLocaleString('id-ID')} <span className="text-xs font-bold text-muted-foreground">Ha</span>
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1 border-l pl-6 border-border">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Total anggota_pria</span>
                                                    <span className="text-xl font-semibold text-foreground leading-none">
                                                        {getKpsDisplayTotalAnggotaPria(selectedKpsList).toLocaleString('id-ID')}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1 border-l pl-6 border-border">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Total anggota_wanita</span>
                                                    <span className="text-xl font-semibold text-foreground leading-none">
                                                        {getKpsDisplayTotalAnggotaWanita(selectedKpsList).toLocaleString('id-ID')}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 gap-2 px-3 self-end sm:self-center"
                                                onClick={() => {
                                                    setSelectedKpsList([]);
                                                    setSelectedKps(null);
                                                    setFormData((prev) => resetSelectedKpsFormState(prev));
                                                }}
                                            >
                                                <X size={14} /> Reset Semua
                                            </Button>
                                        </div>

                                        {/* 2. Responsive KPS Cards Grid */}
                                        <div className={cn("grid grid-cols-1 lg:grid-cols-2", isCompact ? "gap-4" : "gap-6")}>
                                            {selectedKpsList.map((kps) => (
                                                <div
                                                    key={kps.id}
                                                    className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
                                                >
                                                    {/* Card Header */}
                                                    <div className="flex items-start gap-4 border-b border-border bg-muted/70 p-4">
                                                        <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                                                            <Info size={18} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-sm font-semibold text-foreground leading-tight truncate px-0">{getKpsDisplayName(kps)}</h4>
                                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-secondary rounded text-muted-foreground tracking-wider">id: {getKpsDisplayId(kps)}</span>
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-muted rounded text-foreground tracking-wider max-w-[180px] truncate">skema: {resolveKpsType(kps) || '-'}</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const nextList = selectedKpsList.filter((item) => item.id !== kps.id);
                                                                setSelectedKpsList(nextList);
                                                                if (selectedKps?.id === kps.id) {
                                                                    setSelectedKps(nextList[nextList.length - 1] || null);
                                                                }
                                                                setFormData((prev) => applySelectedKpsToForm(prev, nextList));
                                                            }}
                                                            className="ml-auto p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-full transition-colors shrink-0"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>

                                                    {/* Card Body - Mini Grid */}
                                                    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">id</p>
                                                            <p className="text-xs font-medium text-foreground leading-none break-all">{getKpsDisplayId(kps)}</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">nama_lembaga</p>
                                                            <p className="text-xs font-medium text-foreground leading-none truncate">{getKpsDisplayName(kps)}</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">surat_keputusan</p>
                                                            <p className="text-xs font-medium text-foreground leading-none truncate">{getKpsDisplaySk(kps)}</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">skema</p>
                                                            <p className="text-xs font-medium text-foreground leading-none">{resolveKpsType(kps) || '-'}</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">provinsi</p>
                                                            <p className="text-xs font-medium text-foreground leading-none">{getKpsDisplayProvinsi(kps)}</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">kabupaten</p>
                                                            <p className="text-xs font-medium text-foreground leading-none">{getKpsDisplayKabupaten(kps)}</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">luas_total</p>
                                                            <p className="text-xs font-medium text-foreground leading-none">{getKpsDisplayLuas(kps).toLocaleString('id-ID')} Ha</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">anggota_pria</p>
                                                            <p className="text-xs font-medium text-foreground leading-none">{getKpsDisplayAnggotaPria(kps).toLocaleString('id-ID')}</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">anggota_wanita</p>
                                                            <p className="text-xs font-medium text-foreground leading-none">{getKpsDisplayAnggotaWanita(kps).toLocaleString('id-ID')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                    </div>
                                )}
                            </div>

                        </CardContent>
                    </Card>

                    {/* 4. Substansi Aduan */}
                    <Card className="apple-card overflow-hidden">
                        <CardHeader className="page-section-header pb-6">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <div className="page-section-icon">
                                    <AlertCircle size={20} />
                                </div>
                                Substansi Perkara
                            </CardTitle>
                        </CardHeader>
                        <CardContent className={cn(isCompact ? "pt-5 px-5" : "pt-8 px-8")}>
                            <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", isCompact ? "gap-4" : "gap-6")}>
                                <Select
                                    label="Kategori Masalah"
                                    options={kategoriOptions.length > 0 ? sortKategoriMasalahOptions(kategoriOptions, categorySortOrder).map(cat => ({
                                        value: cat.nama_kategori,
                                        label: cat.nama_kategori
                                    })) : DEFAULT_KATEGORI_OPTIONS.map((cat) => ({
                                        value: cat.nama_kategori,
                                        label: cat.nama_kategori
                                    }))}
                                    value={formData.kategoriMasalah}
                                    onChange={val => handleInputChange('kategoriMasalah', val)}
                                    fullWidth
                                />

                                <div className="sm:col-span-2 lg:col-span-3">
                                    <Textarea
                                        label="Ringkasan Masalah (Detail)"
                                        placeholder="Jelaskan secara detail kronologi atau inti permasalahan yang diadukan..."
                                        value={formData.ringkasanMasalah}
                                        onChange={e => handleInputChange('ringkasanMasalah', e.target.value)}
                                        fullWidth
                                        rows={6}
                                        required
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card >
                </div >

                <div className={cn("flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 border-t", isCompact ? "pt-4" : "pt-6")}>
                    <Button
                        type="button"
                        variant="ghost"
                        size={isCompact ? "default" : "lg"}
                        onClick={() => navigate(-1)}
                        className="w-full sm:w-auto"
                    >
                        Batal
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        size={isCompact ? "default" : "lg"}
                        leftIcon={<Save size={18} />}
                        isLoading={isSubmitting}
                        className="px-8 w-full sm:w-auto"
                    >
                        Simpan Aduan
                    </Button>
                </div>
            </form >
        </div >
    );
};
