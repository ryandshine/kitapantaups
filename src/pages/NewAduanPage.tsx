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

interface FormData {
    skema: string;
    kategoriMasalah: string;
    lokasi: {
        balaiId: string;
        balaiName: string;
        provinsi: string;
        kabupaten: string;
        kecamatan: string;
        desa: string;
        luasHa: number;
    };
    pengadu: {
        nama: string;
        telepon: string;
        email: string;
        instansi: string;
    };
    suratMasuk: {
        nomorSurat: string;
        tanggalSurat: string;
        perihal: string;
        asalSurat: string;
        asalSuratKategori: string;
    };
    jumlahKK: number;
    ringkasanMasalah: string;
}

const resolveKpsType = (kps: KpsData) => [kps.skema, kps.kps_type, kps.jenis_kps]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0) || '';

const getKpsDisplayId = (kps: KpsData) => kps.id || '-';
const getKpsDisplayName = (kps: KpsData) => kps.nama_lembaga || kps.nama_kps || kps.NAMA_KPS || '-';
const getKpsDisplaySk = (kps: KpsData) => kps.surat_keputusan || kps.nomor_sk || kps.NO_SK || '-';
const getKpsDisplayProvinsi = (kps: KpsData) => kps.provinsi || kps.lokasi_prov || kps.PROVINSI || '-';
const getKpsDisplayKabupaten = (kps: KpsData) => kps.kabupaten || kps.lokasi_kab || kps.KAB_KOTA || '-';
const getKpsDisplayLuas = (kps: KpsData) => Number(kps.luas_total || kps.lokasi_luas_ha || kps.LUAS_SK || 0);
const getKpsDisplayAnggotaPria = (kps: KpsData) => Number(kps.anggota_pria || 0);
const getKpsDisplayAnggotaWanita = (kps: KpsData) => Number(kps.anggota_wanita || 0);
const getKpsDisplayKK = (kps: KpsData) =>
    Number(
        kps.jumlah_anggota
        || kps.jumlah_kk
        || kps.JML_KK
        || (Number(kps.anggota_pria || 0) + Number(kps.anggota_wanita || 0))
        || 0
    );

const getKpsDisplayTotalKK = (kpsList: KpsData[]) =>
    kpsList.reduce((sum, item) => sum + getKpsDisplayKK(item), 0);

const getKpsDisplayTotalLuas = (kpsList: KpsData[]) =>
    kpsList.reduce((sum, item) => sum + getKpsDisplayLuas(item), 0);

const getKpsDisplayTotalAnggotaPria = (kpsList: KpsData[]) =>
    kpsList.reduce((sum, item) => sum + getKpsDisplayAnggotaPria(item), 0);

const getKpsDisplayTotalAnggotaWanita = (kpsList: KpsData[]) =>
    kpsList.reduce((sum, item) => sum + getKpsDisplayAnggotaWanita(item), 0);

const DEFAULT_SKEMA = 'HKm';
const DEFAULT_KATEGORI_OPTIONS = [
    { nama_kategori: 'konflik areal' },
    { nama_kategori: 'perlindungan' },
    { nama_kategori: 'dan lain-lain' }
];

const getTodayInputValue = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const summarizeSelectedKps = (kpsList: KpsData[]) => {
    const firstKps = kpsList[0];

    return {
        skema: firstKps ? resolveKpsType(firstKps) || DEFAULT_SKEMA : DEFAULT_SKEMA,
        totalArea: getKpsDisplayTotalLuas(kpsList),
        totalKK: getKpsDisplayTotalKK(kpsList),
        lokasi: {
            provinsi: firstKps ? getKpsDisplayProvinsi(firstKps) : '',
            kabupaten: firstKps ? getKpsDisplayKabupaten(firstKps) : '',
            kecamatan: firstKps?.lokasi_kec || '',
            desa: firstKps?.lokasi_desa || ''
        }
    };
};

