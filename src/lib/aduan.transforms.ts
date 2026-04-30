import type { ActivityType, Aduan, KpsData } from '../types';

export type UpdateAduanPayload = Partial<Aduan> & {
    updatedBy?: string;
    updatedByName?: string;
    auditSource?: Partial<Aduan> | null;
};

export type AuditChangeEntry = {
    key: string;
    label: string;
    from: string;
    to: string;
};

type AduanApiRow = Record<string, unknown>;

type KpsItemInput = {
    id?: unknown;
    nama_lembaga?: unknown;
    nama_kps?: unknown;
    surat_keputusan?: unknown;
    nomor_sk?: unknown;
    no_sk?: unknown;
    tanggal?: unknown;
    tanggal_sk?: unknown;
    skema?: unknown;
    jenis_kps?: unknown;
    kps_type?: unknown;
    provinsi_id?: unknown;
    kabupaten_id?: unknown;
    kecamatan_id?: unknown;
    desa_id?: unknown;
    provinsi?: unknown;
    lokasi_prov?: unknown;
    kabupaten?: unknown;
    lokasi_kab?: unknown;
    kecamatan?: unknown;
    lokasi_kec?: unknown;
    desa?: unknown;
    lokasi_desa?: unknown;
    luas_hl?: unknown;
    luas_hp?: unknown;
    luas_hpt?: unknown;
    luas_hpk?: unknown;
    luas_hk?: unknown;
    luas_apl?: unknown;
    luas_total?: unknown;
    lokasi_luas_ha?: unknown;
    anggota_pria?: unknown;
    anggota_wanita?: unknown;
    jumlah_anggota?: unknown;
    jumlah_kk?: unknown;
    balai?: unknown;
    lat?: unknown;
    lng?: unknown;
    skema_pemanfaatan?: unknown;
    has_skps?: unknown;
    has_petaps?: unknown;
    has_rkps?: unknown;
};

const resolveKpsType = (kps: {
    skema?: string | null;
    kps_type?: string | null;
    jenis_kps?: string | null;
}) => [kps.skema, kps.kps_type, kps.jenis_kps]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0) || '';

const normalizeStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.map((item) => String(item)) : [];

const normalizeString = (value: unknown, fallback = ''): string =>
    typeof value === 'string' ? value : value == null ? fallback : String(value);

const normalizeOptionalString = (value: unknown): string | undefined => {
    if (value == null) return undefined;
    return typeof value === 'string' ? value : String(value);
};

const normalizeDate = (value: unknown, fallback = new Date()): Date => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return fallback;
};

const normalizeDocuments = (value: unknown): Array<{ id: string; file_url: string; file_name: string; file_category?: string }> => {
    if (!Array.isArray(value)) return [];
    return value.map((item) => {
        const record = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
        return {
            id: normalizeString(record.id),
            file_url: normalizeString(record.file_url),
            file_name: normalizeString(record.file_name),
            file_category: normalizeOptionalString(record.file_category),
        };
    });
};

const normalizeNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeOptionalNumber = (value: unknown): number | undefined => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const formatAuditValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (Array.isArray(value)) {
        const normalized = value
            .map((item) => formatAuditValue(item))
            .filter((item) => item !== '-');
        return normalized.length > 0 ? normalized.join(', ') : '-';
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? String(value) : '-';
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? '-' : value.toISOString();
    }
    const text = String(value).replace(/\s+/g, ' ').trim();
    return text || '-';
};

const resolveKpsTypeInput = (kps: KpsItemInput) => ({
    skema: normalizeOptionalString(kps.skema) ?? null,
    kps_type: normalizeOptionalString(kps.kps_type) ?? null,
    jenis_kps: normalizeOptionalString(kps.jenis_kps) ?? null,
});

