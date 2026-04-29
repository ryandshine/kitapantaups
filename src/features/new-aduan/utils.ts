import type { FileUploadItemState } from '../../components/ui';
import type { KpsData } from '../../types';

export interface NewAduanFormData {
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

export const DEFAULT_SKEMA = 'HKm';
export const DEFAULT_KATEGORI_OPTIONS = [
    { nama_kategori: 'konflik areal' },
    { nama_kategori: 'perlindungan' },
    { nama_kategori: 'dan lain-lain' }
];

export const getTodayInputValue = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const createInitialNewAduanFormData = (): NewAduanFormData => ({
    skema: DEFAULT_SKEMA,
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

export const resolveKpsType = (kps: KpsData) => [kps.skema, kps.kps_type, kps.jenis_kps]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0) || '';

export const getKpsDisplayId = (kps: KpsData) => kps.id || '-';
export const getKpsDisplayName = (kps: KpsData) => kps.nama_lembaga || kps.nama_kps || kps.NAMA_KPS || '-';
export const getKpsDisplaySk = (kps: KpsData) => kps.surat_keputusan || kps.nomor_sk || kps.NO_SK || '-';
export const getKpsDisplayProvinsi = (kps: KpsData) => kps.provinsi || kps.lokasi_prov || kps.PROVINSI || '-';
export const getKpsDisplayKabupaten = (kps: KpsData) => kps.kabupaten || kps.lokasi_kab || kps.KAB_KOTA || '-';
export const getKpsDisplayLuas = (kps: KpsData) => Number(kps.luas_total || kps.lokasi_luas_ha || kps.LUAS_SK || 0);
export const getKpsDisplayAnggotaPria = (kps: KpsData) => Number(kps.anggota_pria || 0);
export const getKpsDisplayAnggotaWanita = (kps: KpsData) => Number(kps.anggota_wanita || 0);
export const getKpsDisplayKK = (kps: KpsData) =>
    Number(
        kps.jumlah_anggota
        || kps.jumlah_kk
        || kps.JML_KK
        || (Number(kps.anggota_pria || 0) + Number(kps.anggota_wanita || 0))
        || 0
    );

export const getKpsDisplayTotalKK = (kpsList: KpsData[]) =>
    kpsList.reduce((sum, item) => sum + getKpsDisplayKK(item), 0);

export const getKpsDisplayTotalLuas = (kpsList: KpsData[]) =>
    kpsList.reduce((sum, item) => sum + getKpsDisplayLuas(item), 0);

export const getKpsDisplayTotalAnggotaPria = (kpsList: KpsData[]) =>
    kpsList.reduce((sum, item) => sum + getKpsDisplayAnggotaPria(item), 0);

export const getKpsDisplayTotalAnggotaWanita = (kpsList: KpsData[]) =>
    kpsList.reduce((sum, item) => sum + getKpsDisplayAnggotaWanita(item), 0);

export const normalizeSelectedKps = (kps: KpsData): KpsData => ({
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

export const summarizeSelectedKps = (kpsList: KpsData[]) => {
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

export const applySelectedKpsToForm = (
    formData: NewAduanFormData,
    selectedKpsList: KpsData[]
): NewAduanFormData => {
    const kpsSummary = summarizeSelectedKps(selectedKpsList);

    return {
        ...formData,
        skema: kpsSummary.skema,
        lokasi: {
            ...formData.lokasi,
            provinsi: kpsSummary.lokasi.provinsi,
            kabupaten: kpsSummary.lokasi.kabupaten,
            kecamatan: kpsSummary.lokasi.kecamatan,
            desa: kpsSummary.lokasi.desa,
            luasHa: kpsSummary.totalArea
        },
        jumlahKK: kpsSummary.totalKK
    };
};

export const resetSelectedKpsFormState = (formData: NewAduanFormData): NewAduanFormData => ({
    ...formData,
    skema: DEFAULT_SKEMA,
    jumlahKK: 0,
    lokasi: {
        ...formData.lokasi,
        provinsi: '',
        kabupaten: '',
        kecamatan: '',
        desa: '',
        luasHa: 0
    }
});

export const extractValidKpsCoordinates = (kpsList: KpsData[]) => {
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

export const buildSelectedFileStates = (files: Array<Pick<File, 'name'>>): FileUploadItemState[] =>
    files.map((file) => ({
        fileName: file.name,
        status: 'selected',
    }));

export const updateFileStatusAt = (
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

export const sortKategoriMasalahOptions = (
    options: Array<{ nama_kategori: string }>,
    categorySortOrder: string[],
) => {
    return [...options].sort((a, b) => {
        const indexA = categorySortOrder.indexOf(a.nama_kategori);
        const indexB = categorySortOrder.indexOf(b.nama_kategori);

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.nama_kategori.localeCompare(b.nama_kategori);
    });
};

export const validateNewAduanSubmission = (
    formData: NewAduanFormData,
    selectedKpsList: KpsData[],
) => {
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

    return { trimmedEmail };
};

export const buildCreateAduanPayload = (
    formData: NewAduanFormData,
    selectedKpsList: KpsData[],
    trimmedEmail: string,
) => {
    const { lokasi_lat, lokasi_lng } = extractValidKpsCoordinates(selectedKpsList);

    return {
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
        kps_ids: selectedKpsList.map((kps) => String(kps.id))
    };
};
