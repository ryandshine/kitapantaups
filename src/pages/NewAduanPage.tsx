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
    FileUpload
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
        tanggalSurat: Date;
        perihal: string;
        asalSurat: string;
        asalSuratKategori: string;
    };
    jumlahKK: number;
    ringkasanMasalah: string;
}

export const NewAduanPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { density, setDensity, isCompact } = useUIDensity();

    // Master data state
    const [kategoriOptions, setKategoriOptions] = useState<any[]>([]);

    const categorySortOrder = [
        'Keberatan dan pembatalan penerbitan SK',
        'klaim pihak ketiga',
        'permohonan perlindungan',
        'lainnya'
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
    const [suratFiles, setSuratFiles] = useState<File[]>([]);
    const [docUploadProgress] = useState(0);


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
            tanggalSurat: new Date(),
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

    const handleKpsSelect = async (kps: KpsData) => {
        // Prevent duplicates
        if (selectedKpsList.some(item => item.id_kps_api === kps.id_kps_api)) return;

        // 1. Initial State
        const newKps = { ...kps };
        const newList = [...selectedKpsList, newKps];
        setSelectedKpsList(newList);
        setSelectedKps(newKps);

        // 2. Update form with sum
        const totalArea = newList.reduce((sum, item) => sum + (Number(item.lokasi_luas_ha) || 0), 0);
        const totalKK = newList.reduce((sum, item) => sum + (Number(item.jumlah_kk) || 0), 0);

        setFormData(prev => ({
            ...prev,
            skema: kps.jenis_kps as any || prev.skema,
            lokasi: {
                ...prev.lokasi,
                provinsi: newList[0]?.lokasi_prov || prev.lokasi.provinsi,
                kabupaten: newList[0]?.lokasi_kab || prev.lokasi.kabupaten,
                kecamatan: newList[0]?.lokasi_kec || prev.lokasi.kecamatan,
                desa: newList[0]?.lokasi_desa || prev.lokasi.desa,
                luasHa: totalArea
            },
            jumlahKK: totalKK
        }));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;


        setIsSubmitting(true);
        setFormError(null);
        try {
            // Sequential Process:
            // 1. Prepare Payload Mapper
            const dbPayload = {
                surat_nomor: formData.suratMasuk.nomorSurat,
                surat_tanggal: formData.suratMasuk.tanggalSurat instanceof Date
                    ? formData.suratMasuk.tanggalSurat.toISOString().split('T')[0]
                    : formData.suratMasuk.tanggalSurat,
                surat_asal_perihal: formData.suratMasuk.perihal,
                pengadu_nama: formData.pengadu.nama,
                pengadu_instansi: formData.pengadu.instansi,
                kategori_masalah: formData.kategoriMasalah,
                ringkasan_masalah: formData.ringkasanMasalah,
                lokasi_prov: formData.lokasi.provinsi,
                lokasi_kab: formData.lokasi.kabupaten,
                lokasi_kec: formData.lokasi.kecamatan,
                lokasi_desa: formData.lokasi.desa,
                lokasi_luas_ha: formData.lokasi.luasHa,
                jumlah_kk: formData.jumlahKK,
                // Server Zod schema expects string[] for coordinates
                lokasi_lat: selectedKpsList.map(k => String(k.lat || 0)),
                lokasi_lng: selectedKpsList.map(k => String(k.lng || 0)),
                status: 'baru',
                id_kps_api: selectedKpsList.map(k => String(k.id_kps_api)),
                nama_kps: selectedKpsList.map(k => k.nama_kps),
                jenis_kps: selectedKpsList.map(k => k.jenis_kps),
                nomor_sk: selectedKpsList.map(k => k.nomor_sk)
            };

            // 2. Call Sequential Service
            await AduanService.createAduanWithFiles(
                dbPayload,
                selectedKpsList,
                {
                    documents: suratFiles
                },
                user.id,
                user.displayName
            );

            alert('Aduan berhasil disimpan dan sedang diproses.');
            navigate('/pengaduan');
        } catch (err: any) {
            console.error('Submission failed:', err);
            setFormError(`Gagal menyimpan aduan: ${err.message}`);
        } finally {
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
                    <div className="pt-2">
                        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-white p-1">
                            <button
                                type="button"
                                onClick={() => setDensity('comfortable')}
                                className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${density === 'comfortable' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Comfortable
                            </button>
                            <button
                                type="button"
                                onClick={() => setDensity('compact')}
                                className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${density === 'compact' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Compact
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {formError && (
                <div className="bg-destructive/5 border border-destructive/20 text-destructive px-5 py-4 rounded-2xl flex items-center gap-3 animate-in shake duration-500 shadow-sm">
                    <AlertCircle size={20} />
                    <span className="font-medium">{formError}</span>
                </div>
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
                                    value={formData.suratMasuk.tanggalSurat instanceof Date ? formData.suratMasuk.tanggalSurat.toISOString().split('T')[0] : ''}
                                    onChange={e => handleSuratChange('tanggalSurat', new Date(e.target.value))}
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
                                        onFileSelected={(files) => setSuratFiles(files)}
                                        onFileRemoved={(idx) => {
                                            const newFiles = [...suratFiles];
                                            newFiles.splice(idx, 1);
                                            setSuratFiles(newFiles);
                                        }}
                                        multiple
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.zip,.shp,.dbf,.prj,.shx,.mp3,.m4a,.wav,.ogg,.aac"
                                        uploadProgress={docUploadProgress}
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

                                {selectedKpsList.length > 0 && (
                                    <div className="flex flex-wrap gap-2 px-1">
                                        {selectedKpsList.map((kps) => (
                                            <div
                                                key={kps.id_kps_api}
                                                className="flex items-center gap-2 bg-white border border-border pl-3 pr-1 py-1 rounded-full shadow-sm animate-in zoom-in-95 duration-200"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-semibold leading-none text-foreground">{kps.nama_kps}</span>
                                                    <span className="text-[8px] text-muted-foreground">{kps.nomor_sk}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newList = selectedKpsList.filter(item => item.id_kps_api !== kps.id_kps_api);
                                                        setSelectedKpsList(newList);
                                                        if (selectedKps?.id_kps_api === kps.id_kps_api) {
                                                            setSelectedKps(newList[newList.length - 1] || null);
                                                        }
                                                        // Update aggregated fields
                                                        setFormData((prev: any) => ({
                                                            ...prev,
                                                            jumlahKK: newList.reduce((sum, item) => sum + (Number(item.jumlah_kk) || 0), 0),
                                                            lokasi: {
                                                                ...prev.lokasi,
                                                                luasHa: newList.reduce((sum, item) => sum + (Number(item.lokasi_luas_ha) || 0), 0)
                                                            }
                                                        }));
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
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Total Luas SK</span>
                                                    <span className="text-xl font-semibold text-foreground leading-none">
                                                        {selectedKpsList.reduce((sum, item) => sum + (Number(item.lokasi_luas_ha) || 0), 0).toLocaleString('id-ID')} <span className="text-xs font-bold text-muted-foreground">Ha</span>
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1 border-l pl-6 border-border">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Total Jumlah KK</span>
                                                    <span className="text-xl font-semibold text-foreground leading-none">
                                                        {selectedKpsList.reduce((sum, item) => sum + (Number(item.jumlah_kk) || 0), 0).toLocaleString('id-ID')} <span className="text-xs font-bold text-muted-foreground">Org</span>
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
                                                        skema: 'HKm',
                                                        jumlahKK: 0,
                                                        lokasi: { ...prev.lokasi, luasHa: 0 }
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
                                                    key={kps.id_kps_api}
                                                    className="flex flex-col bg-white border border-border/60 rounded-2xl shadow-sm overflow-hidden"
                                                >
                                                    {/* Card Header */}
                                                    <div className="p-4 bg-secondary/30 border-b border-border/50 flex items-start gap-4">
                                                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                                                            <Info size={18} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-sm font-semibold text-foreground leading-tight truncate px-0">{kps.nama_kps}</h4>
                                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-secondary rounded text-muted-foreground uppercase tracking-wider">ID: {kps.id_kps_api}</span>
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-muted rounded text-foreground uppercase tracking-wider max-w-[150px] truncate">SK: {kps.nomor_sk}</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newList = selectedKpsList.filter(item => item.id_kps_api !== kps.id_kps_api);
                                                                setSelectedKpsList(newList);
                                                                if (selectedKps?.id_kps_api === kps.id_kps_api) {
                                                                    setSelectedKps(newList[newList.length - 1] || null);
                                                                }
                                                                setFormData((prev: any) => ({
                                                                    ...prev,
                                                                    jumlahKK: newList.reduce((sum, item) => sum + (Number(item.jumlah_kk) || 0), 0),
                                                                    lokasi: {
                                                                        ...prev.lokasi,
                                                                        luasHa: newList.reduce((sum, item) => sum + (Number(item.lokasi_luas_ha) || 0), 0)
                                                                    }
                                                                }));
                                                            }}
                                                            className="ml-auto p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-full transition-colors shrink-0"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>

                                                    {/* Card Body - Mini Grid */}
                                                    <div className="p-4 grid grid-cols-2 gap-4">
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">ID API KPS</p>
                                                            <p className="text-xs font-medium text-foreground leading-none">{kps.id_kps_api || '-'}</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Nama KPS</p>
                                                            <p className="text-xs font-medium text-foreground leading-none truncate">{kps.nama_kps || '-'}</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">No SK</p>
                                                            <p className="text-xs font-medium text-foreground leading-none truncate">{kps.nomor_sk || '-'}</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">KPS Type</p>
                                                            <p className="text-xs font-medium text-foreground leading-none">{kps.kps_type || kps.jenis_kps || '-'}</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Provinsi</p>
                                                            <p className="text-xs font-medium text-foreground leading-none">{kps.lokasi_prov || '-'}</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Kabupaten</p>
                                                            <p className="text-xs font-medium text-foreground leading-none">{kps.lokasi_kab || '-'}</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Luas</p>
                                                            <p className="text-xs font-medium text-foreground leading-none">{(Number(kps.lokasi_luas_ha) || 0).toLocaleString('id-ID')} Ha</p>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Jumlah KK</p>
                                                            <p className="text-xs font-medium text-foreground leading-none">{(Number(kps.jumlah_kk) || 0).toLocaleString('id-ID')} KK</p>
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
                                    })) : [
                                        { value: 'Keberatan dan pembatalan penerbitan SK', label: 'Keberatan dan pembatalan penerbitan SK' },
                                        { value: 'klaim pihak ketiga', label: 'klaim pihak ketiga' },
                                        { value: 'permohonan perlindungan', label: 'permohonan perlindungan' },
                                        { value: 'lainnya', label: 'lainnya' }
                                    ]}
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