const normalizeKpsItem = (item: KpsItemInput): KpsData => ({
    id: String(item?.id || ''),
    nama_lembaga: normalizeString(item?.nama_lembaga ?? item?.nama_kps),
    surat_keputusan: normalizeString(item?.surat_keputusan ?? item?.nomor_sk ?? item?.no_sk),
    tanggal: normalizeString(item?.tanggal ?? item?.tanggal_sk),
    skema: normalizeString(item?.skema ?? item?.jenis_kps ?? item?.kps_type),
    provinsi_id: item?.provinsi_id != null ? String(item.provinsi_id) : '',
    kabupaten_id: item?.kabupaten_id != null ? String(item.kabupaten_id) : '',
    kecamatan_id: item?.kecamatan_id != null ? String(item.kecamatan_id) : '',
    desa_id: item?.desa_id != null ? String(item.desa_id) : '',
    provinsi: normalizeString(item?.provinsi ?? item?.lokasi_prov),
    kabupaten: normalizeString(item?.kabupaten ?? item?.lokasi_kab),
    kecamatan: normalizeString(item?.kecamatan ?? item?.lokasi_kec),
    desa: normalizeString(item?.desa ?? item?.lokasi_desa),
    luas_hl: normalizeNumber(item?.luas_hl),
    luas_hp: normalizeNumber(item?.luas_hp),
    luas_hpt: normalizeNumber(item?.luas_hpt),
    luas_hpk: normalizeNumber(item?.luas_hpk),
    luas_hk: normalizeNumber(item?.luas_hk),
    luas_apl: normalizeNumber(item?.luas_apl),
    luas_total: normalizeNumber(item?.luas_total ?? item?.lokasi_luas_ha),
    anggota_pria: normalizeNumber(item?.anggota_pria),
    anggota_wanita: normalizeNumber(item?.anggota_wanita),
    jumlah_anggota: normalizeNumber(item?.jumlah_anggota ?? ((Number(item?.anggota_pria) || 0) + (Number(item?.anggota_wanita) || 0))),
    kps_type: resolveKpsType(resolveKpsTypeInput(item)),
    nama_kps: normalizeString(item?.nama_kps ?? item?.nama_lembaga),
    jenis_kps: normalizeString(item?.jenis_kps),
    nomor_sk: normalizeString(item?.nomor_sk ?? item?.surat_keputusan ?? item?.no_sk),
    lokasi_prov: normalizeString(item?.lokasi_prov ?? item?.provinsi),
    lokasi_kab: normalizeString(item?.lokasi_kab ?? item?.kabupaten),
    lokasi_kec: normalizeString(item?.lokasi_kec ?? item?.kecamatan),
    lokasi_desa: normalizeString(item?.lokasi_desa ?? item?.desa),
    lokasi_luas_ha: normalizeNumber(item?.lokasi_luas_ha ?? item?.luas_total),
    jumlah_kk: normalizeNumber(item?.jumlah_kk ?? item?.jumlah_anggota ?? ((Number(item?.anggota_pria) || 0) + (Number(item?.anggota_wanita) || 0))),
    balai: normalizeString(item?.balai),
    lat: normalizeOptionalNumber(item?.lat),
    lng: normalizeOptionalNumber(item?.lng),
    skema_pemanfaatan: normalizeString(item?.skema_pemanfaatan),
    tanggal_sk: normalizeString(item?.tanggal_sk),
    has_skps: Boolean(item?.has_skps),
    has_petaps: Boolean(item?.has_petaps),
    has_rkps: Boolean(item?.has_rkps),
});

const normalizeKpsItems = (row: AduanApiRow): KpsData[] => {
    if (Array.isArray(row.kps_items) && row.kps_items.length > 0) {
        return row.kps_items.map((item) => normalizeKpsItem((item as KpsItemInput)));
    }

    const kpsIds = normalizeStringArray(row?.kps_ids);
    const namaKps = normalizeStringArray(row?.nama_kps);
    const jenisKps = normalizeStringArray(row?.jenis_kps);
    const typeKps = normalizeStringArray(row?.type_kps);
    const nomorSk = normalizeStringArray(row?.nomor_sk);

    return kpsIds.map((id, index) => normalizeKpsItem({
        id,
        nama_lembaga: namaKps[index] || '',
        surat_keputusan: nomorSk[index] || '',
        skema: typeKps[index] || jenisKps[index] || '',
        provinsi: row?.lokasi_prov || '',
        kabupaten: row?.lokasi_kab || '',
        kecamatan: row?.lokasi_kec || '',
        desa: row?.lokasi_desa || '',
        luas_total: index === 0 ? row?.lokasi_luas_ha : 0,
        jumlah_anggota: index === 0 ? row?.jumlah_kk : 0,
        nama_kps: namaKps[index] || '',
        jenis_kps: jenisKps[index] || '',
        kps_type: typeKps[index] || jenisKps[index] || '',
        nomor_sk: nomorSk[index] || '',
        lokasi_prov: row?.lokasi_prov || '',
        lokasi_kab: row?.lokasi_kab || '',
        lokasi_kec: row?.lokasi_kec || '',
        lokasi_desa: row?.lokasi_desa || '',
        lokasi_luas_ha: index === 0 ? row?.lokasi_luas_ha : 0,
        jumlah_kk: index === 0 ? row?.jumlah_kk : 0,
    }));
};

