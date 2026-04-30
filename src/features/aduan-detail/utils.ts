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
    pengaduInstansi: string;
    pengaduTelepon: string;
    pengaduEmail: string;
    picId: string;
};

export type EditAduanUpdatePayload = Partial<Aduan> & {
    updatedBy?: string;
    updatedByName?: string;
    auditSource?: Partial<Aduan> | null;
};

export type LokasiObjekItem = {
    idApiKps: string;
    namaKps: string;
    noSk: string;
    kpsType: string;
    provinsi: string;
    kabupaten: string;
    luasHa: number;
    anggotaPria: number;
    anggotaWanita: number;
    jumlahKk: number;
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

export const getFileAccessErrorMessage = async (response: Response) => {
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

export const buildEditAduanForm = (source?: Partial<Aduan> | null): EditAduanForm => {
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
        pengaduInstansi: source?.pengadu?.instansi || source?.pengadu_instansi || '',
        pengaduTelepon: source?.pengadu?.telepon || '',
        pengaduEmail: source?.pengadu?.email || '',
        picId: source?.picId || ''
    };
};

const mergeLokasiObjekItem = (
    aduan: Aduan,
    aggregateKps: KpsData | undefined,
    masterKps: KpsData | null | undefined,
    explicitId: string,
    names: string[],
    sks: string[],
    types: string[],
    index: number,
): LokasiObjekItem => {
    const mergedKps = normalizeSelectedKps({
        ...(masterKps || {}),
        ...(aggregateKps || {}),
        id: explicitId || getNormalizedKpsId(masterKps || aggregateKps) || '',
        nama_kps: aggregateKps?.nama_kps || names[index] || masterKps?.nama_kps || masterKps?.nama_lembaga || '',
        nama_lembaga: aggregateKps?.nama_lembaga || masterKps?.nama_lembaga || '',
        nomor_sk: aggregateKps?.nomor_sk || sks[index] || masterKps?.nomor_sk || masterKps?.surat_keputusan || '',
        surat_keputusan: aggregateKps?.surat_keputusan || masterKps?.surat_keputusan || '',
        jenis_kps: aggregateKps?.jenis_kps || types[index] || masterKps?.jenis_kps || '',
        kps_type: aggregateKps?.kps_type || types[index] || masterKps?.kps_type || '',
        skema: aggregateKps?.skema || masterKps?.skema || '',
        lokasi_prov: aggregateKps?.lokasi_prov || masterKps?.lokasi_prov || masterKps?.provinsi || aduan?.lokasi?.provinsi || '',
        lokasi_kab: aggregateKps?.lokasi_kab || masterKps?.lokasi_kab || masterKps?.kabupaten || aduan?.lokasi?.kabupaten || '',
        lokasi_luas_ha: aggregateKps?.lokasi_luas_ha ?? masterKps?.lokasi_luas_ha ?? masterKps?.luas_total ?? (index === 0 ? (aduan?.lokasi?.luasHa ?? aduan?.lokasi_luas_ha ?? 0) : 0),
        jumlah_kk: aggregateKps?.jumlah_kk ?? masterKps?.jumlah_kk ?? masterKps?.jumlah_anggota ?? (index === 0 ? (aduan?.jumlahKK ?? aduan?.jumlah_kk ?? 0) : 0),
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
};

export const buildLokasiObjekItems = (
    aduan?: Aduan | null,
    relatedKpsById: Map<string, KpsData | null> = new Map(),
): LokasiObjekItem[] => {
    if (!aduan) return [];

    const normalizedKpsItems = Array.isArray(aduan.kps_items)
        ? aduan.kps_items
            .map((item) => normalizeSelectedKps(item))
            .filter((item) => hasMeaningfulKpsData(item))
        : [];
    const ids = aduan.kps_ids || [];
    const names = aduan.nama_kps || [];
    const sks = aduan.nomor_sk || [];
    const types = (aduan.type_kps && aduan.type_kps.length > 0 ? aduan.type_kps : aduan.jenis_kps) || [];
    const maxLen = Math.max(ids.length, names.length, sks.length, types.length, normalizedKpsItems.length);

    if (maxLen === 0) return [];

    return Array.from({ length: maxLen }, (_, index) => {
        const aggregateKps = normalizedKpsItems[index];
        const explicitId = ids[index] || getNormalizedKpsId(aggregateKps) || '';
        const masterKps = explicitId ? relatedKpsById.get(explicitId) || null : null;
        return mergeLokasiObjekItem(aduan, aggregateKps, masterKps, explicitId, names, sks, types, index);
    });
};

export const buildEditFormFromSelectedKps = (
    selectedKpsList: KpsData[],
    currentForm: EditAduanForm,
    options?: { clearLocationWhenEmpty?: boolean }
): Partial<EditAduanForm> => {
    const totalLuas = selectedKpsList.reduce((sum, item) => sum + (Number(item.lokasi_luas_ha) || 0), 0);
    const totalKK = selectedKpsList.reduce((sum, item) => sum + (Number(item.jumlah_kk) || 0), 0);
    const first = selectedKpsList[0];
    const shouldClear = options?.clearLocationWhenEmpty ?? false;

    return {
        kpsId: first?.id || '',
        skema: (resolveKpsType(first) as Aduan['skema']) || currentForm.skema,
        skTerkait: selectedKpsList.map((item) => item.surat_keputusan || item.nomor_sk).filter(Boolean).join('; '),
        jumlahKK: totalKK,
        lokasiLuasHa: totalLuas,
        lokasiDesa: first?.lokasi_desa || (shouldClear ? '' : currentForm.lokasiDesa),
        lokasiKecamatan: first?.lokasi_kec || (shouldClear ? '' : currentForm.lokasiKecamatan),
        lokasiKabupaten: first?.lokasi_kab || (shouldClear ? '' : currentForm.lokasiKabupaten),
        lokasiProvinsi: first?.lokasi_prov || (shouldClear ? '' : currentForm.lokasiProvinsi),
        lokasiBalaiId: (first?.balai || '').toLowerCase().replace(/\s+/g, '_') || (shouldClear ? '' : currentForm.lokasiBalaiId),
        lokasiBalaiName: first?.balai || (shouldClear ? '' : currentForm.lokasiBalaiName),
    };
};

export const buildEditAduanUpdatePayload = ({
    aduan,
    editForm,
    editSelectedKpsList,
    updatedBy,
    updatedByName,
    suratFileUrl,
}: {
    aduan: Aduan;
    editForm: EditAduanForm;
    editSelectedKpsList: KpsData[];
    updatedBy: string;
    updatedByName: string;
    suratFileUrl: string;
}): EditAduanUpdatePayload => ({
    kps_ids: editSelectedKpsList.map((kps) => getNormalizedKpsId(kps)).filter(Boolean),
    nama_kps: editSelectedKpsList.map((kps) => kps.nama_lembaga || kps.nama_kps || '').filter(Boolean),
    jenis_kps: editSelectedKpsList.map((kps) => resolveKpsType(kps)).filter(Boolean),
    nomor_sk: editSelectedKpsList.map((kps) => kps.surat_keputusan || kps.nomor_sk || '').filter(Boolean),
    updatedBy,
    updatedByName,
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
        instansi: editForm.pengaduInstansi,
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
});

const downloadBlobFile = (blobUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const createPreviewWindow = (fileName: string) => {
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) return null;

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

    return previewWindow;
};

export const openProtectedFile = async ({
    url,
    fileName,
    fetchAuthorizedFile,
    onFeedback,
}: {
    url: string;
    fileName: string;
    fetchAuthorizedFile: (url: string) => Promise<Response>;
    onFeedback: (feedback: NonNullable<FeedbackState>) => void;
}) => {
    const previewWindow = createPreviewWindow(fileName);

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
                onFeedback({
                    type: 'info',
                    message: `Popup diblokir browser. File ${fileName} diunduh sebagai gantinya.`
                });
            }
        } else {
            previewWindow?.close();
            downloadBlobFile(blobUrl, fileName);
            onFeedback({
                type: 'info',
                message: `File ${fileName} tidak bisa dipreview di tab browser dan akan diunduh.`
            });
        }

        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
        previewWindow?.close();
        console.error('Failed to open protected file:', error);
        onFeedback({
            type: 'error',
            message: `Gagal membuka file ${fileName}: ${error instanceof Error ? error.message : 'Akses ditolak.'}`
        });
    }
};

export const detailCardClass = "overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-[var(--shadow-card)]";
export const detailCardHeaderClass = "border-b border-border bg-muted/70";
export const detailSectionClass = "rounded-xl border border-border bg-muted/70 p-4";
export const detailSectionSoftClass = "rounded-xl border border-border bg-muted/50 p-4";
export const detailBadgeClass = "border-border bg-muted text-foreground";
export const detailIconClass = "flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-primary";
export const detailLabelClass = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground";
export const detailModalClass = "rounded-2xl border border-border bg-card p-6";