const normalizeSelectedKps = (kps: KpsData): KpsData => ({
    ...kps,
    id: String(kps.id || ''),
    nama_lembaga: kps.nama_lembaga || kps.nama_kps || '',
    surat_keputusan: kps.surat_keputusan || kps.nomor_sk || '',
    skema: kps.skema || kps.kps_type || kps.jenis_kps || '',
    provinsi: kps.provinsi || kps.lokasi_prov || '',
    kabupaten: kps.kabupaten || kps.lokasi_kab || '',
    kecamatan: kps.kecamatan || kps.lokasi_kec || '',
    desa: kps.desa || kps.lokasi_desa || '',
    luas_total: Number(kps.luas_total ?? kps.lokasi_luas_ha ?? 0) || 0,
    jumlah_anggota: Number(kps.jumlah_anggota ?? kps.jumlah_kk ?? ((Number(kps.anggota_pria || 0) + Number(kps.anggota_wanita || 0)))) || 0,
    nama_kps: kps.nama_kps || kps.nama_lembaga || '',
    jenis_kps: kps.jenis_kps || kps.skema || '',
    nomor_sk: kps.nomor_sk || kps.surat_keputusan || '',
    lokasi_prov: kps.lokasi_prov || kps.provinsi || '',
    lokasi_kab: kps.lokasi_kab || kps.kabupaten || '',
    lokasi_kec: kps.lokasi_kec || kps.kecamatan || '',
    lokasi_desa: kps.lokasi_desa || kps.desa || '',
    lokasi_luas_ha: Number(kps.lokasi_luas_ha ?? kps.luas_total ?? 0) || 0,
    jumlah_kk: Number(kps.jumlah_kk ?? kps.jumlah_anggota ?? ((Number(kps.anggota_pria || 0) + Number(kps.anggota_wanita || 0)))) || 0,
});

const extractValidKpsCoordinates = (kpsList: KpsData[]) => {
    const coordinatePairs = kpsList
        .map((kps) => {
            const lat = typeof kps.lat === 'number' && Number.isFinite(kps.lat) ? kps.lat : null;
            const lng = typeof kps.lng === 'number' && Number.isFinite(kps.lng) ? kps.lng : null;
            return lat !== null && lng !== null ? { lat, lng } : null;
        })
        .filter((pair): pair is { lat: number; lng: number } => pair !== null);

    return {
        lokasi_lat: coordinatePairs.length > 0 ? coordinatePairs.map((pair) => String(pair.lat)) : undefined,
        lokasi_lng: coordinatePairs.length > 0 ? coordinatePairs.map((pair) => String(pair.lng)) : undefined,
    };
};

const buildSelectedFileStates = (files: Array<Pick<File, 'name'>>): FileUploadItemState[] =>
    files.map((file) => ({
        fileName: file.name,
        status: 'selected',
    }));

const updateFileStatusAt = (
    previous: FileUploadItemState[],
    files: Array<Pick<File, 'name'>>,
    index: number,
    patch: Partial<FileUploadItemState>
): FileUploadItemState[] => {
    const next = files.map((file, fileIndex) => previous[fileIndex] || {
        fileName: file.name,
        status: 'selected' as const,
    });

    if (!next[index]) return next;
    next[index] = {
        ...next[index],
        ...patch,
        fileName: files[index]?.name || next[index].fileName,
    };
    return next;
};

const removeKpsFromSelection = (
    selectedList: KpsData[],
    removedId: string,
    selectedKps: KpsData | null,
    setSelectedKpsList: React.Dispatch<React.SetStateAction<KpsData[]>>,
    setSelectedKps: React.Dispatch<React.SetStateAction<KpsData | null>>,
    setFormData: React.Dispatch<React.SetStateAction<FormData>>
) => {
    const newList = selectedList.filter((item) => item.id !== removedId);
    setSelectedKpsList(newList);

    if (selectedKps?.id === removedId) {
        setSelectedKps(newList[newList.length - 1] || null);
    }

    const kpsSummary = summarizeSelectedKps(newList);
    setFormData((prev) => ({
        ...prev,
        skema: kpsSummary.skema,
        jumlahKK: kpsSummary.totalKK,
        lokasi: {
            ...prev.lokasi,
            provinsi: kpsSummary.lokasi.provinsi,
            kabupaten: kpsSummary.lokasi.kabupaten,
            kecamatan: kpsSummary.lokasi.kecamatan,
            desa: kpsSummary.lokasi.desa,
            luasHa: kpsSummary.totalArea
        }
    }));
};