export const buildAduanAuditChanges = (source: Partial<Aduan> | null | undefined, data: Partial<Aduan>): AuditChangeEntry[] => {
    if (!source) return [];

    const changes: AuditChangeEntry[] = [];
    const pushChange = (key: string, label: string, previousValue: unknown, nextValue: unknown) => {
        const from = formatAuditValue(previousValue);
        const to = formatAuditValue(nextValue);
        if (from === to) return;
        changes.push({ key, label, from, to });
    };

    if (data.status !== undefined) pushChange('status', 'Status', source.status, data.status);
    if (data.picName !== undefined || data.picId !== undefined) pushChange('pic', 'PIC', source.picName || source.picId, data.picName || data.picId);
    if (data.perihal !== undefined || data.suratMasuk?.perihal !== undefined) pushChange('perihal', 'Perihal', source.perihal || source.suratMasuk?.perihal, data.perihal ?? data.suratMasuk?.perihal);
    if (data.ringkasanMasalah !== undefined) pushChange('ringkasan', 'Ringkasan Masalah', source.ringkasanMasalah, data.ringkasanMasalah);
    if (data.kategoriMasalah !== undefined) pushChange('kategori', 'Kategori Masalah', source.kategoriMasalah, data.kategoriMasalah);
    if (Array.isArray(data.kps_ids)) pushChange('kps', 'Objek KPS', source.nama_kps?.length ? source.nama_kps : source.kps_ids, data.nama_kps?.length ? data.nama_kps : data.kps_ids);
    if (data.jumlahKK !== undefined) pushChange('jumlah_kk', 'Jumlah KK', source.jumlahKK ?? source.jumlah_kk, data.jumlahKK);

    if (data.lokasi) {
        if (data.lokasi.provinsi !== undefined) pushChange('lokasi_prov', 'Provinsi', source.lokasi?.provinsi ?? source.lokasi_prov, data.lokasi.provinsi);
        if (data.lokasi.kabupaten !== undefined) pushChange('lokasi_kab', 'Kabupaten', source.lokasi?.kabupaten ?? source.lokasi_kab, data.lokasi.kabupaten);
        if (data.lokasi.kecamatan !== undefined) pushChange('lokasi_kec', 'Kecamatan', source.lokasi?.kecamatan ?? source.lokasi_kec, data.lokasi.kecamatan);
        if (data.lokasi.desa !== undefined) pushChange('lokasi_desa', 'Desa', source.lokasi?.desa ?? source.lokasi_desa, data.lokasi.desa);
        if (data.lokasi.luasHa !== undefined) pushChange('lokasi_luas_ha', 'Luas Area', source.lokasi?.luasHa ?? source.lokasi_luas_ha, data.lokasi.luasHa);
    }

    if (data.pengadu) {
        if (data.pengadu.nama !== undefined) pushChange('pengadu_nama', 'Nama Pengadu', source.pengadu?.nama ?? source.pengadu_nama, data.pengadu.nama);
        if (data.pengadu.telepon !== undefined) pushChange('pengadu_telepon', 'Telepon Pengadu', source.pengadu?.telepon, data.pengadu.telepon);
        if (data.pengadu.email !== undefined) pushChange('pengadu_email', 'Email Pengadu', source.pengadu?.email, data.pengadu.email);
        if (data.pengadu.instansi !== undefined) pushChange('pengadu_instansi', 'Instansi Pengadu', source.pengadu?.instansi ?? source.pengadu_instansi, data.pengadu.instansi);
    }

    if (data.suratMasuk) {
        if (data.suratMasuk.nomorSurat !== undefined) pushChange('surat_nomor', 'Nomor Surat', source.suratMasuk?.nomorSurat ?? source.surat_nomor, data.suratMasuk.nomorSurat);
        if (data.suratMasuk.fileUrl !== undefined) pushChange('surat_file_url', 'Lampiran Surat Masuk', source.suratMasuk?.fileUrl, data.suratMasuk.fileUrl || null);
    }

    return changes;
};

