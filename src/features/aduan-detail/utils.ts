import type { Aduan, KpsData } from '../../types';
import type { FileUploadItemState } from '../../components/ui';

export const formatDate = (date: Date): string => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date(date));
};

export const resolveKpsType = (kps?: Partial<KpsData>) =>
    [kps?.skema, kps?.kps_type, kps?.jenis_kps]
        .find((value): value is string => typeof value === 'string' && value.trim().length > 0) || '-';

export const getDisplayedKpsId = (kps?: Partial<KpsData>) =>
    kps?.id || '-';

export const getNormalizedKpsId = (kps?: Partial<KpsData>) =>
    kps?.id || '';

export const getMimeTypeFromFileName = (fileName: string) => {
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

export const isPreviewableMimeType = (mimeType: string) =>
    mimeType === 'application/pdf'
    || mimeType.startsWith('image/')
    || mimeType.startsWith('text/')
    || mimeType.startsWith('audio/')
    || mimeType.startsWith('video/')
    || mimeType === 'application/json';

export const hasMeaningfulKpsData = (kps?: Partial<KpsData>) =>
    Boolean(
        getNormalizedKpsId(kps)
        || kps?.nama_kps
        || kps?.nama_lembaga
        || kps?.nomor_sk
        || kps?.surat_keputusan
        || kps?.lokasi_prov
        || kps?.lokasi_kab
    );

export const normalizeSelectedKps = (kps?: Partial<KpsData>): KpsData => {
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

export const buildSelectedUploadStates = (files: Array<Pick<File, 'name'>>): FileUploadItemState[] =>
    files.map((file) => ({
        fileName: file.name,
        status: 'selected',
    }));

export const buildStoredUploadState = (fileName: string, message = 'Tersimpan di server'): FileUploadItemState[] => [{
    fileName,
    status: 'success',
    progress: 100,
    message,
}];

export const updateUploadStatusAt = (
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

export type EditAduanForm = {
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

export type FeedbackState = {
    type: 'success' | 'error' | 'info';
    message: string;
} | null;

export const DEFAULT_JENIS_TL_SELECT_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'Surat/Dokumen Pengadu', label: 'Surat/Dokumen Pengadu' },
    { value: 'Surat/Dokumen Pihak lain', label: 'Surat/Dokumen Pihak lain' },
    { value: 'TL Surat Jawaban', label: 'TL Surat Jawaban' },
    { value: 'TL Nota Dinas', label: 'TL Nota Dinas' },
    { value: 'TL BA Rapat Pembahasan', label: 'TL BA Rapat Pembahasan' },
    { value: 'TL Notula Rapat', label: 'TL Notula Rapat' },
    { value: 'Laporan Puldasi', label: 'Laporan Puldasi' },
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

export const normalizeJenisTlLabel = (value?: string) => {
    const normalized = value?.trim() || '';
    if (!normalized) return '';
    return LEGACY_JENIS_TL_LABEL_MAP[normalized] || normalized;
};

export const detailCardClass = "overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-[var(--shadow-card)]";
export const detailCardHeaderClass = "border-b border-border bg-muted/70";
export const detailSectionClass = "rounded-xl border border-border bg-muted/70 p-4";
export const detailSectionSoftClass = "rounded-xl border border-border bg-muted/50 p-4";
export const detailBadgeClass = "border-border bg-muted text-foreground";
export const detailIconClass = "flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-primary";
export const detailLabelClass = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground";
export const detailModalClass = "rounded-2xl border border-border bg-card p-6";
