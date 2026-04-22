import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import {
    ArrowLeft,
    Phone,
    FileText,
    FolderOpen,
    MapPin,
    Calendar,
    User,
    CheckCircle,
    Edit,
    Plus,
    ExternalLink,
    Clock,
    Tag,
    Globe,
    AlertCircle,
    AlertTriangle,
    Trash2,
    Briefcase,
    Zap,
    Sparkles,
    Upload,
    Settings,
    Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Button,
    StatusBadge,
    Badge,
    Modal,
    ModalFooter,
    Input,
    Select,
    Textarea,
    KpsSearch,
    FileUpload,
    type FileUploadItemState,
    ConfirmDialog
} from '../components/ui';
import type { Aduan, KpsData, TindakLanjut } from '../types';
import { AduanService } from '../lib/aduan.service';
import { KpsService } from '../lib/kps.service';
import { ActivityService } from '../lib/activity.service';
import { authorizedFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useAduanByTicket, useUpdateAduan, useDeleteAduan } from '../hooks/useAduan';
import { useTindakLanjutList, useCreateTindakLanjut, useDeleteTindakLanjut, useUpdateTindakLanjut } from '../hooks/useTindakLanjut';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AduanPdfService } from '../lib/aduan-pdf.service';

const formatDate = (date: Date): string => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date(date));
};

const resolveKpsType = (kps?: Partial<KpsData>) =>
    [kps?.skema, kps?.kps_type, kps?.jenis_kps]
        .find((value): value is string => typeof value === 'string' && value.trim().length > 0) || '-';

const getDisplayedKpsId = (kps?: Partial<KpsData>) =>
    kps?.id || '-';

const getNormalizedKpsId = (kps?: Partial<KpsData>) =>
    kps?.id || '';

const getMimeTypeFromFileName = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ext) return '';

    const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        txt: 'text/plain',
        csv: 'text/csv',
        json: 'application/json',
        mp3: 'audio/mpeg',
        m4a: 'audio/mp4',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        mp4: 'video/mp4',
        webm: 'video/webm',
    };

    return mimeMap[ext] || '';
};

const isPreviewableMimeType = (mimeType: string) =>
    mimeType === 'application/pdf'
    || mimeType.startsWith('image/')
    || mimeType.startsWith('text/')
    || mimeType.startsWith('audio/')
    || mimeType.startsWith('video/')
    || mimeType === 'application/json';

const hasMeaningfulKpsData = (kps?: Partial<KpsData>) =>
    Boolean(
        getNormalizedKpsId(kps)
        || kps?.nama_kps
        || kps?.nama_lembaga
        || kps?.nomor_sk
        || kps?.surat_keputusan
        || kps?.lokasi_prov
        || kps?.lokasi_kab
    );

const normalizeSelectedKps = (kps?: Partial<KpsData>): KpsData => {
    const normalizedId = getNormalizedKpsId(kps);
    const normalizedType = resolveKpsType(kps);

    return {
        ...(kps as KpsData),
        id: normalizedId,
        nama_kps: kps?.nama_kps || kps?.nama_lembaga || '-',
        jenis_kps: kps?.jenis_kps || normalizedType || '',
        nomor_sk: kps?.nomor_sk || kps?.surat_keputusan || '',
        lokasi_prov: kps?.lokasi_prov || kps?.provinsi || '',
        lokasi_kab: kps?.lokasi_kab || kps?.kabupaten || '',
        lokasi_kec: kps?.lokasi_kec || kps?.kecamatan || '',
        lokasi_desa: kps?.lokasi_desa || kps?.desa || '',
        lokasi_luas_ha: Number(kps?.lokasi_luas_ha ?? kps?.luas_total ?? 0) || 0,
        jumlah_kk: Number(kps?.jumlah_kk ?? kps?.jumlah_anggota ?? 0) || 0,
        kps_type: normalizedType,
        nama_lembaga: kps?.nama_lembaga || kps?.nama_kps || '',
        surat_keputusan: kps?.surat_keputusan || kps?.nomor_sk || '',
        skema: kps?.skema || normalizedType || '',
        balai: kps?.balai || '',
    };
};

const buildSelectedUploadStates = (files: Array<Pick<File, 'name'>>): FileUploadItemState[] =>
    files.map((file) => ({
        fileName: file.name,
        status: 'selected',
    }));

const buildStoredUploadState = (fileName: string, message = 'Tersimpan di server'): FileUploadItemState[] => [{
    fileName,
    status: 'success',
    progress: 100,
    message,
}];

const updateUploadStatusAt = (
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

type EditAduanForm = {
    perihal: string;
    ringkasanMasalah: string;
    picName: string;
    lokasiDesa: string;
    lokasiKecamatan: string;
    lokasiKabupaten: string;
    lokasiProvinsi: string;
    lokasiLuasHa: number;
    lokasiBalaiId: string;
    lokasiBalaiName: string;
    skema: Aduan['skema'];
    jumlahKK: number;
    skTerkait: string;
    fileUrl: string;
    kpsId: string;
    asalSurat: string;
    suratPerihal: string;
    asalSuratKategori: string;
    pengaduNama: string;
    pengaduTelepon: string;
    pengaduEmail: string;
    picId: string;
};

type EditAduanModalProps = {
    isOpen: boolean;
    isAdmin: boolean;
    editForm: EditAduanForm;
    editSelectedKpsList: KpsData[];
    suratFile: File | null;
    picOptions: { value: string; label: string }[];
    isLoadingUsers: boolean;
    emailError?: string;
    isEditSubmitting: boolean;
    suratUploadProgress: number;
    suratFileStatuses: FileUploadItemState[];
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
    onEditInput: (field: keyof EditAduanForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onSelectKps: (kps: KpsData) => void;
    onRemoveKps: (kpsId: string) => void;
    onSelectPic: (value: string) => void;
    onAsalSuratKategoriChange: (value: string) => void;
    onSuratFileSelected: (files: File[]) => void;
    onSuratFileRemoved: () => void;
};

type FeedbackState = {
    type: 'success' | 'error' | 'info';
    message: string;
} | null;

const DEFAULT_JENIS_TL_SELECT_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'Surat/Dokumen Pengadu', label: 'Surat/Dokumen Pengadu' },
    { value: 'Surat/Dokumen Pihak lain', label: 'Surat/Dokumen Pihak lain' },
    { value: 'TL Surat Jawaban', label: 'TL Surat Jawaban' },
    { value: 'TL Nota Dinas', label: 'TL Nota Dinas' },
    { value: 'TL BA Rapat Pembahasan', label: 'TL BA Rapat Pembahasan' },
    { value: 'TL Notula Rapat', label: 'TL Notula Rapat' },
    { value: 'Laporan Publikasi', label: 'Laporan Publikasi' },
    { value: 'Berita Acara Evaluasi', label: 'Berita Acara Evaluasi' },
    { value: 'Lainnya', label: 'Lainnya' }
];

const LEGACY_JENIS_TL_LABEL_MAP: Record<string, string> = {
    'Telaah Administrasi': 'Surat/Dokumen Pengadu',
    'Hasil Telaah Dikembalikan': 'Surat/Dokumen Pihak lain',
    'Puldasi': 'TL Surat Jawaban',
    'Agenda Rapat Pembahasan': 'TL BA Rapat Pembahasan',
    'Agenda Evaluasi': 'Berita Acara Evaluasi',
    'Agenda Pembahasan Hasil Evaluasi': 'TL Notula Rapat',
    'ND Perubahan Persetujuan PS': 'TL Nota Dinas',
    'Respon pengadu/Pihak ketiga': 'Surat/Dokumen Pihak lain',
    'Surat Penolakan Aduan': 'TL Surat Jawaban',
    'Dokumen Lengkap / Puldasi': 'TL Surat Jawaban',
    'Sudah Puldasi / Agenda Rapat Pembahasan': 'TL BA Rapat Pembahasan',
};

const normalizeJenisTlLabel = (value?: string) => {
    const normalized = value?.trim() || '';
    if (!normalized) return '';
    return LEGACY_JENIS_TL_LABEL_MAP[normalized] || normalized;
};

const editSectionClass = "rounded-xl border border-border/70 bg-muted/20 p-4";

const getFileAccessErrorMessage = async (response: Response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        const payload = await response.json().catch(() => null);
        if (typeof payload?.error === 'string' && payload.error.trim()) {
            return payload.error;
        }
    }

    const fallbackText = await response.text().catch(() => '');
    return fallbackText.trim() || `HTTP ${response.status}`;
};