export const buildAduanPatchPayload = (data: UpdateAduanPayload) => {
    const updateData: Record<string, unknown> = {};
    const resolvedPerihal = data.perihal !== undefined ? data.perihal : data.suratMasuk?.perihal;

    if (data.status) updateData.status = data.status;
    if (data.alasanPenolakan !== undefined) updateData.alasan_penolakan = data.alasanPenolakan;
    if (data.picId !== undefined) updateData.pic_id = data.picId || null;
    if (data.picName !== undefined) updateData.pic_name = data.picName;
    if (data.jumlahKK !== undefined) {
        const parsedJumlahKk = Number(data.jumlahKK);
        if (Number.isFinite(parsedJumlahKk)) updateData.jumlah_kk = parsedJumlahKk;
    }
    if (resolvedPerihal !== undefined) updateData.surat_asal_perihal = resolvedPerihal;
    if (data.ringkasanMasalah !== undefined) updateData.ringkasan_masalah = data.ringkasanMasalah;
    if (data.kategoriMasalah !== undefined) updateData.kategori_masalah = data.kategoriMasalah;
    if (Array.isArray(data.kps_ids)) updateData.kps_ids = data.kps_ids;
    if (data.lokasi) {
        if (data.lokasi.provinsi !== undefined) updateData.lokasi_prov = data.lokasi.provinsi;
        if (data.lokasi.kabupaten !== undefined) updateData.lokasi_kab = data.lokasi.kabupaten;
        if (data.lokasi.kecamatan !== undefined) updateData.lokasi_kec = data.lokasi.kecamatan;
        if (data.lokasi.desa !== undefined) updateData.lokasi_desa = data.lokasi.desa;
        if (data.lokasi.luasHa !== undefined) {
            const parsedLuasHa = Number(data.lokasi.luasHa);
            if (Number.isFinite(parsedLuasHa)) {
                updateData.lokasi_luas_ha = parsedLuasHa;
            }
        }
    }
    if (data.suratMasuk) {
        if (data.suratMasuk.nomorSurat !== undefined) updateData.surat_nomor = data.suratMasuk.nomorSurat;
        if (data.suratMasuk.fileUrl !== undefined) {
            const normalizedFileUrl = typeof data.suratMasuk.fileUrl === 'string' ? data.suratMasuk.fileUrl.trim() : data.suratMasuk.fileUrl;
            updateData.surat_file_url = normalizedFileUrl ? normalizedFileUrl : null;
        }
    }
    if (data.pengadu) {
        if (data.pengadu.nama !== undefined) updateData.pengadu_nama = data.pengadu.nama;
        if (data.pengadu.telepon !== undefined) updateData.pengadu_telepon = data.pengadu.telepon;
        if (data.pengadu.instansi !== undefined) updateData.pengadu_instansi = data.pengadu.instansi;
        if (data.pengadu.email !== undefined) {
            updateData.pengadu_email = data.pengadu.email?.trim() ? data.pengadu.email.trim() : null;
        }
    }

    return updateData;
};

export const buildAduanAuditLogPayload = (
    id: string,
    data: UpdateAduanPayload,
    updateData: Record<string, unknown>,
    auditChanges: AuditChangeEntry[]
): {
    type: ActivityType;
    description: string;
    aduanId: string;
    userId: string;
    userName: string;
    metadata: {
        fields: string[];
        changes: AuditChangeEntry[];
        from_status: string | undefined;
        to_status: string | undefined;
        nomor_tiket: string | undefined;
    };
} => {
    const auditFieldLabels = auditChanges.map((change) => change.label);
    const shortAuditList = auditFieldLabels.slice(0, 3).join(', ');
    const auditDescription = data.status
        ? `Status diubah ke **${data.status.toUpperCase()}**`
        : auditFieldLabels.length > 0
            ? `Memperbarui detail aduan: **${shortAuditList}${auditFieldLabels.length > 3 ? ` +${auditFieldLabels.length - 3} lainnya` : ''}**`
            : 'Memperbarui detail aduan';

    return {
        type: data.status ? 'update_status' : 'update_aduan',
        description: auditDescription,
        aduanId: id,
        userId: data.updatedBy || 'system',
        userName: data.updatedByName || 'User',
        metadata: {
            fields: auditFieldLabels.length > 0 ? auditFieldLabels : Object.keys(updateData),
            changes: auditChanges,
            from_status: data.auditSource?.status,
            to_status: data.status,
            nomor_tiket: data.auditSource?.nomorTiket || data.auditSource?.nomor_tiket,
        },
    };
};