export const NewAduanPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isCompact } = useUIDensity();

    // Master data state
    const [kategoriOptions, setKategoriOptions] = useState<any[]>([]);

    const categorySortOrder = [
        'konflik areal',
        'perlindungan',
        'dan lain-lain'
    ];

    const sortCategories = (options: any[]) => {
        return [...options].sort((a, b) => {
            const indexA = categorySortOrder.indexOf(a.nama_kategori);
            const indexB = categorySortOrder.indexOf(b.nama_kategori);

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.nama_kategori.localeCompare(b.nama_kategori);
        });
    };

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
                setKategoriOptions(categories as any);
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


    const [formData, setFormData] = useState<FormData>({
        skema: 'HKm',
        kategoriMasalah: '',
        lokasi: {
            balaiId: '',
            balaiName: '',
            provinsi: '',
            kabupaten: '',
            kecamatan: '',
            desa: '',
            luasHa: 0
        },
        pengadu: {
            nama: '',
            telepon: '',
            email: '',
            instansi: ''
        },
        suratMasuk: {
            nomorSurat: '',
            tanggalSurat: getTodayInputValue(),
            perihal: '',
            asalSurat: 'Masyarakat',
            asalSuratKategori: 'Masyarakat'
        },
        jumlahKK: 0,
        ringkasanMasalah: ''
    });


    const handleSuratChange = (field: string, value: any) => {
        setFormData((prev: FormData) => ({
            ...prev,
            suratMasuk: {
                ...prev.suratMasuk,
                [field]: value
            }
        }));
    };

    const handlePengaduChange = (field: string, value: any) => {
        setFormData((prev: FormData) => ({
            ...prev,
            pengadu: {
                ...prev.pengadu,
                [field]: value
            }
        }));
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData((prev: FormData) => ({ ...prev, [field]: value }));
    };

    const handleKpsSelect = (kps: KpsData) => {
        const normalizedKps = normalizeSelectedKps(kps);
        // Prevent duplicates
        if (selectedKpsList.some(item => item.id === normalizedKps.id)) return;

        // 1. Initial State
        const newKps = { ...normalizedKps };
        const newList = [...selectedKpsList, newKps];
        const kpsSummary = summarizeSelectedKps(newList);
        setSelectedKpsList(newList);
        setSelectedKps(newKps);

        setFormData(prev => ({
            ...prev,
            skema: kpsSummary.skema,
            lokasi: {
                ...prev.lokasi,
                provinsi: kpsSummary.lokasi.provinsi,
                kabupaten: kpsSummary.lokasi.kabupaten,
                kecamatan: kpsSummary.lokasi.kecamatan,
                desa: kpsSummary.lokasi.desa,
                luasHa: kpsSummary.totalArea
            },
            jumlahKK: kpsSummary.totalKK
        }));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;


        setIsSubmitting(true);
        setFormError(null);
        try {
            const trimmedEmail = formData.pengadu.email.trim();
            if (!formData.suratMasuk.nomorSurat.trim()) {
                throw new Error('Nomor surat wajib diisi.');
            }
            if (!formData.suratMasuk.tanggalSurat) {
                throw new Error('Tanggal surat wajib diisi.');
            }
            if (!formData.pengadu.nama.trim()) {
                throw new Error('Nama pengadu wajib diisi.');
            }
            if (selectedKpsList.length === 0) {
                throw new Error('Pilih minimal satu KPS sebelum menyimpan aduan.');
            }
            if (!formData.ringkasanMasalah.trim()) {
                throw new Error('Ringkasan masalah wajib diisi.');
            }
            if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
                throw new Error('Format email pengadu tidak valid.');
            }

            // Sequential Process:
            // 1. Prepare Payload Mapper
            const { lokasi_lat, lokasi_lng } = extractValidKpsCoordinates(selectedKpsList);
            const dbPayload = {
                surat_nomor: formData.suratMasuk.nomorSurat,
                surat_tanggal: formData.suratMasuk.tanggalSurat,
                surat_asal_perihal: formData.suratMasuk.perihal,
                pengadu_nama: formData.pengadu.nama,
                pengadu_telepon: formData.pengadu.telepon,
                pengadu_email: trimmedEmail || undefined,
                pengadu_instansi: formData.pengadu.instansi,
                kategori_masalah: formData.kategoriMasalah,
                ringkasan_masalah: formData.ringkasanMasalah,
                lokasi_prov: formData.lokasi.provinsi,
                lokasi_kab: formData.lokasi.kabupaten,
                lokasi_kec: formData.lokasi.kecamatan,
                lokasi_desa: formData.lokasi.desa,
                lokasi_luas_ha: formData.lokasi.luasHa,
                jumlah_kk: formData.jumlahKK,
                lokasi_lat,
                lokasi_lng,
                status: 'baru',
                kps_ids: selectedKpsList.map(k => String(k.id))
            };

            // 2. Call Sequential Service
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
        } catch (err: any) {
            console.error('Submission failed:', err);
            setFormError(`Gagal menyimpan aduan: ${err.message}`);
            setFeedback({ type: 'error', message: `Gagal menyimpan aduan: ${err.message}` });
        } finally {
            if (suratFiles.length === 0) {
                setDocUploadProgress(0);
                setSuratFileStatuses([]);
            }
            setIsSubmitting(false);
        }
    };



    return (
        <div className={cn("flex flex-col pb-20 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700", isCompact ? "gap-7" : "gap-10")}>
            {/* Page Header */}
            <div className="flex flex-col gap-6 pt-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(-1)}
                    className="-ml-3 w-fit text-muted-foreground hover:text-primary transition-colors hover:bg-transparent"
                    leftIcon={<ArrowLeft size={18} />}
                >
                    Kembali
                </Button>
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl md:text-4xl font-semibold tracking-tight text-foreground flex items-center gap-3">
                        Input Aduan Baru
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                        Lengkapi formulir di bawah untuk mendaftarkan pengaduan baru ke dalam sistem.
                    </p>
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

            <form onSubmit={handleSubmit} className={cn("flex flex-col", isCompact ? "gap-7" : "gap-10")}>
                <div className={cn("grid grid-cols-1", isCompact ? "gap-7" : "gap-10")}>
                    {/* 1. Data Surat Masuk */}
                    <Card className="apple-card overflow-hidden">
                        <CardHeader className="bg-secondary/30 border-b border-border/50 pb-6">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
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
                        <CardHeader className="bg-secondary/30 border-b border-border/50 pb-6">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
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
                        <CardHeader className="bg-secondary/30 border-b border-border/50 pb-6">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <MapPin size={20} />
                                </div>
                                Lokasi Objek Konflik / Pengaduan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className={cn(isCompact ? "pt-5 px-5" : "pt-8 px-8")}>
                            <div className={cn("bg-primary/[0.03] border border-primary/10 rounded-2xl", isCompact ? "mb-5 p-4 space-y-4" : "mb-8 p-6 space-y-6")}>
                                <KpsSearch onSelect={handleKpsSelect} />

                                {selectedKps && (
                                    <div className="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/80">KPS Terpilih</p>
                                                <h4 className="mt-1 text-sm font-semibold text-foreground break-words">{getKpsDisplayName(selectedKps)}</h4>
                                                <p className="mt-1 text-xs text-muted-foreground break-words">
                                                    {getKpsDisplayKabupaten(selectedKps)}, {getKpsDisplayProvinsi(selectedKps)}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
                                                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                                                    id: {getKpsDisplayId(selectedKps)}
                                                </span>
                                                <span className="rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
                                                    skema: {resolveKpsType(selectedKps) || DEFAULT_SKEMA}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-foreground sm:grid-cols-2 xl:grid-cols-4">
                                            <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">surat_keputusan</p>
                                                <p className="mt-1 break-words">{getKpsDisplaySk(selectedKps)}</p>
                                            </div>
                                            <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">luas_total</p>
                                                <p className="mt-1">{getKpsDisplayLuas(selectedKps).toLocaleString('id-ID')} Ha</p>
                                            </div>
                                            <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">anggota_pria</p>
                                                <p className="mt-1">{getKpsDisplayAnggotaPria(selectedKps).toLocaleString('id-ID')}</p>
                                            </div>
                                            <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
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
                                                className="flex items-center gap-2 bg-white border border-border pl-3 pr-1 py-1 rounded-full shadow-sm animate-in zoom-in-95 duration-200"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-semibold leading-none text-foreground">{getKpsDisplayName(kps)}</span>
                                                    <span className="text-[8px] text-muted-foreground">{getKpsDisplaySk(kps)}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        removeKpsFromSelection(
                                                            selectedKpsList,
                                                            kps.id,
                                                            selectedKps,
                                                            setSelectedKpsList,
                                                            setSelectedKps,
                                                            setFormData
                                                        );
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
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white border border-border rounded-2xl shadow-sm">
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
                                                    setFormData((prev: any) => ({
                                                        ...prev,
                                                        skema: DEFAULT_SKEMA,
                                                        jumlahKK: 0,
                                                        lokasi: {
                                                            ...prev.lokasi,
                                                            provinsi: '',
                                                            kabupaten: '',
                                                            kecamatan: '',
                                                            desa: '',
                                                            luasHa: 0
                                                        }
                                                    }));
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
                                                    className="flex flex-col bg-white border border-border/60 rounded-2xl shadow-sm overflow-hidden"
                                                >
                                                    {/* Card Header */}
                                                    <div className="p-4 bg-secondary/30 border-b border-border/50 flex items-start gap-4">
                                                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
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
                                                                removeKpsFromSelection(
                                                                    selectedKpsList,
                                                                    kps.id,
                                                                    selectedKps,
                                                                    setSelectedKpsList,
                                                                    setSelectedKps,
                                                                    setFormData
                                                                );
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
                        <CardHeader className="bg-secondary/30 border-b border-border/50 pb-6">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <AlertCircle size={20} />
                                </div>
                                Substansi Perkara
                            </CardTitle>
                        </CardHeader>
                        <CardContent className={cn(isCompact ? "pt-5 px-5" : "pt-8 px-8")}>
                            <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", isCompact ? "gap-4" : "gap-6")}>
                                <Select
                                    label="Kategori Masalah"
                                    options={kategoriOptions.length > 0 ? sortCategories(kategoriOptions).map(cat => ({
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