const EditAduanModal: React.FC<EditAduanModalProps> = ({
    isOpen,
    isAdmin,
    editForm,
    editSelectedKpsList,
    suratFile,
    picOptions,
    isLoadingUsers,
    emailError,
    isEditSubmitting,
    suratUploadProgress,
    suratFileStatuses,
    onSubmit,
    onClose,
    onEditInput,
    onSelectKps,
    onRemoveKps,
    onSelectPic,
    onAsalSuratKategoriChange,
    onSuratFileSelected,
    onSuratFileRemoved,
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Data Aduan"
            description="Perbarui informasi inti aduan tanpa mengubah riwayat penanganan."
            className="max-w-4xl rounded-2xl border-border/80 bg-white p-6"
            size="xl"
        >
            <form onSubmit={onSubmit} className="flex flex-col gap-5">
                <div className={`${editSectionClass} space-y-4`}>
                    <Input
                        label="Perihal / Judul Aduan"
                        value={editForm.perihal}
                        onChange={onEditInput('perihal')}
                        required
                        fullWidth
                    />
                    <Textarea
                        label="Ringkasan Masalah"
                        value={editForm.ringkasanMasalah}
                        onChange={onEditInput('ringkasanMasalah')}
                        rows={4}
                        fullWidth
                    />
                </div>

                <div className="bg-muted/25 p-4 rounded-xl border border-border/70">
                    <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                        <Sparkles size={16} />
                        Identitas Kelompok / KPS
                    </label>

                    <KpsSearch
                        onSelect={onSelectKps}
                        placeholder="Ketik id, nama_lembaga, atau surat_keputusan..."
                    />
                    <p className="text-[10px] text-muted-foreground mt-2">
                        Cari & pilih data Master KPS. Bisa pilih lebih dari satu.
                    </p>

                    {editSelectedKpsList.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border">
                                    Total KPS: {editSelectedKpsList.length}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border">
                                    Total luas_total: {editSelectedKpsList.reduce((sum, item) => sum + (Number(item.luas_total ?? item.lokasi_luas_ha) || 0), 0).toLocaleString('id-ID')} Ha
                                </Badge>
                                <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border">
                                    Total anggota_pria: {editSelectedKpsList.reduce((sum, item) => sum + (Number(item.anggota_pria) || 0), 0).toLocaleString('id-ID')}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border">
                                    Total anggota_wanita: {editSelectedKpsList.reduce((sum, item) => sum + (Number(item.anggota_wanita) || 0), 0).toLocaleString('id-ID')}
                                </Badge>
                            </div>
                            {editSelectedKpsList.map((kps) => {
                                const kpsId = getNormalizedKpsId(kps);
                                return (
                                <div key={`card-${kpsId || kps.nama_kps}`} className="p-3 bg-white rounded-md border border-border shadow-sm">
                                    <div className="mb-2 flex justify-end">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => onRemoveKps(kpsId)}
                                        >
                                            <Trash2 size={11} />
                                            Hapus
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">id</span>
                                            <span className="text-xs font-mono text-foreground break-all">{getDisplayedKpsId(kps)}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">nama_lembaga</span>
                                            <span className="text-xs font-semibold text-foreground">{kps.nama_lembaga || kps.nama_kps || '-'}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">surat_keputusan</span>
                                            <span className="text-xs font-mono text-foreground">{kps.surat_keputusan || kps.nomor_sk || '-'}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">skema</span>
                                            <span className="text-xs font-semibold text-foreground">{kps.skema || resolveKpsType(kps)}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">provinsi</span>
                                            <span className="text-xs text-foreground">{kps.provinsi || kps.lokasi_prov || '-'}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">kabupaten</span>
                                            <span className="text-xs text-foreground">{kps.kabupaten || kps.lokasi_kab || '-'}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">luas_total</span>
                                            <Badge variant="outline" className="w-fit">{(Number(kps.luas_total ?? kps.lokasi_luas_ha ?? 0) || 0).toLocaleString('id-ID')} Ha</Badge>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">anggota_pria</span>
                                            <Badge variant="outline" className="w-fit">{(Number(kps.anggota_pria ?? 0) || 0).toLocaleString('id-ID')}</Badge>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">anggota_wanita</span>
                                            <Badge variant="outline" className="w-fit">{(Number(kps.anggota_wanita ?? 0) || 0).toLocaleString('id-ID')}</Badge>
                                        </div>
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                </div>

                {isAdmin && (
                    <div className={editSectionClass}>
                        <Select
                            label="PIC (Penanggung Jawab)"
                            options={picOptions}
                            value={editForm.picId || '__none__'}
                            onChange={onSelectPic}
                            fullWidth
                            disabled={isLoadingUsers}
                        />
                        {isLoadingUsers && <p className="text-[10px] text-muted-foreground mt-1">Memuat daftar user...</p>}
                    </div>
                )}

                <div className="bg-muted/25 p-4 rounded-xl border border-border/70 space-y-4">
                    <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <User size={16} className="text-primary" />
                        Identitas Pengadu
                    </label>
                    <Input
                        label="Nama Pengadu / Kelompok"
                        value={editForm.pengaduNama}
                        onChange={onEditInput('pengaduNama')}
                        fullWidth
                        required
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                            label="Nomor Telepon"
                            value={editForm.pengaduTelepon}
                            onChange={onEditInput('pengaduTelepon')}
                            fullWidth
                        />
                        <Input
                            label="Email Pengadu"
                            placeholder="nama@email.com"
                            value={editForm.pengaduEmail}
                            onChange={onEditInput('pengaduEmail')}
                            error={emailError}
                            fullWidth
                        />
                    </div>
                </div>

                {editSelectedKpsList.length === 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                            label="Desa"
                            value={editForm.lokasiDesa}
                            onChange={onEditInput('lokasiDesa')}
                            fullWidth
                        />
                        <Input
                            label="Kecamatan"
                            value={editForm.lokasiKecamatan}
                            onChange={onEditInput('lokasiKecamatan')}
                            fullWidth
                        />
                    </div>
                )}

                <div className={`${editSectionClass} grid grid-cols-1 sm:grid-cols-2 gap-4`}>
                    <div className="sm:col-span-2">
                        <label className="text-[10px] font-semibold text-primary uppercase tracking-widest block mb-2">Administrasi Surat</label>
                    </div>
                    <Select
                        label="Kategori Asal"
                        options={[
                            { value: 'Masyarakat', label: 'Masyarakat' },
                            { value: 'Kementerian', label: 'Kementerian' },
                            { value: 'Direktorat', label: 'Direktorat' },
                            { value: 'Balai', label: 'Balai' },
                            { value: 'Lainnya', label: 'Lainnya' }
                        ]}
                        value={editForm.asalSuratKategori}
                        onChange={onAsalSuratKategoriChange}
                        fullWidth
                    />
                    {editForm.asalSuratKategori !== 'Masyarakat' && (
                        <div className="sm:col-span-2">
                            <Input
                                label="Detail Asal Surat"
                                value={editForm.asalSurat}
                                onChange={onEditInput('asalSurat')}
                                placeholder={`Nama ${editForm.asalSuratKategori.toLowerCase()}...`}
                                fullWidth
                                required
                            />
                        </div>
                    )}
                    <div className="sm:col-span-2">
                        <Input
                            label="Perihal Surat"
                            value={editForm.suratPerihal || ''}
                            onChange={onEditInput('suratPerihal')}
                            placeholder="Masukkan perihal surat..."
                            fullWidth
                        />
                    </div>
                </div>

                <div className={editSectionClass}>
                    <FileUpload
                        label="Ganti / Upload Surat Masuk (Lampiran)"
                        helperText="Unggah surat masuk baru: PDF, JPG, PNG, DOC, atau DOCX"
                        initialFiles={suratFile ? [suratFile] : (editForm.fileUrl ? [{ name: 'Surat Terarsip', size: 0, type: 'application/pdf' } as File] : [])}
                        onFileSelected={onSuratFileSelected}
                        onFileRemoved={onSuratFileRemoved}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        maxSizeMB={10}
                        uploadProgress={suratUploadProgress}
                        fileStatuses={suratFileStatuses}
                        isLoading={isEditSubmitting && suratUploadProgress > 0 && suratUploadProgress < 100}
                    />
                </div>

                <ModalFooter className="sticky bottom-0 z-10 -mx-1 border-t border-border/80 bg-white/95 px-1 pt-4 pb-1 backdrop-blur">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                    >
                        Batal
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        isLoading={isEditSubmitting}
                        leftIcon={<CheckCircle size={18} />}
                    >
                        Simpan Perubahan
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};


export const AduanDetailPage: React.FC = () => {
    const { nomorTiket } = useParams<{ nomorTiket: string }>();
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();

    // Queries - fetch by ticket number
    const { data: aduan, isLoading: isLoadingAduan, isError: isAduanError, refetch: refetchAduan } = useAduanByTicket(nomorTiket);
    const relatedKpsIds = useMemo(() => {
        const rawIds = aduan?.kps_ids || [];
        return [...new Set(rawIds.map((value) => String(value)).filter(Boolean))];
    }, [aduan?.kps_ids]);
    const relatedKpsQueries = useQueries({
        queries: relatedKpsIds.map((kpsId) => ({
            queryKey: ['kps', 'detail', kpsId],
            queryFn: () => KpsService.getKpsById(kpsId),
            enabled: !!kpsId,
        })),
    });
    const relatedKpsById = useMemo(() => {
        return new Map(
            relatedKpsIds.map((kpsId, index) => {
                const detail = relatedKpsQueries[index]?.data;
                return [kpsId, detail ? normalizeSelectedKps(detail) : null];
            })
        );
    }, [relatedKpsIds, relatedKpsQueries]);
    const { data: qTindakLanjutList = [] } = useTindakLanjutList(aduan?.id);
    const latestTindakLanjut = useMemo(() => {
        if (!qTindakLanjutList.length) return null;
        return [...qTindakLanjutList].sort((a, b) => {
            const dateDiff = new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
            if (dateDiff !== 0) return dateDiff;
            return (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0);
        })[0];
    }, [qTindakLanjutList]);

    const latestTindakLanjutLabel = useMemo(() => {
        if (!latestTindakLanjut) return 'Tahap Saat Ini';
        const dateLabel = formatDate(latestTindakLanjut.tanggal);
        const jenisTlLabel = normalizeJenisTlLabel(latestTindakLanjut.jenisTL) || 'Dokumen terbaru';
        return `${jenisTlLabel} • ${dateLabel}`;
    }, [latestTindakLanjut]);
    const suratMasukAttachment = useMemo(() => {
        if (!aduan?.suratMasuk?.fileUrl) return null;
        return {
            id: 'surat-masuk-legacy',
            url: aduan.suratMasuk.fileUrl,
            fileName: aduan.suratMasuk.fileUrl.split('/').pop()?.split('?')[0] || 'Surat Masuk',
            source: 'Surat Masuk',
            meta: 'Administrasi Surat (Legacy)',
        };
    }, [aduan?.suratMasuk?.fileUrl]);
    const documentAttachments = useMemo(() => {
        return (aduan?.documents || []).map((doc) => ({
            id: `doc-${doc.id}`,
            rawId: doc.id,
            url: doc.file_url,
            fileName: doc.file_name,
            source: 'Dokumen',
            meta: `Dokumen Pendukung ${doc.file_category === 'susulan' ? '(Susulan)' : ''}`.trim(),
        }));
    }, [aduan?.documents]);
    const tindakLanjutAttachments = useMemo(() => {
        return qTindakLanjutList.flatMap((tl) =>
            (tl.fileUrls || [])
                .filter(Boolean)
                .map((url, index) => ({
                    id: `${tl.id}-${index}`,
                    url,
                    jenisTL: normalizeJenisTlLabel(tl.jenisTL),
                    tanggal: tl.tanggal,
                    fileName: url.split('/').pop()?.split('?')[0] || `Lampiran Dokumen ${index + 1}`,
                    source: 'Dokumen Tindak Lanjut',
                }))
        );
    }, [qTindakLanjutList]);
    const allAttachments = useMemo(() => {
        const items = [
            ...(suratMasukAttachment ? [{ ...suratMasukAttachment, rawId: undefined }] : []),
            ...documentAttachments,
            ...tindakLanjutAttachments.map((file) => ({
                id: `tl-${file.id}`,
                rawId: undefined,
                url: file.url,
                fileName: file.fileName,
                source: file.source,
                meta: `${file.jenisTL} • ${formatDate(file.tanggal)}`,
            })),
        ];
        return items;
    }, [suratMasukAttachment, documentAttachments, tindakLanjutAttachments]);

    // Mutations
    const { mutate: updateAduan, isPending: isEditSubmitting } = useUpdateAduan();
    const { mutate: deleteAduan, isPending: isDeleting } = useDeleteAduan();
    const { mutate: createTL, isPending: isTLSubmitting } = useCreateTindakLanjut();
    const { mutate: updateTL, isPending: isUpdateTlSubmitting } = useUpdateTindakLanjut();
    const { mutate: deleteTL } = useDeleteTindakLanjut();

    const [detailError, setDetailError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<FeedbackState>(null);

    // Modal State
    const [isTLModalOpen, setIsTLModalOpen] = useState(false);
    const [tlForm, setTlForm] = useState({
        jenisTL: DEFAULT_JENIS_TL_SELECT_OPTIONS[0].value,
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: '',
        nomorSuratOutput: '',
        files: [] as File[]
    });
    const [isEditTlModalOpen, setIsEditTlModalOpen] = useState(false);
    const [editingTl, setEditingTl] = useState<TindakLanjut | null>(null);
    const [editTlForm, setEditTlForm] = useState({
        id: '',
        jenisTL: '',
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: '',
        nomorSuratOutput: '',
        fileUrls: [] as string[],
        newFiles: [] as File[]
    });
    const [editTlUploadProgress, setEditTlUploadProgress] = useState(0);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const buildEditForm = (source?: typeof aduan | null): EditAduanForm => {
        const firstKps = source?.kps_items?.[0];

        return {
            perihal: source?.perihal || '',
            ringkasanMasalah: source?.ringkasanMasalah || '',
            picName: source?.picName || '',
            lokasiDesa: source?.lokasi?.desa || firstKps?.lokasi_desa || '',
            lokasiKecamatan: source?.lokasi?.kecamatan || firstKps?.lokasi_kec || '',
            lokasiKabupaten: source?.lokasi?.kabupaten || firstKps?.lokasi_kab || '',
            lokasiProvinsi: source?.lokasi?.provinsi || firstKps?.lokasi_prov || '',
            lokasiLuasHa: source?.lokasi?.luasHa || Number(source?.lokasi_luas_ha ?? firstKps?.lokasi_luas_ha ?? 0) || 0,
            lokasiBalaiId: source?.lokasi?.balaiId || '',
            lokasiBalaiName: source?.lokasi?.balaiName || '',
            skema: source?.skema || ((resolveKpsType(firstKps) || undefined) as Aduan['skema']),
            jumlahKK: source?.jumlahKK || Number(source?.jumlah_kk ?? firstKps?.jumlah_kk ?? 0) || 0,
            skTerkait: source?.skTerkait || source?.nomor_sk?.filter(Boolean).join('; ') || firstKps?.nomor_sk || '',
            fileUrl: source?.suratMasuk?.fileUrl || '',
            kpsId: source?.kps_ids?.[0] || source?.kpsId || getNormalizedKpsId(firstKps),
            asalSurat: source?.suratMasuk?.asalSurat || '',
            suratPerihal: source?.suratMasuk?.perihal || '',
            asalSuratKategori: source?.suratMasuk?.asalSuratKategori || 'Masyarakat',
            pengaduNama: source?.pengadu?.nama || '',
            pengaduTelepon: source?.pengadu?.telepon || '',
            pengaduEmail: source?.pengadu?.email || '',
            picId: source?.picId || ''
        };
    };

    const [editForm, setEditForm] = useState<EditAduanForm>(buildEditForm());

    const [statusForm, setStatusForm] = useState({
        status: '',
        alasanPenolakan: '',
    });
    const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const [suratFile, setSuratFile] = useState<File | null>(null);

    const [editSelectedKpsList, setEditSelectedKpsList] = useState<KpsData[]>([]);
    const fetchAuthorizedFile = async (url: string) => {
        const response = await authorizedFetch(url, {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(await getFileAccessErrorMessage(response));
        }

        return response;
    };

    const downloadBlobFile = (blobUrl: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const openProtectedFile = async (url: string, fileName: string) => {
        const previewWindow = window.open('', '_blank');

        if (previewWindow) {
            try {
                previewWindow.opener = null;
                previewWindow.document.title = `Membuka ${fileName}`;
                previewWindow.document.body.textContent = '';
                const container = previewWindow.document.createElement('div');
                container.setAttribute('style', 'font-family: system-ui, sans-serif; padding: 24px; color: #334155;');

                const title = previewWindow.document.createElement('p');
                title.setAttribute('style', 'margin: 0; font-size: 14px;');
                title.textContent = 'Membuka file...';

                const fileLabel = previewWindow.document.createElement('p');
                fileLabel.setAttribute('style', 'margin: 8px 0 0; font-size: 12px; color: #64748b;');
                fileLabel.textContent = fileName;

                container.append(title, fileLabel);
                previewWindow.document.body.appendChild(container);
            } catch {
                // Ignore cross-window DOM access issues and continue with navigation flow.
            }
        }

        try {
            const response = await fetchAuthorizedFile(url);
            const sourceBlob = await response.blob();
            const mimeType = sourceBlob.type && sourceBlob.type !== 'application/octet-stream'
                ? sourceBlob.type
                : getMimeTypeFromFileName(fileName)
                    || response.headers.get('content-type')
                    || 'application/octet-stream';
            const blob = sourceBlob.type === mimeType ? sourceBlob : new Blob([sourceBlob], { type: mimeType });
            const blobUrl = URL.createObjectURL(blob);
            const canPreview = isPreviewableMimeType(mimeType);

            if (canPreview) {
                if (previewWindow) {
                    previewWindow.location.replace(blobUrl);
                } else {
                    downloadBlobFile(blobUrl, fileName);
                    setFeedback({
                        type: 'info',
                        message: `Popup diblokir browser. File ${fileName} diunduh sebagai gantinya.`
                    });
                }
            } else {
                previewWindow?.close();
                downloadBlobFile(blobUrl, fileName);
                setFeedback({
                    type: 'info',
                    message: `File ${fileName} tidak bisa dipreview di tab browser dan akan diunduh.`
                });
            }

            window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        } catch (error) {
            previewWindow?.close();
            console.error('Failed to open protected file:', error);
            setFeedback({
                type: 'error',
                message: `Gagal membuka file ${fileName}: ${error instanceof Error ? error.message : 'Akses ditolak.'}`
            });
        }
    };

    const canInputRiwayatPenanganan = (aduan?.status || '').toLowerCase() === 'proses';
    const lokasiObjekItems = useMemo(() => {
        const normalizedKpsItems = Array.isArray(aduan?.kps_items)
            ? aduan.kps_items
                .map((item) => normalizeSelectedKps(item))
                .filter((item) => hasMeaningfulKpsData(item))
            : [];
        const ids = aduan?.kps_ids || [];
        const names = aduan?.nama_kps || [];
        const sks = aduan?.nomor_sk || [];
        const types = (aduan?.type_kps && aduan.type_kps.length > 0 ? aduan.type_kps : aduan?.jenis_kps) || [];
        const maxLen = Math.max(ids.length, names.length, sks.length, types.length, normalizedKpsItems.length);

        if (maxLen > 0) {
            return Array.from({ length: maxLen }).map((_, idx) => ({
                ...(function () {
                    const aggregateKps = normalizedKpsItems[idx];
                    const explicitId = ids[idx] || getNormalizedKpsId(aggregateKps) || '';
                    const masterKps = explicitId ? relatedKpsById.get(explicitId) || null : null;
                    const mergedKps = normalizeSelectedKps({
                        ...(masterKps || {}),
                        ...(aggregateKps || {}),
                        id: explicitId || getNormalizedKpsId(masterKps || aggregateKps) || '',
                        nama_kps: aggregateKps?.nama_kps || names[idx] || masterKps?.nama_kps || masterKps?.nama_lembaga || '',
                        nama_lembaga: aggregateKps?.nama_lembaga || masterKps?.nama_lembaga || '',
                        nomor_sk: aggregateKps?.nomor_sk || sks[idx] || masterKps?.nomor_sk || masterKps?.surat_keputusan || '',
                        surat_keputusan: aggregateKps?.surat_keputusan || masterKps?.surat_keputusan || '',
                        jenis_kps: aggregateKps?.jenis_kps || types[idx] || masterKps?.jenis_kps || '',
                        kps_type: aggregateKps?.kps_type || types[idx] || masterKps?.kps_type || '',
                        skema: aggregateKps?.skema || masterKps?.skema || '',
                        lokasi_prov: aggregateKps?.lokasi_prov || masterKps?.lokasi_prov || masterKps?.provinsi || aduan?.lokasi?.provinsi || '',
                        lokasi_kab: aggregateKps?.lokasi_kab || masterKps?.lokasi_kab || masterKps?.kabupaten || aduan?.lokasi?.kabupaten || '',
                        lokasi_luas_ha: aggregateKps?.lokasi_luas_ha ?? masterKps?.lokasi_luas_ha ?? masterKps?.luas_total ?? (idx === 0 ? (aduan?.lokasi?.luasHa ?? aduan?.lokasi_luas_ha ?? 0) : 0),
                        jumlah_kk: aggregateKps?.jumlah_kk ?? masterKps?.jumlah_kk ?? masterKps?.jumlah_anggota ?? (idx === 0 ? (aduan?.jumlahKK ?? aduan?.jumlah_kk ?? 0) : 0),
                    });

                    return {
                        idApiKps: getDisplayedKpsId(mergedKps),
                        namaKps: mergedKps.nama_kps || mergedKps.nama_lembaga || '-',
                        noSk: mergedKps.nomor_sk || mergedKps.surat_keputusan || '-',
                        kpsType: resolveKpsType(mergedKps) || '-',
                        provinsi: mergedKps.lokasi_prov || mergedKps.provinsi || aduan?.lokasi?.provinsi || '-',
                        kabupaten: mergedKps.lokasi_kab || mergedKps.kabupaten || aduan?.lokasi?.kabupaten || '-',
                        luasHa: Number(mergedKps.lokasi_luas_ha ?? mergedKps.luas_total ?? 0),
                        anggotaPria: Number(mergedKps.anggota_pria ?? 0),
                        anggotaWanita: Number(mergedKps.anggota_wanita ?? 0),
                        jumlahKk: Number(mergedKps.jumlah_kk ?? mergedKps.jumlah_anggota ?? 0),
                    };
                })(),
            }));
        }

        return [];
    }, [aduan, relatedKpsById]);

    const totalLuasObjek = lokasiObjekItems.reduce((sum, item) => sum + (Number(item.luasHa) || 0), 0);
    const totalAnggotaPriaObjek = lokasiObjekItems.reduce((sum, item) => sum + (Number(item.anggotaPria) || 0), 0);
    const totalAnggotaWanitaObjek = lokasiObjekItems.reduce((sum, item) => sum + (Number(item.anggotaWanita) || 0), 0);
    const normalizedStatus = (aduan?.status || 'baru').toLowerCase();
    const nextActionLabel = useMemo(() => {
        if (!aduan) return '-';
        if (normalizedStatus === 'baru') {
            return isAdmin
                ? 'Tinjau aduan lalu ubah status ke PROSES agar penanganan bisa dimulai.'
                : 'Menunggu admin meninjau dan memulai proses aduan.';
        }
        if (normalizedStatus === 'proses') {
            return qTindakLanjutList.length > 0
                ? `Lanjutkan penanganan dari catatan terakhir: ${normalizeJenisTlLabel(latestTindakLanjut?.jenisTL) || 'dokumen terbaru'}.`
                : 'Tambahkan dokumen tindak lanjut pertama untuk memulai jejak penanganan.';
        }
        if (normalizedStatus === 'selesai') {
            return 'Aduan sudah ditutup. Tinjau kembali lampiran dan riwayat bila diperlukan.';
        }
        if (normalizedStatus === 'ditolak') {
            return 'Aduan ditutup dengan status ditolak. Pastikan alasan penolakan dan dokumen pendukung lengkap.';
        }
        return 'Tinjau detail aduan dan lanjutkan proses sesuai kebutuhan.';
    }, [aduan, isAdmin, latestTindakLanjut?.jenisTL, normalizedStatus, qTindakLanjutList.length]);
    const statusAccentClass = normalizedStatus === 'selesai'
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
        : normalizedStatus === 'ditolak'
            ? 'border-destructive/20 bg-destructive/10 text-destructive'
            : normalizedStatus === 'proses'
                ? 'border-primary/20 bg-primary/10 text-primary'
                : 'border-amber-500/20 bg-amber-500/10 text-amber-700';
    const overviewCards = [
        {
            label: 'Tanggal Masuk',
            value: formatDate(aduan?.createdAt || new Date()),
            hint: 'Waktu aduan tercatat',
            icon: Calendar,
        },
        {
            label: 'Penanggung Jawab',
            value: aduan?.picName || 'Belum ditentukan',
            hint: isAdmin ? 'Bisa diubah dari panel admin' : 'PIC aktif saat ini',
            icon: User,
        },
        {
            label: 'Lampiran',
            value: `${allAttachments.length} berkas`,
            hint: suratMasukAttachment ? 'Termasuk surat masuk' : 'Belum ada surat masuk',
            icon: FolderOpen,
        },
        {
            label: 'Riwayat Proses',
            value: `${qTindakLanjutList.length} catatan`,
            hint: latestTindakLanjut ? latestTindakLanjutLabel : 'Belum ada tindak lanjut',
            icon: Clock,
        },
    ];

    // Sync status form saat data aduan berubah
    useEffect(() => {
        if (aduan) {
            setStatusForm({ status: aduan.status || 'baru', alasanPenolakan: aduan.alasanPenolakan || '' });
        }
    }, [aduan?.status, aduan?.alasanPenolakan]);

    const [users, setUsers] = useState<any[]>([]);
    const [masterStatuses, setMasterStatuses] = useState<{ id: number, nama_status: string }[]>([]);
    const [jenisTlOptions, setJenisTlOptions] = useState<{ id: number, nama_jenis_tl: string }[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isUploadingSurat, setIsUploadingSurat] = useState(false);
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [uploadFilesStatus, setUploadFilesStatus] = useState<FileUploadItemState[]>([]);
    const [uploadFilesProgress, setUploadFilesProgress] = useState(0);
    const [uploadPickerKey, setUploadPickerKey] = useState(0);
    const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
    const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<{ id: string; fileName: string } | null>(null);
    const [isDeleteAduanConfirmOpen, setIsDeleteAduanConfirmOpen] = useState(false);
    const [deleteTlConfirm, setDeleteTlConfirm] = useState<{ id: string; label: string } | null>(null);
    const [tlUploadProgress, setTlUploadProgress] = useState(0);
    const [suratUploadProgress, setSuratUploadProgress] = useState(0);
    const [suratFileStatuses, setSuratFileStatuses] = useState<FileUploadItemState[]>([]);
    const jenisTlSelectOptions = useMemo(() => {
        const seen = new Set<string>();
        const options: { value: string; label: string }[] = [];
        const addOption = (value?: string) => {
            const normalizedValue = normalizeJenisTlLabel(value);
            if (!normalizedValue) return;
            const key = normalizedValue.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            options.push({ value: normalizedValue, label: normalizedValue });
        };

        DEFAULT_JENIS_TL_SELECT_OPTIONS.forEach((option) => addOption(option.value));
        jenisTlOptions.forEach((option) => addOption(option.nama_jenis_tl));

        return options;
    }, [jenisTlOptions]);
    const picOptions = useMemo(
        () => [
            { value: '__none__', label: '-- Pilih PIC --' },
            ...users.map(u => ({ value: u.id, label: u.displayName || u.email }))
        ],
        [users]
    );
    const handleEditFieldChange = (field: keyof EditAduanForm) => (value: string | number | undefined) =>
        setEditForm((prev) => {
            if (field === 'perihal' || field === 'suratPerihal') {
                const nextValue = typeof value === 'string' ? value : String(value ?? '');
                return {
                    ...prev,
                    perihal: nextValue,
                    suratPerihal: nextValue,
                };
            }

            return { ...prev, [field]: value };
        });
    const handleEditInput = (field: keyof EditAduanForm) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            handleEditFieldChange(field)(e.target.value);

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditSelectedKpsList([]);
        setSuratFile(null);
        setSuratUploadProgress(0);
        setSuratFileStatuses([]);
        setEditForm(buildEditForm(aduan));
    };

    useEffect(() => {
        if (aduan) {
            setEditForm(buildEditForm(aduan));
        }
    }, [aduan]);

    const emailError = useMemo(() => {
        if (!editForm.pengaduEmail) return undefined;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.pengaduEmail) ? undefined : 'Format email tidak valid';
    }, [editForm.pengaduEmail]);

    // Final Error Mapping
    useEffect(() => {
        if (isAduanError) setDetailError('Gagal memuat detail aduan.');
    }, [isAduanError]);

    useEffect(() => {
        if (!feedback) return;
        const timeout = window.setTimeout(() => setFeedback(null), 4000);
        return () => window.clearTimeout(timeout);
    }, [feedback]);



    // Fetch Admin Data (Users & Statuses) when modal opens
    useEffect(() => {
        if (!isEditModalOpen) return;

        if (!masterStatuses.length) {
            AduanService.getMasterStatuses().then(setMasterStatuses).catch(console.error);
        }

        if (isAdmin && !users.length && !isLoadingUsers) {
            setIsLoadingUsers(true);
            AduanService.getUsersByRole()
                .then(setUsers)
                .catch(console.error)
                .finally(() => setIsLoadingUsers(false));
        }
    }, [isEditModalOpen, isAdmin, masterStatuses.length, users.length, isLoadingUsers]);

    // Fetch jenis dokumen when the dokumen modal opens
    useEffect(() => {
        if (isTLModalOpen || isEditTlModalOpen) {
            AduanService.getJenisTindakLanjut()
                .then((data) => setJenisTlOptions(data))
                .catch((err) => {
                    console.error('Failed to fetch jenis tindak lanjut:', err);
                    setJenisTlOptions([]);
                });
        }
    }, [isTLModalOpen, isEditTlModalOpen]);



    const handlePrint = async () => {
        if (!aduan) return;
        setIsExportingPdf(true);
        try {
            AduanPdfService.exportDetail(aduan, lokasiObjekItems, qTindakLanjutList);
        } catch (err: any) {
            console.error('Failed to export PDF:', err);
            setFeedback({ type: 'error', message: `Gagal membuat PDF: ${err?.message || 'Error tidak diketahui'}` });
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handleDelete = async () => {
        if (!aduan || !isAdmin || !user) return;

        // Log activity BEFORE deleting (since aduan_id will be gone after delete)
        await ActivityService.logActivity({
            type: 'delete_aduan',
            description: `Menghapus aduan: ${aduan.nomorTiket || ''} - ${(aduan.perihal || '').substring(0, 30)}...`,
            userId: user.id,
            userName: user.displayName,
            metadata: { nomorTiket: aduan.nomorTiket, perihal: aduan.perihal }
        });

        deleteAduan(aduan.id, {
            onSuccess: () => {
                setFeedback({ type: 'success', message: 'Aduan berhasil dihapus.' });
                navigate('/pengaduan');
            },
            onError: (err: any) => {
                console.error(err);
                setFeedback({ type: 'error', message: `Gagal menghapus aduan: ${err.message || 'Error tidak diketahui'}` });
            }
        });
    };

    const handleDeleteTlConfirm = () => {
        if (!deleteTlConfirm) return;
        deleteTL(deleteTlConfirm.id);
        setDeleteTlConfirm(null);
    };

    const handleDeleteDocument = async () => {
        if (!deleteConfirmDoc || !aduan) return;
        setDeletingDocId(deleteConfirmDoc.id);
        try {
            await AduanService.deleteDocument(aduan.id, deleteConfirmDoc.id);
            setDeleteConfirmDoc(null);
            refetchAduan();
        } catch (err: any) {
            setFeedback({ type: 'error', message: `Gagal menghapus dokumen: ${err.message || 'Error tidak diketahui'}` });
        } finally {
            setDeletingDocId(null);
        }
    };

    const handleTLSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !aduan) return;
        if (!canInputRiwayatPenanganan) {
            setFeedback({ type: 'info', message: 'Riwayat penanganan hanya bisa diisi saat status aduan PROSES.' });
            return;
        }

        let fileUrls: string[] = [];

        try {
            // Upload files if exists
            if (tlForm.files && tlForm.files.length > 0) {
                fileUrls = await Promise.all(
                    tlForm.files.map((file, idx) =>
                        AduanService.uploadTindakLanjutFile(file, aduan.id, (p) => {
                            // Rata-rata progress semua file
                            setTlUploadProgress(Math.round((idx / tlForm.files!.length) * 100 + p / tlForm.files!.length));
                        })
                    )
                );
                setTlUploadProgress(0);
            }

            createTL({
                aduanId: aduan.id,
                tanggal: new Date(tlForm.tanggal),
                jenisTL: tlForm.jenisTL,
                keterangan: tlForm.keterangan,
                nomorSuratOutput: tlForm.nomorSuratOutput,
                fileUrls: fileUrls,
                createdBy: user.id,
                createdByName: user.displayName
            }, {
                onSuccess: () => {
                    setIsTLModalOpen(false);
                    setTlForm({
                        jenisTL: DEFAULT_JENIS_TL_SELECT_OPTIONS[0].value,
                        tanggal: new Date().toISOString().split('T')[0],
                        keterangan: '',
                        nomorSuratOutput: '',
                        files: []
                    });
                },
                onError: (err) => {
                    console.error(err);
                    setFeedback({ type: 'error', message: 'Gagal menyimpan tindak lanjut.' });
                }
            });
        } catch (uploadError) {
            console.error('File upload failed:', uploadError);
            setFeedback({ type: 'error', message: 'Gagal mengunggah file. Silakan coba lagi.' });
        }
    };

    const removeExistingTlFile = (index: number) => {
        setEditTlForm(prev => ({
            ...prev,
            fileUrls: prev.fileUrls.filter((_, i) => i !== index)
        }));
    };

    const handleEditTlNewFiles = (files: File[]) => {
        setEditTlForm(prev => ({ ...prev, newFiles: files }));
    };

    const handleEditTlNewFileRemoved = (idx: number) => {
        setEditTlForm(prev => {
            const updated = [...prev.newFiles];
            updated.splice(idx, 1);
            return { ...prev, newFiles: updated };
        });
    };

    const resetUploadModal = () => {
        setIsUploadModalOpen(false);
        setUploadFiles([]);
        setUploadFilesStatus([]);
        setUploadFilesProgress(0);
        setUploadPickerKey((k) => k + 1);
    };

    const handleUploadSubmit = async () => {
        if (!aduan || uploadFiles.length === 0) {
            setIsUploadModalOpen(false);
            return;
        }
        setIsUploadingSurat(true);
        try {
            const uploadResult = await AduanService.uploadAdditionalDocuments(aduan.id, uploadFiles, (progress) => {
                setUploadFilesProgress(progress.batchProgress);
                setUploadFilesStatus((prev) => updateUploadStatusAt(prev, uploadFiles, progress.fileIndex, {
                    status: progress.status,
                    progress: progress.status === 'error' ? undefined : progress.fileProgress,
                    message: progress.errorMessage,
                }));
            });
            await refetchAduan();
            resetUploadModal();
            if (uploadResult.errors.length > 0) {
                setFeedback({
                    type: 'info',
                    message: `Sebagian dokumen gagal diunggah (${uploadResult.errors.length} file).`
                });
            } else {
                setFeedback({ type: 'success', message: 'Dokumen berhasil diunggah.' });
            }
        } catch (err) {
            console.error('Failed to upload documents:', err);
            setFeedback({ type: 'error', message: 'Gagal mengunggah dokumen.' });
        } finally {
            setIsUploadingSurat(false);
        }
    };

    const openEditTlModal = (tl: TindakLanjut) => {
        setEditingTl(tl);
        setEditTlForm({
            id: tl.id,
            jenisTL: normalizeJenisTlLabel(tl.jenisTL),
            tanggal: new Date(tl.tanggal).toISOString().split('T')[0],
            keterangan: tl.keterangan || '',
            nomorSuratOutput: tl.nomorSuratOutput || '',
            fileUrls: tl.fileUrls || [],
            newFiles: []
        });
        setIsEditTlModalOpen(true);
    };

    const resetEditTlForm = () => {
        setIsEditTlModalOpen(false);
        setEditingTl(null);
        setEditTlForm({
            id: '',
            jenisTL: '',
            tanggal: new Date().toISOString().split('T')[0],
            keterangan: '',
            nomorSuratOutput: '',
            fileUrls: [],
            newFiles: []
        });
        setEditTlUploadProgress(0);
    };

    const handleEditTlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !aduan || !editingTl) return;

        let uploadedUrls: string[] = [];
        try {
            if (editTlForm.newFiles.length > 0) {
                uploadedUrls = await Promise.all(
                    editTlForm.newFiles.map((file, idx) =>
                        AduanService.uploadTindakLanjutFile(file, aduan.id, (p) => {
                            setEditTlUploadProgress(Math.round((idx / editTlForm.newFiles!.length) * 100 + p / editTlForm.newFiles!.length));
                        })
                    )
                );
                setEditTlUploadProgress(0);
            }

            const mergedFileUrls = [...(editTlForm.fileUrls || []), ...uploadedUrls];

            updateTL({
                id: editTlForm.id,
                aduanId: aduan.id,
                tanggal: new Date(editTlForm.tanggal),
                jenisTL: editTlForm.jenisTL,
                keterangan: editTlForm.keterangan,
                nomorSuratOutput: editTlForm.nomorSuratOutput,
                fileUrls: mergedFileUrls,
                createdBy: user.id,
                createdByName: user.displayName
            }, {
                onSuccess: () => {
                    resetEditTlForm();
                },
                onError: (err: any) => {
                    console.error(err);
                    setFeedback({ type: 'error', message: 'Gagal memperbarui tindak lanjut.' });
                }
            });
        } catch (err) {
            console.error('Gagal memperbarui tindak lanjut:', err);
            setFeedback({ type: 'error', message: 'Gagal memperbarui tindak lanjut.' });
        }
    };

    const openEditModal = async () => {
        if (!aduan) return;
        const baseForm = buildEditForm(aduan);
        setEditForm({
            ...baseForm,
            picName: !isAdmin ? (user?.displayName || user?.email || '') : baseForm.picName,
            picId: !isAdmin ? (user?.id || '') : baseForm.picId,
        });
        setSuratUploadProgress(0);
        setSuratFile(null);
        const storedSuratFileName = baseForm.fileUrl?.split('/').pop()?.split('?')[0] || 'Surat Terarsip';
        setSuratFileStatuses(baseForm.fileUrl ? buildStoredUploadState(storedSuratFileName) : []);

        // Initialize selected KPS list from current aduan detail first (instant UI parity with detail view)
        const fallbackList: KpsData[] = Array.isArray(aduan.kps_items) && aduan.kps_items.length > 0
            ? aduan.kps_items.map((item) => normalizeSelectedKps(item))
            : (((aduan.kps_ids && aduan.kps_ids.length > 0)
                ? aduan.kps_ids
                : (aduan.kpsId ? [aduan.kpsId] : [])
            ) as string[]).map((id: string, idx: number) => normalizeSelectedKps({
                id,
                nama_lembaga: aduan.nama_kps?.[idx] || '-',
                skema: aduan.jenis_kps?.[idx] || aduan.type_kps?.[idx] || '-',
                surat_keputusan: aduan.nomor_sk?.[idx] || '-',
                lokasi_prov: aduan.lokasi?.provinsi || '',
                lokasi_kab: aduan.lokasi?.kabupaten || '',
                lokasi_kec: aduan.lokasi?.kecamatan || '',
                lokasi_desa: aduan.lokasi?.desa || '',
                lokasi_luas_ha: Number(aduan.lokasi?.luasHa ?? aduan.lokasi_luas_ha ?? 0),
                jumlah_kk: Number(aduan.jumlahKK ?? aduan.jumlah_kk ?? 0),
                kps_type: aduan.type_kps?.[idx] || aduan.jenis_kps?.[idx] || '-',
            }));
        const selectedIds = fallbackList.map((item) => getNormalizedKpsId(item)).filter(Boolean);
        setEditSelectedKpsList(fallbackList);

        if (selectedIds.length > 0) {
            try {
                const list = await Promise.all(selectedIds.map((id: string) => KpsService.getKpsById(id)));
                const enriched = list
                    .map((item, idx: number) => normalizeSelectedKps(item || fallbackList[idx]))
                    .filter((item): item is KpsData => !!item);
                setEditSelectedKpsList(enriched);
            } catch (err) {
                console.error('Failed to load existing KPS data for edit', err);
                setEditSelectedKpsList(fallbackList);
            }
        } else {
            setEditSelectedKpsList(fallbackList);
        }

        setIsEditModalOpen(true);
    };

    const handleKpsSelect = (kps: KpsData) => {
        const normalizedKps = normalizeSelectedKps(kps);
        setEditSelectedKpsList((prev) => {
            const nextId = getNormalizedKpsId(normalizedKps);
            if (prev.some((item) => getNormalizedKpsId(item) === nextId)) return prev;
            const nextList = [...prev, normalizedKps];
            const totalLuas = nextList.reduce((sum, item) => sum + (Number(item.lokasi_luas_ha) || 0), 0);
            const totalKK = nextList.reduce((sum, item) => sum + (Number(item.jumlah_kk) || 0), 0);
            const first = nextList[0];
            setEditForm((current) => ({
                ...current,
                kpsId: first?.id || '',
                skema: (resolveKpsType(first) as any) || current.skema,
                skTerkait: nextList.map((item) => item.surat_keputusan || item.nomor_sk).filter(Boolean).join('; '),
                jumlahKK: totalKK,
                lokasiLuasHa: totalLuas,
                lokasiDesa: first?.lokasi_desa || current.lokasiDesa,
                lokasiKecamatan: first?.lokasi_kec || current.lokasiKecamatan,
                lokasiKabupaten: first?.lokasi_kab || current.lokasiKabupaten,
                lokasiProvinsi: first?.lokasi_prov || current.lokasiProvinsi,
                lokasiBalaiId: (first?.balai || '').toLowerCase().replace(/\s+/g, '_') || current.lokasiBalaiId,
                lokasiBalaiName: first?.balai || current.lokasiBalaiName,
            }));
            return nextList;
        });
    };

    const handleRemoveSelectedKps = (kpsId: string) => {
        setEditSelectedKpsList((prev) => {
            const nextList = prev.filter((item) => getNormalizedKpsId(item) !== kpsId);
            const totalLuas = nextList.reduce((sum, item) => sum + (Number(item.lokasi_luas_ha) || 0), 0);
            const totalKK = nextList.reduce((sum, item) => sum + (Number(item.jumlah_kk) || 0), 0);
            const first = nextList[0];
            setEditForm((current) => ({
                ...current,
                kpsId: first?.id || '',
                skema: (resolveKpsType(first) as any) || current.skema,
                skTerkait: nextList.map((item) => item.surat_keputusan || item.nomor_sk).filter(Boolean).join('; '),
                jumlahKK: totalKK,
                lokasiLuasHa: totalLuas,
                lokasiDesa: first?.lokasi_desa || '',
                lokasiKecamatan: first?.lokasi_kec || '',
                lokasiKabupaten: first?.lokasi_kab || '',
                lokasiProvinsi: first?.lokasi_prov || '',
                lokasiBalaiId: (first?.balai || '').toLowerCase().replace(/\s+/g, '_'),
                lokasiBalaiName: first?.balai || '',
            }));
            return nextList;
        });
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !aduan) return;

        try {
            if (emailError) {
                setFeedback({ type: 'info', message: emailError });
                return;
            }
            if (!editForm.pengaduNama.trim()) {
                setFeedback({ type: 'info', message: 'Nama pengadu wajib diisi.' });
                return;
            }
            if (!editForm.perihal.trim()) {
                setFeedback({ type: 'info', message: 'Perihal aduan wajib diisi.' });
                return;
            }

            let suratFileUrl = editForm.fileUrl;
            if (suratFile) {
                try {
                    setSuratFileStatuses((prev) => updateUploadStatusAt(prev, [suratFile], 0, {
                        status: 'uploading',
                        progress: 0,
                        message: undefined,
                    }));
                    suratFileUrl = await AduanService.uploadSuratMasuk(suratFile, aduan.id, (progress) => {
                        setSuratUploadProgress(progress);
                        setSuratFileStatuses((prev) => updateUploadStatusAt(prev, [suratFile], 0, {
                            status: 'uploading',
                            progress,
                            message: undefined,
                        }));
                    });
                    setSuratUploadProgress(100);
                    setSuratFileStatuses((prev) => updateUploadStatusAt(prev, [suratFile], 0, {
                        status: 'success',
                        progress: 100,
                        message: 'Berhasil diunggah ke server',
                    }));
                } catch (uploadError: any) {
                    console.error('Failed to upload surat masuk during edit:', uploadError);
                    setSuratUploadProgress(0);
                    setSuratFileStatuses((prev) => updateUploadStatusAt(prev, [suratFile], 0, {
                        status: 'error',
                        progress: undefined,
                        message: uploadError?.message || 'Lampiran surat masuk gagal diunggah.',
                    }));
                    setFeedback({
                        type: 'error',
                        message: `Upload surat masuk gagal: ${uploadError?.message || 'Lampiran surat masuk gagal diunggah.'}`
                    });
                    return;
                }
            }

            const updateData: Partial<Aduan> & { updatedBy?: string; updatedByName?: string; auditSource?: Partial<Aduan> | null } = {
                kps_ids: editSelectedKpsList.map((kps) => getNormalizedKpsId(kps)).filter(Boolean),
                nama_kps: editSelectedKpsList.map((kps) => kps.nama_lembaga || kps.nama_kps || '').filter(Boolean),
                jenis_kps: editSelectedKpsList.map((kps) => resolveKpsType(kps)).filter(Boolean),
                nomor_sk: editSelectedKpsList.map((kps) => kps.surat_keputusan || kps.nomor_sk || '').filter(Boolean),
                updatedBy: user.id,
                updatedByName: user.displayName,
                auditSource: aduan,
                perihal: editForm.perihal,
                ringkasanMasalah: editForm.ringkasanMasalah,
                picId: editForm.picId,
                picName: editForm.picName,
                skema: editForm.skema,
                jumlahKK: editForm.jumlahKK,
                skTerkait: editForm.skTerkait,
                suratMasuk: {
                    ...aduan.suratMasuk,
                    asalSurat: editForm.asalSurat,
                    perihal: editForm.suratPerihal,
                    asalSuratKategori: editForm.asalSuratKategori,
                    fileUrl: suratFileUrl
                },
                pengadu: {
                    ...aduan.pengadu,
                    nama: editForm.pengaduNama,
                    telepon: editForm.pengaduTelepon,
                    email: editForm.pengaduEmail
                },
                lokasi: {
                    ...aduan.lokasi,
                    desa: editForm.lokasiDesa,
                    kecamatan: editForm.lokasiKecamatan,
                    kabupaten: editForm.lokasiKabupaten,
                    provinsi: editForm.lokasiProvinsi,
                    luasHa: editForm.lokasiLuasHa,
                    balaiId: editForm.lokasiBalaiId,
                    balaiName: editForm.lokasiBalaiName
                },
            };

            updateAduan({ id: aduan.id, data: updateData }, {
                onSuccess: () => {
                    setIsEditModalOpen(false);
                    setEditSelectedKpsList([]);
                    setSuratFile(null);
                    setSuratUploadProgress(0);
                    setSuratFileStatuses([]);
                    setFeedback({
                        type: 'success',
                        message: 'Perubahan aduan berhasil disimpan.'
                    });
                },
                onError: (err: any) => {
                    console.error(err);
                    setFeedback({ type: 'error', message: `Gagal menyimpan perubahan: ${err.message || 'Error tidak diketahui'}` });
                }
            });
        } catch (err: any) {
            console.error('Error in submission:', err);
            setFeedback({ type: 'error', message: `Terjadi kesalahan: ${err.message || 'Error tidak diketahui'}` });
        }
    };

    const handleStatusUpdate = () => {
        if (!user || !aduan) return;
        if (statusForm.status === 'ditolak' && !statusForm.alasanPenolakan.trim()) {
            setFeedback({ type: 'info', message: 'Alasan penolakan wajib diisi jika status Ditolak.' });
            return;
        }
        setIsStatusSubmitting(true);
        updateAduan(
            {
                id: aduan.id,
                data: {
                    updatedBy: user.id,
                    updatedByName: user.displayName,
                    auditSource: aduan,
                    status: statusForm.status as any,
                    alasanPenolakan: statusForm.alasanPenolakan,
                },
            },
            {
                onSuccess: () => {
                    setIsStatusSubmitting(false);
                    setFeedback({ type: 'success', message: 'Status aduan berhasil diperbarui.' });
                },
                onError: (err: any) => {
                    setIsStatusSubmitting(false);
                    setFeedback({ type: 'error', message: `Gagal mengubah status: ${err.message || 'Error tidak diketahui'}` });
                },
            }
        );
    };

    const handleDownloadZip = async () => {
        if (allAttachments.length === 0) return;
        setIsDownloadingZip(true);
        try {
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            await Promise.all(
                allAttachments.map(async (file, index) => {
                    try {
                        const res = await fetchAuthorizedFile(file.url);
                        const blob = await res.blob();
                        const safeName = `${String(index + 1).padStart(2, '0')}_${file.fileName}`;
                        zip.file(safeName, blob);
                    } catch (err) {
                        console.warn(`Gagal mengunduh ${file.fileName}:`, err);
                    }
                })
            );
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lampiran-${aduan?.nomorTiket || aduan?.id || 'aduan'}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Gagal membuat ZIP:', err);
            setFeedback({ type: 'error', message: 'Gagal membuat file ZIP. Silakan coba lagi.' });
        } finally {
            setIsDownloadingZip(false);
        }
    };

    if (isLoadingAduan) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="text-muted-foreground animate-pulse">Menghubungkan ke database...</p>
            </div>
        );
    }

    if (isDeleting) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="text-muted-foreground animate-pulse font-semibold">Menghapus data...</p>
            </div>
        );
    }

    if (isAduanError || !aduan) {
        return (
            <Card className="max-w-md mx-auto mt-20 text-center border-none shadow-xl bg-background/50 backdrop-blur-md">
                <CardContent className="pt-10 pb-10">
                    <AlertTriangle className="h-16 w-16 text-destructive/50 mx-auto mb-6" />
                    <h2 className="text-xl font-bold mb-3">
                        {isAduanError ? 'Terjadi Kesalahan' : 'Aduan Tidak Ditemukan'}
                    </h2>
                    <p className="text-muted-foreground mb-8 text-balance px-4">
                        {isAduanError
                            ? (detailError || 'Gagal menyambung ke server. Silakan periksa koneksi internet Anda.')
                            : 'Maaf, aduan yang Anda cari tidak dapat ditemukan atau sudah dihapus.'}
                    </p>
                    <div className="flex flex-col gap-3 px-6">
                        <Button
                            variant="primary"
                            className="w-full font-semibold shadow-lg shadow-black/10"
                            onClick={() => navigate('/pengaduan')}
                        >
                            Ke Daftar Aduan
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-muted-foreground"
                            onClick={() => window.location.reload()}
                        >
                            Coba Lagi
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Progress steps and index removed - no longer using the stepper UI


    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    const problemDescriptionCard = (
        <Card className="overflow-hidden rounded-2xl border border-border/80 shadow-sm">
            <CardHeader className="border-b border-border/70 bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText size={16} />
                    </div>
                    Ringkasan Permasalahan
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <h3 className="mb-3 text-lg font-semibold text-foreground">
                    {aduan.perihal}
                </h3>
                <div className="prose prose-slate prose-sm max-w-none text-sm leading-relaxed text-muted-foreground">
                    {aduan.ringkasanMasalah ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{aduan.ringkasanMasalah}</ReactMarkdown>
                    ) : (
                        <span className="italic text-muted-foreground">Tidak ada ringkasan detail.</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700"
        >
            {feedback && (
                <div className="sticky top-20 z-30 no-print">
                    <div
                        className={cn(
                            "mx-auto flex max-w-3xl items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm backdrop-blur",
                            feedback.type === 'success' && "border-emerald-500/20 bg-emerald-50 text-emerald-800",
                            feedback.type === 'error' && "border-destructive/20 bg-destructive/10 text-destructive",
                            feedback.type === 'info' && "border-primary/20 bg-primary/10 text-primary"
                        )}
                    >
                        {feedback.type === 'error' ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle size={16} className="mt-0.5 shrink-0" />}
                        <p className="text-sm font-medium">{feedback.message}</p>
                        <button
                            type="button"
                            onClick={() => setFeedback(null)}
                            className="ml-auto rounded-md px-2 py-1 text-xs font-semibold opacity-70 transition hover:opacity-100"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            {/* Print Header - Only visible when printing */}
            <div className="hidden print:block print-header">
                <div>
                    <h1 className="text-xl font-semibold">KitapantauSH - Sistem Pemantauan Aduan</h1>
                    <p className="text-sm text-muted-foreground">Direktorat Pengendalian Perhutanan Sosial</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-semibold">Laporan Detail Aduan</p>
                    <p className="text-xs text-muted-foreground">Tiket: {aduan.nomorTiket}</p>
                    <p className="text-xs text-muted-foreground">Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
            </div>

            {/* Print Summary Table - Only visible when printing */}
            <div className="hidden print:block border rounded-lg p-4 mb-4">
                <table className="w-full text-sm border-collapse">
                    <tbody>
                        <tr className="border-b">
                            <td className="py-2 font-semibold w-1/4 bg-muted px-2 text-[10px] uppercase">No. Tiket</td>
                            <td className="py-2 px-2 font-mono">{aduan.nomorTiket}</td>
                            <td className="py-2 font-semibold w-1/4 bg-muted px-2 text-[10px] uppercase">Status Aduan</td>
                            <td className="py-2 px-2 font-semibold uppercase">{aduan.status}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 font-semibold bg-muted px-2 text-[10px] uppercase">Kategori</td>
                            <td className="py-2 px-2 capitalize">{aduan.kategoriMasalah?.replace(/_/g, ' ') || '-'}</td>
                            <td className="py-2 font-semibold bg-muted px-2 text-[10px] uppercase">Prioritas</td>
                            <td className="py-2 px-2 uppercase">{aduan.prioritas}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 font-semibold bg-muted px-2 text-[10px] uppercase">Nama Pengadu</td>
                            <td className="py-2 px-2 font-semibold text-foreground">{aduan.pengadu.nama}</td>
                            <td className="py-2 font-semibold bg-muted px-2 text-[10px] uppercase">Kontak/HP</td>
                            <td className="py-2 px-2">{aduan.pengadu.telepon || '-'}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 font-semibold bg-muted px-2 text-[10px] uppercase">Instansi/Kelompok</td>
                            <td className="py-2 px-2" colSpan={3}>{aduan.pengadu.instansi || '-'}</td>
                        </tr>
                        <tr>
                            <td className="py-2 font-semibold bg-muted px-2 text-[10px] uppercase">PIC Petugas</td>
                            <td className="py-2 px-2">{aduan.picName || 'Belum ditentukan'}</td>
                            <td className="py-2 font-semibold bg-muted px-2 text-[10px] uppercase">Tgl Masuk</td>
                            <td className="py-2 px-2">{formatDate(aduan.createdAt || new Date())}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Print Master KPS Info */}
            {lokasiObjekItems.length > 0 && (
                <div className="hidden print:block border rounded-lg p-4 mb-4 avoid-break">
                    <h3 className="font-semibold text-[11px] mb-3 border-b-2 border-primary pb-2 uppercase tracking-widest text-primary">LOKASI OBJEK</h3>
                    <table className="w-full text-xs border-collapse border border-border">
                        <thead>
                            <tr className="bg-muted">
                                <th className="p-1.5 border border-border text-left">id</th>
                                <th className="p-1.5 border border-border text-left">nama_lembaga</th>
                                <th className="p-1.5 border border-border text-left">surat_keputusan</th>
                                <th className="p-1.5 border border-border text-left">skema</th>
                                <th className="p-1.5 border border-border text-left">provinsi</th>
                                <th className="p-1.5 border border-border text-left">kabupaten</th>
                                <th className="p-1.5 border border-border text-left">luas_total</th>
                                <th className="p-1.5 border border-border text-left">anggota_pria</th>
                                <th className="p-1.5 border border-border text-left">anggota_wanita</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lokasiObjekItems.map((item, index) => (
                                <tr key={`print-kps-${index}`}>
                                    <td className="p-1.5 border border-border">{item.idApiKps}</td>
                                    <td className="p-1.5 border border-border">{item.namaKps}</td>
                                    <td className="p-1.5 border border-border">{item.noSk}</td>
                                    <td className="p-1.5 border border-border">{item.kpsType}</td>
                                    <td className="p-1.5 border border-border">{item.provinsi}</td>
                                    <td className="p-1.5 border border-border">{item.kabupaten}</td>
                                    <td className="p-1.5 border border-border">{(Number(item.luasHa) || 0).toLocaleString('id-ID')} Ha</td>
                                    <td className="p-1.5 border border-border">{(Number(item.anggotaPria) || 0).toLocaleString('id-ID')}</td>
                                    <td className="p-1.5 border border-border">{(Number(item.anggotaWanita) || 0).toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Print - Perihal & Ringkasan */}
            <div className="hidden print:block border rounded-lg p-4 mb-4 avoid-break shadow-sm">
                <h3 className="font-semibold text-sm mb-2 border-b pb-2">PERIHAL / RINGKASAN PERMASALAHAN</h3>
                <p className="font-semibold mb-2">"{aduan.perihal}"</p>
                <p className="text-sm whitespace-pre-wrap">{aduan.ringkasanMasalah}</p>
            </div>

            {/* Print - Riwayat Dokumen Tindak Lanjut */}
            {qTindakLanjutList.length > 0 && (
                <div className="hidden print:block border rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-sm mb-3 border-b pb-2 uppercase tracking-wide">RIWAYAT DOKUMEN TINDAK LANJUT ({qTindakLanjutList.length} catatan)</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted">
                                <th className="py-2 px-2 text-left font-semibold w-8">No</th>
                                <th className="py-2 px-2 text-left font-semibold w-24">Tanggal</th>
                                <th className="py-2 px-2 text-left font-semibold w-32">Jenis Dokumen</th>
                                <th className="py-2 px-2 text-left font-semibold">Keterangan</th>
                                <th className="py-2 px-2 text-left font-semibold w-28">Oleh</th>
                            </tr>
                        </thead>
                        <tbody>
                            {qTindakLanjutList.map((tl, index) => (
                                <tr key={tl.id} className="border-b">
                                    <td className="py-2 px-2 align-top">{index + 1}</td>
                                    <td className="py-2 px-2 align-top text-xs">{formatDate(tl.tanggal)}</td>
                                    <td className="py-2 px-2 align-top font-medium">{normalizeJenisTlLabel(tl.jenisTL)}</td>
                                    <td className="py-2 px-2 align-top">{tl.keterangan}</td>
                                    <td className="py-2 px-2 align-top text-xs">{tl.createdByName}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}



            {/* Sticky Header Area */}
            <div className="sticky top-0 z-20 no-print transition-all">
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-white/90 px-5 py-5 shadow-sm backdrop-blur-xl">
                    <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-primary/5 via-transparent to-transparent pointer-events-none" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate('/pengaduan')}
                                    className="h-8 rounded-lg px-2.5 text-muted-foreground hover:bg-muted"
                                    leftIcon={<ArrowLeft size={14} />}
                                >
                                    Kembali
                                </Button>
                                <span className="text-muted-foreground/40">|</span>
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    <Tag size={12} />
                                    <span>{aduan.kategoriMasalah || '-'}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{aduan.nomorTiket}</h1>
                                    <StatusBadge status={aduan.status || 'baru'} className="shadow-none" />
                                </div>
                                <p className="max-w-3xl text-sm text-muted-foreground">{aduan.perihal || 'Tanpa perihal'}</p>
                                <div className={cn(
                                    "inline-flex w-fit items-start gap-2 rounded-2xl border px-3 py-2 text-xs font-medium",
                                    statusAccentClass
                                )}>
                                    <Sparkles size={14} className="mt-0.5 shrink-0" />
                                    <span>{nextActionLabel}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 xl:items-end">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[420px]">
                                {overviewCards.map((card) => (
                                    <div key={card.label} className="rounded-2xl border border-border/70 bg-white/80 p-3 shadow-sm">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{card.label}</p>
                                            <card.icon size={13} className="text-muted-foreground" />
                                        </div>
                                        <p className="mt-2 text-sm font-semibold text-foreground">{card.value}</p>
                                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{card.hint}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<FileText size={15} />}
                                    onClick={handlePrint}
                                    className="h-9 rounded-xl px-4"
                                    isLoading={isExportingPdf}
                                >
                                    PDF
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Upload size={15} />}
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="h-9 rounded-xl px-4"
                                >
                                    Upload
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    leftIcon={<Edit size={15} />}
                                    onClick={openEditModal}
                                    className="h-9 rounded-xl px-4"
                                >
                                    Edit Data
                                </Button>
                                {isAdmin && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={<Trash2 size={15} />}
                                        onClick={() => setIsDeleteAduanConfirmOpen(true)}
                                        isLoading={isDeleting}
                                        className="h-9 rounded-xl px-4 text-destructive hover:bg-destructive/10"
                                    >
                                        Hapus
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <motion.div variants={itemVariants} className="no-print">
                {problemDescriptionCard}
            </motion.div>

            <motion.div variants={itemVariants} className="no-print grid grid-cols-1 gap-3 lg:grid-cols-[1.7fr_1fr]">
                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                            <Sparkles size={18} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fokus Penanganan</p>
                            <p className="text-sm font-semibold text-foreground">{nextActionLabel}</p>
                            <p className="text-xs text-muted-foreground">
                                {canInputRiwayatPenanganan
                                    ? 'Riwayat penanganan sudah terbuka. Tambah catatan baru jika ada perkembangan.'
                                    : 'Riwayat penanganan baru bisa ditambah saat status aduan berada di PROSES.'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kondisi Saat Ini</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={aduan.status || 'baru'} className="shadow-none" />
                        {aduan.picName && <Badge variant="outline">{aduan.picName}</Badge>}
                        <Badge variant="outline">{lokasiObjekItems.length} KPS</Badge>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        {latestTindakLanjut ? `Update terakhir: ${latestTindakLanjutLabel}.` : 'Belum ada update tindak lanjut yang tercatat.'}
                    </p>
                </div>
            </motion.div>

            {/* Rejection Alert Banner */}
            {aduan.status === 'ditolak' && (
                <div className="mx-1 bg-destructive/5 border border-destructive/20 p-4 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500 no-print flex items-start gap-4 shadow-sm">
                    <div className="p-2 bg-destructive/10 rounded-full h-fit text-destructive shrink-0">
                        <AlertCircle size={20} />
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                        <div className="flex justify-between items-start gap-4">
                            <h3 className="font-semibold text-destructive text-sm uppercase tracking-wider">Aduan Ditolak</h3>
                            {aduan.ditolakAt && (
                                <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded-md text-destructive font-medium border border-destructive/10">
                                    {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(aduan.ditolakAt))}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                            {aduan.alasanPenolakan || 'Tidak ada alasan penolakan yang dicatat.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Professional Status Timeline */}
            <motion.div
                variants={itemVariants}
                className="relative overflow-hidden sm:rounded-2xl border-y sm:border border-border/60 bg-white dark:bg-card p-6 no-print"
            >
                {/* Background decorative gradient */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-muted/70 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 px-4 py-2">
                    {[
                        { id: 'proses', label: 'PROSES', icon: Sparkles, activeStatuses: ['proses'] },
                        { id: 'selesai', label: 'SELESAI', icon: aduan.status === 'ditolak' ? AlertCircle : CheckCircle, activeStatuses: ['selesai', 'ditolak'] }
                    ].map((step, index, array) => {
                        const currentStatus = aduan.status;

                        // Logic to check if any of the following steps are active (meaning this step is done)
                        const isCompleted = array.slice(index + 1).some(s => s.activeStatuses.includes(currentStatus));
                        const isActive = step.activeStatuses.includes(currentStatus);
                        const isError = step.id === 'selesai' && currentStatus === 'ditolak';
                        const isLastStep = index === array.length - 1;

                        return (
                            <div key={step.id} className="flex-1 w-full relative group">
                                {/* Connector Line */}
                                {index < array.length - 1 && (
                                    <div className="hidden md:block absolute top-5 left-1/2 w-full h-[2px] bg-muted -z-0 rounded-full">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: isCompleted ? '100%' : '0%' }}
                                            transition={{ duration: 0.8, delay: index * 0.2 }}
                                            className="h-full bg-foreground/70 rounded-full"
                                        />
                                    </div>
                                )}

                                <div className="flex flex-row md:flex-col items-center gap-4 md:gap-4 relative z-10">
                                    <motion.div
                                        initial={false}
                                        animate={{
                                            scale: isActive ? 1.15 : 1,
                                            backgroundColor: isActive ? (isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(var(--primary-rgb), 0.1)') : (isCompleted ? 'rgba(var(--primary-rgb), 1)' : 'rgba(255, 255, 255, 1)'),
                                            borderColor: isActive ? (isError ? 'rgba(239, 68, 68, 1)' : 'rgba(var(--primary-rgb), 1)') : (isCompleted ? 'rgba(var(--primary-rgb), 0)' : 'rgba(226, 232, 240, 1)'),
                                            color: isActive ? (isError ? '#EF4444' : 'rgb(var(--primary-rgb))') : (isCompleted ? '#fff' : '#94a3b8')
                                        }}
                                        className={cn(
                                            "h-12 w-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 shadow-sm",
                                            isActive && "shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]",
                                            !isActive && !isCompleted && "bg-secondary"
                                        )}
                                    >
                                        <step.icon
                                            size={22}
                                            strokeWidth={isActive ? 2.5 : 2}
                                        />
                                    </motion.div>

                                    <div className="flex flex-col items-start md:items-center gap-1">
                                        <span className={cn(
                                            "text-[11px] font-bold uppercase tracking-[0.15em] transition-colors duration-500",
                                            isActive ? (isError ? 'text-destructive' : 'text-foreground') : (isCompleted ? 'text-foreground' : 'text-muted-foreground')
                                        )}>
                                            {step.label}
                                        </span>
                                        {isActive && !isLastStep && (
                                            <motion.span
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-[10px] font-medium text-foreground/80 bg-muted px-2 py-0.5 rounded-full max-w-[260px] line-clamp-1"
                                            >
                                                {latestTindakLanjutLabel}
                                            </motion.span>
                                        )}
                                        {isActive && isLastStep && (
                                            <motion.span
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={cn(
                                                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                                    isError ? "text-destructive/80 bg-destructive/5" : "text-muted-foreground bg-muted"
                                                )}
                                            >
                                                {isError ? 'Ditolak' : 'Selesai'}
                                            </motion.span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </motion.div>

            {/* Status Card — Admin Only */}
            {isAdmin && (
                <motion.div
                    variants={itemVariants}
                    className="no-print relative overflow-hidden sm:rounded-2xl border-y sm:border border-border/60 bg-white dark:bg-card p-6"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Settings size={15} className="text-muted-foreground" />
                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                            Ubah Status Aduan
                        </span>
                        <StatusBadge status={aduan.status} className="ml-auto" />
                    </div>
                    <div className="space-y-3">
                        <Select
                            label="Status Baru"
                            options={masterStatuses.length > 0
                                ? masterStatuses.map(s => ({ value: s.nama_status, label: s.nama_status.toUpperCase() }))
                                : [
                                    { value: 'proses', label: 'PROSES' },
                                    { value: 'selesai', label: 'SELESAI' },
                                    { value: 'ditolak', label: 'DITOLAK' },
                                ]
                            }
                            value={statusForm.status}
                            onChange={(val) => setStatusForm(prev => ({ ...prev, status: val, alasanPenolakan: val !== 'ditolak' ? '' : prev.alasanPenolakan }))}
                            fullWidth
                        />
                        {statusForm.status === 'ditolak' && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <Textarea
                                    label="Alasan Penolakan"
                                    placeholder="Jelaskan alasan mengapa aduan ini ditolak..."
                                    value={statusForm.alasanPenolakan}
                                    onChange={(e) => setStatusForm(prev => ({ ...prev, alasanPenolakan: e.target.value }))}
                                    fullWidth
                                    rows={3}
                                    required
                                />
                                <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                                    <AlertCircle size={10} /> Wajib diisi jika status Ditolak
                                </p>
                            </div>
                        )}
                        <Button
                            type="button"
                            onClick={handleStatusUpdate}
                            disabled={isStatusSubmitting || statusForm.status === aduan.status}
                            size="sm"
                            className="w-full sm:w-auto"
                        >
                            {isStatusSubmitting ? 'Menyimpan...' : 'Simpan Status'}
                        </Button>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                {/* Main Info Column */}
                <div className="flex flex-col gap-6 xl:col-span-8">
                    {/* Summary Info - Always 2 columns for Pengadu & Surat Masuk */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="h-full overflow-hidden rounded-2xl border border-border/80 shadow-sm">
                            <CardHeader className="bg-muted/30 py-4 border-b border-border/70">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-foreground">
                                    <User className="h-4 w-4" />
                                    Data Pengadu
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="py-6 flex flex-col gap-5">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Nama Lengkap</span>
                                    <span className="font-semibold text-foreground">{aduan.pengadu.nama}</span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Informasi Kontak</span>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                                                <Phone size={14} />
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-foreground">{aduan.pengadu.telepon || 'Tidak tersedia'}</span>
                                            {aduan.pengadu.telepon && (
                                                <a href={`tel:${aduan.pengadu.telepon}`} className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
                                                    <ExternalLink size={12} />
                                                </a>
                                            )}
                                        </div>
                                        {aduan.pengadu.email && (
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-primary">
                                                    <Globe size={14} />
                                                </div>
                                                <span className="text-xs font-semibold text-foreground break-all">{aduan.pengadu.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Instansi / Kelompok</span>
                                    <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                            <Briefcase size={14} />
                                        </div>
                                        <span>{aduan.pengadu.instansi || <span className="text-muted-foreground italic">Personal / Umum</span>}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="h-full overflow-hidden rounded-2xl border border-border/80 shadow-sm">
                            <CardHeader className="bg-muted/30 py-4 border-b border-border/70">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-foreground">
                                    <FileText className="h-4 w-4" />
                                    Administrasi Surat
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="py-6 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Nomor Surat</span>
                                        <span className="font-semibold text-foreground text-[11px] font-mono bg-muted px-2 py-1 rounded border border-border">{aduan.suratMasuk.nomorSurat}</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tgl Masuk</span>
                                        <span className="text-sm font-semibold text-foreground">{formatDate(aduan.suratMasuk.tanggalSurat)}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Asal & Perihal</span>
                                    <div className="space-y-2">
                                        <Badge variant="outline" className="bg-muted/60 text-primary border-border font-semibold text-[9px] uppercase tracking-widest">{aduan.suratMasuk.asalSuratKategori || 'Masyarakat'}</Badge>
                                        <p className="text-sm font-semibold text-foreground leading-tight">
                                            {aduan.suratMasuk.perihal || <span className="text-muted-foreground/60 italic font-medium">Tidak dicantumkan</span>}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <Card className="overflow-hidden rounded-2xl border border-border/80 shadow-sm">
                        <CardHeader className="bg-muted/30 py-4 border-b border-border/70">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-foreground">
                                <MapPin className="h-4 w-4" />
                                Lokasi Objek
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-4">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border">
                                    Total KPS: {lokasiObjekItems.length}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border">
                                    Total luas_total: {totalLuasObjek.toLocaleString('id-ID')} Ha
                                </Badge>
                                <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border">
                                    Total anggota_pria: {totalAnggotaPriaObjek.toLocaleString('id-ID')}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border">
                                    Total anggota_wanita: {totalAnggotaWanitaObjek.toLocaleString('id-ID')}
                                </Badge>
                            </div>
                            {lokasiObjekItems.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                                    Belum ada KPS yang tertaut pada aduan ini.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {lokasiObjekItems.map((item, index) => (
                                    <div key={`lokasi-kps-${index}`} className="rounded-xl border border-border/80 bg-white p-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">id</span>
                                                <span className="text-sm font-mono text-foreground">{item.idApiKps}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">nama_lembaga</span>
                                                <span className="text-sm font-semibold text-foreground">{item.namaKps}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">surat_keputusan</span>
                                                <span className="text-sm font-mono text-foreground">{item.noSk}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">skema</span>
                                                <span className="text-sm font-semibold text-foreground">{item.kpsType}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">provinsi</span>
                                                <span className="text-sm text-foreground">{item.provinsi}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">kabupaten</span>
                                                <span className="text-sm text-foreground">{item.kabupaten}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">luas_total</span>
                                                <Badge variant="outline" className="w-fit">{(Number(item.luasHa) || 0).toLocaleString('id-ID')} Ha</Badge>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">anggota_pria</span>
                                                <Badge variant="outline" className="w-fit">{(Number(item.anggotaPria) || 0).toLocaleString('id-ID')}</Badge>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">anggota_wanita</span>
                                                <Badge variant="outline" className="w-fit">{(Number(item.anggotaWanita) || 0).toLocaleString('id-ID')}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>



                    {/* Dokumen Tindak Lanjut Timeline */}
                    <motion.div variants={itemVariants}>
                        <Card className="overflow-hidden rounded-2xl border border-border/80 shadow-sm">
                            <CardHeader
                                className="border-b border-border/70 bg-muted/30 py-4 flex flex-row items-center justify-between"
                                action={
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        leftIcon={<Plus size={14} />}
                                        onClick={() => setIsTLModalOpen(true)}
                                        disabled={!canInputRiwayatPenanganan}
                                    >
                                        Tambah Dokumen
                                    </Button>
                                }
                            >
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-foreground">
                                    <div className="h-8 w-8 rounded-lg bg-muted text-foreground flex items-center justify-center">
                                        <Clock size={16} />
                                    </div>
                                    Riwayat Penanganan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                {!canInputRiwayatPenanganan && (
                                    <p className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                                        Ubah status aduan ke <span className="font-semibold text-foreground">PROSES</span> untuk menambah Riwayat Penanganan.
                                    </p>
                                )}
                                <div className="flex flex-col gap-4">
                                    {qTindakLanjutList.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-6 italic">
                                            Belum ada langkah penanganan
                                        </p>
                                    ) : (
                                        qTindakLanjutList.map((tl, index) => (
                                            <div key={tl.id} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-border/80 relative overflow-hidden group shadow-sm">
                                                {/* Decorative element */}
                                                <div className={cn(
                                                    "absolute left-0 top-0 bottom-0 w-1",
                                                    index === 0 ? "bg-foreground/70" : "bg-muted-foreground/40"
                                                )} />

                                                <div className={cn(
                                                    "h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm",
                                                    index === 0 ? "bg-foreground/80" : "bg-muted-foreground/60"
                                                )}>
                                                    {qTindakLanjutList.length - index}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] font-bold text-foreground uppercase tracking-tight">{normalizeJenisTlLabel(tl.jenisTL)}</span>
                                                            {tl.nomorSuratOutput && (
                                                                <Badge variant="outline" className="text-[9px] px-1.5 h-5 bg-white border-border text-muted-foreground font-mono">
                                                                    {tl.nomorSuratOutput}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium bg-white px-2 py-0.5 rounded-full border border-border">
                                                            <Calendar size={10} />
                                                            {formatDate(tl.tanggal)}
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mb-3 prose prose-slate prose-sm max-w-none leading-relaxed">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{tl.keterangan}</ReactMarkdown>
                                                    </div>
                                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
                                                            <div className="flex items-center gap-2">
                                                            {tl.fileUrls && tl.fileUrls.length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {tl.fileUrls.filter(Boolean).map((url, i) => {
                                                                        const fileName = url?.split('/').pop()?.split('?')[0] || `Lampiran ${i + 1}`;
                                                                        const displayName = fileName.includes('_') ? fileName.split('_').slice(1).join('_') : fileName;
                                                                        return (
                                                                            <button
                                                                                key={i}
                                                                                type="button"
                                                                                onClick={() => void openProtectedFile(url, displayName)}
                                                                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted text-foreground hover:bg-muted transition-colors text-[10px] font-medium border border-border"
                                                                                title={fileName}
                                                                            >
                                                                                <FileText size={10} />
                                                                                <span className="max-w-[150px] truncate">{displayName}</span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                            {isAdmin && (
                                                                <button
                                                                    onClick={() => openEditTlModal(tl)}
                                                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                                    title="Edit Dokumen"
                                                                >
                                                                    <Edit size={12} />
                                                                </button>
                                                            )}
                                                                {isAdmin && (
                                                                    <button
                                                                        onClick={() => setDeleteTlConfirm({ id: tl.id, label: normalizeJenisTlLabel(tl.jenisTL) })}
                                                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                                        title="Hapus Riwayat"
                                                                    >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                                                                <User size={10} className="text-muted-foreground" />
                                                                Oleh: {tl.createdByName}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                <div className="flex flex-col gap-6 self-start xl:col-span-4 xl:sticky xl:top-28">
                    <motion.div variants={itemVariants}>
                        <Card className="overflow-hidden rounded-2xl border border-border/80 shadow-sm">
                            <CardHeader className="border-b border-border/70 bg-muted/20 py-4">
                                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-[0.15em] uppercase text-foreground">
                                    <Zap className="h-4 w-4" />
                                    Panel Tindakan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 p-5">
                                <div className={cn(
                                    "rounded-2xl border px-3 py-3 text-sm",
                                    statusAccentClass
                                )}>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">Aksi berikutnya</p>
                                    <p className="mt-1 font-semibold">{nextActionLabel}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        leftIcon={<FileText size={14} />}
                                        onClick={handlePrint}
                                        isLoading={isExportingPdf}
                                        className="justify-start"
                                    >
                                        Export PDF
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        leftIcon={<Upload size={14} />}
                                        onClick={() => setIsUploadModalOpen(true)}
                                        className="justify-start"
                                    >
                                        Upload Berkas
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        leftIcon={<Plus size={14} />}
                                        onClick={() => setIsTLModalOpen(true)}
                                        disabled={!canInputRiwayatPenanganan}
                                        className="justify-start"
                                    >
                                        Tambah Dokumen
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        leftIcon={<Edit size={14} />}
                                        onClick={openEditModal}
                                        className="justify-start"
                                    >
                                        Edit Aduan
                                    </Button>
                                </div>
                                <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                                    {isAdmin
                                        ? 'Sebagai admin, Anda juga dapat mengubah status dan menghapus aduan dari panel di halaman ini.'
                                        : 'Perubahan status dan penghapusan aduan hanya dapat dilakukan oleh admin.'}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* PIC Info Card */}
                    <motion.div variants={itemVariants}>
                        <Card className="overflow-hidden rounded-2xl border border-border/80 shadow-sm">
                            <CardContent className="p-6 space-y-5">
                                <div>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Penanggung Jawab (PIC)</p>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-muted text-foreground flex items-center justify-center font-semibold text-lg">
                                            {(aduan?.picName || 'U').charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">{aduan?.picName || 'Belum Ditetapkan'}</p>
                                            <p className="text-xs text-muted-foreground">{latestTindakLanjut ? `Update terakhir ${formatDate(latestTindakLanjut.tanggal)}` : 'Belum ada update tindak lanjut'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-muted/20 p-3">
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">KPS Terkait</p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">{lokasiObjekItems.length}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Lampiran</p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">{allAttachments.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Resources */}
                    <div>
                        <Card className="overflow-hidden rounded-2xl border border-border/80 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/70 bg-muted/20">
                                <CardTitle className="text-xs font-semibold tracking-[0.15em] uppercase text-foreground">Lampiran & Berkas</CardTitle>
                                <div className="flex items-center gap-2">
                                    {allAttachments.length > 0 && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 rounded-lg text-[10px] font-semibold uppercase border-border hover:bg-muted"
                                            onClick={handleDownloadZip}
                                            disabled={isDownloadingZip}
                                        >
                                            <Download size={12} className="mr-1.5" />
                                            {isDownloadingZip ? 'Memproses...' : 'ZIP'}
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 rounded-lg text-[10px] font-semibold uppercase border-border hover:bg-muted"
                                        onClick={() => setIsUploadModalOpen(true)}
                                    >
                                        <Upload size={12} className="mr-1.5" /> Upload
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 flex flex-col gap-4">
                                {/* Unified Attachment List */}
                                <div className="flex flex-col gap-3">
                                    {allAttachments.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                                            Belum ada lampiran
                                        </div>
                                    )}

                                    {allAttachments.map((file) => (
                                        <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl border bg-white hover:border-border hover:bg-muted/60 transition-all group">
                                            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-muted text-primary">
                                                {file.source === 'Dokumen Tindak Lanjut' ? <FolderOpen size={20} /> : <FileText size={20} />}
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="text-xs font-semibold text-foreground truncate pr-2">
                                                    {file.fileName}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-semibold">
                                                        {file.source}
                                                    </Badge>
                                                    <span className="text-[10px] text-muted-foreground truncate">{file.meta}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {isAdmin && file.rawId && (
                                                    <button
                                                        onClick={() => setDeleteConfirmDoc({ id: file.rawId!, fileName: file.fileName })}
                                                        disabled={deletingDocId === file.rawId}
                                                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                                                        title="Hapus file"
                                                    >
                                                        {deletingDocId === file.rawId ? (
                                                            <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                                        ) : (
                                                            <Trash2 size={14} />
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => void openProtectedFile(file.url, file.fileName)}
                                                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-primary transition-colors"
                                                    title="Buka File"
                                                >
                                                    <ExternalLink size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Dokumen Tindak Lanjut Modal */}
            <Modal
                isOpen={isTLModalOpen}
                onClose={() => setIsTLModalOpen(false)}
                title="Tambah Dokumen"
                description="Catat dokumen atau hasil penanganan terbaru agar jejak proses aduan tetap lengkap."
                className="max-w-3xl rounded-2xl border-border/80 bg-white p-6"
                size="xl"
            >
                <form onSubmit={handleTLSubmit} className="flex flex-col gap-5">
                    <div className="rounded-xl border border-border/70 bg-muted/25 p-4 space-y-4">
                        <Select
                            label="Jenis Dokumen"
                            options={jenisTlSelectOptions}
                            value={tlForm.jenisTL}
                            onChange={(val) => setTlForm({ ...tlForm, jenisTL: val })}
                            fullWidth
                        />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Input
                                label="Tanggal Dokumen / Tindak Lanjut"
                                type="date"
                                value={tlForm.tanggal}
                                onChange={(e) => setTlForm({ ...tlForm, tanggal: e.target.value })}
                                required
                                fullWidth
                            />
                            <Input
                                label="Nomor Dokumen"
                                placeholder="Contoh: S.123/PKPS/..."
                                value={tlForm.nomorSuratOutput}
                                onChange={(e) => setTlForm({ ...tlForm, nomorSuratOutput: e.target.value })}
                                fullWidth
                                leftIcon={<FileText size={16} />}
                            />
                        </div>
                        <Textarea
                            label="Keterangan / Hasil"
                            placeholder="Uraikan secara ringkas hasil dokumen atau tindak lanjut yang dicatat di sini..."
                            value={tlForm.keterangan}
                            onChange={(e) => setTlForm({ ...tlForm, keterangan: e.target.value })}
                            rows={5}
                            required
                            fullWidth
                        />
                    </div>

                    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-4">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                            Upload Dokumen / Foto (Opsional)
                        </label>
                        <FileUpload
                            onFileSelected={(files) => setTlForm({ ...tlForm, files })}
                            onFileRemoved={(idx) => {
                                const newFiles = [...(tlForm.files || [])];
                                newFiles.splice(idx, 1);
                                setTlForm({ ...tlForm, files: newFiles });
                            }}
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.zip,.shp,.dbf,.prj,.shx,.mp3,.m4a,.wav,.ogg,.aac"
                            maxSizeMB={10}
                            helperText="Klik atau seret file dokumen/foto hasil tindak lanjut di sini"
                            uploadProgress={tlUploadProgress}
                        />
                    </div>

                    <ModalFooter className="sticky bottom-0 z-10 -mx-1 border-t border-border/80 bg-white/95 px-1 pt-4 pb-1 backdrop-blur">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsTLModalOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isTLSubmitting}
                            leftIcon={<Plus size={18} />}
                        >
                            Simpan Dokumen
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Edit Dokumen Tindak Lanjut Modal */}
            <Modal
                isOpen={isEditTlModalOpen}
                onClose={resetEditTlForm}
                title="Edit Dokumen"
                description="Perbarui catatan dokumen atau tindak lanjut tanpa membuat catatan baru."
                className="max-w-3xl rounded-2xl border-border/80 bg-white p-6"
                size="xl"
            >
                <form onSubmit={handleEditTlSubmit} className="flex flex-col gap-5">
                    <div className="rounded-xl border border-border/70 bg-muted/25 p-4 space-y-4">
                        <Select
                            label="Jenis Dokumen"
                            options={jenisTlSelectOptions}
                            value={editTlForm.jenisTL}
                            onChange={(val) => setEditTlForm(prev => ({ ...prev, jenisTL: val }))}
                            fullWidth
                        />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Input
                                label="Tanggal Dokumen / Tindak Lanjut"
                                type="date"
                                value={editTlForm.tanggal}
                                onChange={(e) => setEditTlForm(prev => ({ ...prev, tanggal: e.target.value }))}
                                required
                                fullWidth
                            />
                            <Input
                                label="Nomor Dokumen"
                                placeholder="Contoh: S.123/PKPS/..."
                                value={editTlForm.nomorSuratOutput}
                                onChange={(e) => setEditTlForm(prev => ({ ...prev, nomorSuratOutput: e.target.value }))}
                                fullWidth
                                leftIcon={<FileText size={16} />}
                            />
                        </div>
                        <Textarea
                            label="Keterangan / Hasil"
                            placeholder="Uraikan secara ringkas hasil dokumen atau tindak lanjut yang dicatat di sini..."
                            value={editTlForm.keterangan}
                            onChange={(e) => setEditTlForm(prev => ({ ...prev, keterangan: e.target.value }))}
                            rows={5}
                            required
                            fullWidth
                        />
                    </div>

                    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                            Lampiran Saat Ini
                        </label>
                        {editTlForm.fileUrls.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic">Tidak ada lampiran.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {editTlForm.fileUrls.map((url, idx) => {
                                    const fileName = url?.split('/').pop()?.split('?')[0] || `Lampiran ${idx + 1}`;
                                    return (
                                        <div key={idx} className="inline-flex items-center gap-2 px-2 py-1 rounded bg-white border border-border text-[10px] font-medium">
                                            <FileText size={10} />
                                            <span className="max-w-[180px] truncate">{fileName}</span>
                                            <button
                                                type="button"
                                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-destructive transition-colors"
                                                onClick={() => removeExistingTlFile(idx)}
                                                title="Hapus lampiran ini"
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-4">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                            Tambah Lampiran Baru (Opsional)
                        </label>
                        <FileUpload
                            key={editTlForm.id || 'edit-tl'}
                            onFileSelected={handleEditTlNewFiles}
                            onFileRemoved={handleEditTlNewFileRemoved}
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.zip,.shp,.dbf,.prj,.shx,.mp3,.m4a,.wav,.ogg,.aac"
                            maxSizeMB={10}
                            helperText="Klik atau seret file dokumen/foto hasil tindak lanjut untuk menambah lampiran baru"
                            uploadProgress={editTlUploadProgress}
                        />
                    </div>

                    <ModalFooter className="sticky bottom-0 z-10 -mx-1 border-t border-border/80 bg-white/95 px-1 pt-4 pb-1 backdrop-blur">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={resetEditTlForm}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isUpdateTlSubmitting}
                            leftIcon={<CheckCircle size={18} />}
                        >
                            Simpan Perubahan
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Edit Data Modal */}
            <EditAduanModal
                isOpen={isEditModalOpen}
                isAdmin={isAdmin}
                editForm={editForm}
                editSelectedKpsList={editSelectedKpsList}
                suratFile={suratFile}
                picOptions={picOptions}
                isLoadingUsers={isLoadingUsers}
                emailError={emailError}
                isEditSubmitting={isEditSubmitting}
                suratUploadProgress={suratUploadProgress}
                suratFileStatuses={suratFileStatuses}
                onSubmit={handleEditSubmit}
                onClose={closeEditModal}
                onEditInput={handleEditInput}
                onSelectKps={handleKpsSelect}
                onRemoveKps={handleRemoveSelectedKps}
                onSelectPic={(val) => {
                    const normalizedValue = val === '__none__' ? '' : val;
                    const selectedUser = users.find(u => u.id === normalizedValue);
                    setEditForm(prev => ({
                        ...prev,
                        picId: normalizedValue,
                        picName: selectedUser ? (selectedUser.displayName || selectedUser.email) : ''
                    }));
                }}
                onAsalSuratKategoriChange={(val) => {
                    setEditForm(prev => ({
                        ...prev,
                        asalSuratKategori: val,
                        asalSurat: val === 'Masyarakat' ? 'Masyarakat' : prev.asalSurat === 'Masyarakat' ? '' : prev.asalSurat
                    }));
                }}
                onSuratFileSelected={(files) => {
                    const nextFile = files[0] || null;
                    setSuratFile(nextFile);
                    setSuratUploadProgress(0);
                    setSuratFileStatuses(nextFile ? buildSelectedUploadStates([nextFile]) : []);
                    if (nextFile) {
                        setEditForm(prev => ({ ...prev, fileUrl: '' }));
                    }
                }}
                onSuratFileRemoved={() => {
                    setSuratFile(null);
                    setSuratUploadProgress(0);
                    setSuratFileStatuses([]);
                    setEditForm(prev => ({ ...prev, fileUrl: '' }));
                }}
            />

            {/* Upload Modal (Unified) */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={resetUploadModal}
                title="Unggah Berkas Baru"
                size="lg"
            >
                <div className="flex flex-col gap-5">
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="p-4 bg-muted border border-border rounded-lg mb-4">
                            <h4 className="text-sm font-semibold text-primary mb-1 flex items-center gap-2">
                                <FileText size={16} />
                                Upload Dokumen Pendukung
                            </h4>
                            <p className="text-xs text-primary">
                                Unggah berkas dokumen (PDF, Word, Excel), data spasial (ZIP, SHP), atau audio (MP3, WAV).
                            </p>
                        </div>

                        <FileUpload
                            key={`upload-${uploadPickerKey}`}
                            label="Pilih File (Bisa Banyak Sekaligus)"
                            helperText="Format: PDF, JPG, PNG, DOCX, ZIP, SHP, Audio."
                            initialFiles={[]}
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.zip,.shp,.dbf,.prj,.shx,.mp3,.m4a,.wav,.ogg,.aac"
                            multiple={true}
                            onFileSelected={(files) => {
                                setUploadFiles(files);
                                setUploadFilesProgress(0);
                                setUploadFilesStatus(buildSelectedUploadStates(files));
                            }}
                            onFileRemoved={(idx) => {
                                const nextFiles = uploadFiles.filter((_, i) => i !== idx);
                                setUploadFiles(nextFiles);
                                setUploadFilesStatus((prev) => prev.filter((_, i) => i !== idx));
                                if (nextFiles.length === 0) {
                                    setUploadFilesProgress(0);
                                }
                            }}
                            isLoading={isUploadingSurat}
                            uploadProgress={uploadFilesProgress}
                            fileStatuses={uploadFilesStatus}
                        />
                    </div>
                </div>
                <ModalFooter className="mt-4">
                    <Button variant="ghost" onClick={resetUploadModal} disabled={isUploadingSurat}>
                        Batal
                    </Button>
                    <Button variant="primary" onClick={handleUploadSubmit} isLoading={isUploadingSurat} disabled={uploadFiles.length === 0}>
                        OK &amp; Upload
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Print Only Footer */}
            <div className="hidden print:block fixed bottom-0 left-0 right-0 border-t pt-2 text-[10px] text-muted-foreground text-center">
                Direktorat Pengendalian Perhutanan Sosial - KitapantauSH • Dicetak pada: {new Date().toLocaleString('id-ID')}
            </div>

            {/* Delete Document Confirmation Dialog */}
            <Dialog open={!!deleteConfirmDoc} onOpenChange={(open) => !open && setDeleteConfirmDoc(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hapus Dokumen</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Apakah Anda yakin ingin menghapus <span className="font-semibold text-foreground">"{deleteConfirmDoc?.fileName}"</span>?
                        File akan dihapus permanen dan tidak dapat dikembalikan.
                    </p>
                    <DialogFooter className="gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={() => setDeleteConfirmDoc(null)}>
                            Batal
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            className="bg-destructive hover:bg-destructive/90 text-white"
                            onClick={handleDeleteDocument}
                            isLoading={!!deletingDocId}
                        >
                            Hapus Permanen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={isDeleteAduanConfirmOpen}
                onOpenChange={setIsDeleteAduanConfirmOpen}
                title="Hapus Aduan"
                description={
                    <>
                        Apakah Anda yakin ingin menghapus <span className="font-semibold text-foreground">{aduan.nomorTiket}</span>?
                        Tindakan ini permanen dan tidak dapat dibatalkan.
                    </>
                }
                confirmLabel="Hapus Aduan"
                confirmVariant="destructive"
                isLoading={isDeleting}
                onConfirm={handleDelete}
            />

            <ConfirmDialog
                open={!!deleteTlConfirm}
                onOpenChange={(open) => !open && setDeleteTlConfirm(null)}
                title="Hapus Riwayat Penanganan"
                description={
                    <>
                        Catatan tindak lanjut <span className="font-semibold text-foreground">{deleteTlConfirm?.label || '-'}</span> akan dihapus permanen dari riwayat aduan.
                    </>
                }
                confirmLabel="Hapus Riwayat"
                confirmVariant="destructive"
                onConfirm={handleDeleteTlConfirm}
            />
        </motion.div>
    );
};