export const mapRowToAduan = (row: AduanApiRow): Aduan => {
    const kpsItems = normalizeKpsItems(row);
    const kpsIds = normalizeStringArray(row.kps_ids).length > 0
        ? normalizeStringArray(row.kps_ids)
        : kpsItems.map((item) => item.id);
    const namaKps = normalizeStringArray(row.nama_kps).length > 0
        ? normalizeStringArray(row.nama_kps)
        : kpsItems.map((item) => item.nama_kps || item.nama_lembaga || '');
    const jenisKps = normalizeStringArray(row.jenis_kps).length > 0
        ? normalizeStringArray(row.jenis_kps)
        : kpsItems.map((item) => item.jenis_kps || item.skema || '');
    const typeKps = normalizeStringArray(row.type_kps).length > 0
        ? normalizeStringArray(row.type_kps)
        : kpsItems.map((item) => item.kps_type || item.skema || item.jenis_kps);
    const nomorSk = normalizeStringArray(row.nomor_sk).length > 0
        ? normalizeStringArray(row.nomor_sk)
        : kpsItems.map((item) => item.nomor_sk || item.surat_keputusan || '');

    return {
        id: normalizeString(row.id),
        nomor_tiket: normalizeString(row.nomor_tiket),
        nomorTiket: normalizeString(row.nomor_tiket),
        created_at: normalizeDate(row.created_at),
        createdAt: normalizeDate(row.created_at),
        surat_nomor: normalizeOptionalString(row.surat_nomor),
        surat_tanggal: row.surat_tanggal ? normalizeDate(row.surat_tanggal) : undefined,
        surat_asal_perihal: normalizeOptionalString(row.surat_asal_perihal),
        pengadu_nama: normalizeOptionalString(row.pengadu_nama),
        pengadu_instansi: normalizeOptionalString(row.pengadu_instansi),
        kategori_masalah: normalizeOptionalString(row.kategori_masalah),
        kategoriMasalah: normalizeOptionalString(row.kategori_masalah),
        ringkasan_masalah: normalizeOptionalString(row.ringkasan_masalah),
        ringkasanMasalah: normalizeOptionalString(row.ringkasan_masalah),
        status: normalizeString(row.status),
        prioritas: undefined,
        kps_ids: kpsIds,
        nama_kps: namaKps,
        jenis_kps: jenisKps,
        type_kps: typeKps,
        nomor_sk: nomorSk,
        kps_items: kpsItems,
        lokasi_prov: normalizeOptionalString(row.lokasi_prov),
        lokasi_kab: normalizeOptionalString(row.lokasi_kab),
        lokasi_kec: normalizeOptionalString(row.lokasi_kec),
        lokasi_desa: normalizeOptionalString(row.lokasi_desa),
        lokasi_luas_ha: normalizeNumber(row.lokasi_luas_ha),
        jumlah_kk: normalizeNumber(row.jumlah_kk),
        lokasi_lat: Array.isArray(row.lokasi_lat) ? row.lokasi_lat.map(Number) : undefined,
        lokasi_lng: Array.isArray(row.lokasi_lng) ? row.lokasi_lng.map(Number) : undefined,
        alasan_penolakan: normalizeOptionalString(row.alasan_penolakan),
        alasanPenolakan: normalizeOptionalString(row.alasan_penolakan),
        createdBy: normalizeString(row.created_by),
        createdByName: normalizeString(row.creator_name),
        updatedAt: normalizeDate(row.updated_at),
        documents: normalizeDocuments(row.documents),
        pengadu: {
            nama: normalizeString(row.pengadu_nama),
            telepon: normalizeString(row.pengadu_telepon),
            email: normalizeString(row.pengadu_email),
            instansi: normalizeString(row.pengadu_instansi)
        },
        suratMasuk: {
            nomorSurat: normalizeString(row.surat_nomor),
            tanggalSurat: row.surat_tanggal ? normalizeDate(row.surat_tanggal) : new Date(),
            asalSurat: '',
            perihal: normalizeString(row.surat_asal_perihal),
            asalSuratKategori: 'Masyarakat',
            fileUrl: normalizeString(row.surat_file_url),
        },
        lokasi: {
            provinsi: normalizeString(row.lokasi_prov),
            kabupaten: normalizeString(row.lokasi_kab),
            kecamatan: normalizeString(row.lokasi_kec),
            desa: normalizeString(row.lokasi_desa),
            luasHa: normalizeNumber(row.lokasi_luas_ha),
            balaiId: '',
            balaiName: '',
        },
        perihal: normalizeString(row.surat_asal_perihal),
        skema: typeKps[0] || kpsItems[0]?.kps_type || '',
        picId: normalizeString(row.pic_id),
        picName: normalizeString(row.pic_name),
    };
};
