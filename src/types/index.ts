export type Skema = 'HKm' | 'HTR' | 'HD' | 'HA' | 'IPHPS' | 'KulinKK';

export interface KpsData {
    id_kps_api: string;
    nama_kps: string;
    jenis_kps: string;
    nomor_sk: string;
    lokasi_prov: string;
    lokasi_kab: string;
    lokasi_kec?: string;
    lokasi_desa?: string;
    lokasi_luas_ha: number;
    jumlah_kk: number;
    balai?: string;
    sekwil?: string;
    luas_hutan_lindung?: number;
    luas_hutan_produksi_terbatas?: number;
    luas_hutan_produksi?: number;
    luas_hutan_produksi_konversi?: number;
    // For UI tracking
    lat?: number;
    lng?: number;

    // Legacy Uppercase Aliases (from PKPS API)
    "KPS-ID"?: string;
    SKEMA?: string;
    NAMA_KPS?: string;
    NO_SK?: string;
    TGL_SK?: string;
    LUAS_SK?: number;
    DESA?: string;
    KECAMATAN?: string;
    KAB_KOTA?: string;
    PROVINSI?: string;
    BALAI?: string;
    JML_KK?: number;
    HL?: number;
    HPT?: number;
    HP?: number;
    HPK?: number;
    SK_PENDAHULU?: string;
    TGL_SK_AWAL?: string;
}

export type StatusAduan = string;
export type KategoriMasalah = string;
export type Prioritas = 'tinggi' | 'sedang' | 'rendah' | 'biasa';

export type ArahanDisposisi =
    | 'nd_balai'
    | 'rapat'
    | 'teruskan_pkps'
    | 'teruskan_pktha'
    | 'telaah'
    | 'surat_jawaban'
    | 'monitor'
    | 'arsip';

export type BlockingType =
    | 'balai'
    | 'direktorat'
    | 'eksternal'
    | 'jadwal'
    | 'dokumen'
    | 'keputusan';

export interface Lokasi {
    balaiId: string;
    balaiName: string;
    provinsi: string;
    kabupaten: string;
    kecamatan: string;
    desa: string;
    luasHa: number;
    koordinat?: {
        lat: number;
        lng: number;
    };
}

export interface Pengadu {
    nama: string;
    telepon: string;
    email?: string;
    instansi?: string;
    alamat?: string;
}

export interface SuratMasuk {
    nomorSurat: string;
    tanggalSurat: Date;
    asalSurat: string;
    perihal?: string;
    asalSuratKategori?: string;
    fileUrl?: string;
}

export interface Blocking {
    type: BlockingType;
    blockedBy: string;
    blockedByName: string;
    reason: string;
    expectedDate?: Date;
    blockedAt: Date;
    blockedByUserId: string;
    relatedEntity?: {
        type: string;
        id: string;
        name: string;
    };
}

export interface TindakLanjut {
    id: string;
    aduanId: string;
    tanggal: Date;
    jenisTL: string;
    keterangan: string;
    nomorSuratOutput?: string;
    fileUrls: string[];
    linkDrive?: string;
    createdBy: string;
    createdByName: string;
    createdAt: Date;
}



export interface Aduan {
    id: string;
    nomor_tiket: string;
    created_at: Date;

    // User Input Fields
    surat_nomor?: string;
    surat_tanggal?: Date;
    surat_asal_perihal?: string;
    pengadu_nama?: string;
    pengadu_instansi?: string;
    kategori_masalah?: string;
    ringkasan_masalah?: string;
    prioritas: Prioritas;
    status: string;

    // LOCATION & KPS LOGIC (CRITICAL)
    id_kps_api: string[];
    nama_kps: string[];
    jenis_kps: string[];
    nomor_sk: string[];

    // Legacy / Transitional Aliases
    nomorTiket?: string;
    createdAt?: Date;
    kategoriMasalah?: string;
    ringkasanMasalah?: string;

    lokasi_prov?: string;
    lokasi_kab?: string;
    lokasi_kec?: string;
    lokasi_desa?: string;
    // Aggregated or manual values
    lokasi_luas_ha?: number;
    jumlah_kk?: number;

    // Coordinates
    lokasi_lat?: number[];
    lokasi_lng?: number[];

    // Associated Data (from joins)

    dokumen_aduan?: any[];

    // Auth metadata
    createdBy: string;
    createdByName: string;
    updatedAt: Date;

    // Frontend / Transitional Fields (CamelCase)
    skema?: string;
    arahanDisposisi?: ArahanDisposisi;
    picId?: string;
    picName?: string;
    isBlocked?: boolean;
    blocking?: Blocking;
    deadline?: Date | string;
    updatedBy?: string;
    jumlahKK?: number;
    alasanPenolakan?: string;
    driveFolderId?: string;

    perihal?: string;
    kpsId?: string;
    skTerkait?: string;
    alasan_penolakan?: string;
    ditolakAt?: string | Date;

    // Nested structures for easier form mapping
    lokasi: Lokasi;
    suratMasuk: SuratMasuk;
    pengadu: Pengadu;

    documents?: {
        id: string;
        file_url: string;
        file_name: string;
        file_category?: string;
    }[];
}

export interface User {
    id: string;
    email: string;
    displayName: string;
    role: 'admin' | 'staf';
    phone?: string;
    photoURL?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Notification {
    id: string;
    userId: string;
    aduanId?: string;
    title: string;
    message: string;
    type: 'disposisi' | 'deadline' | 'update' | 'reminder' | 'escalation';
    isRead: boolean;
    createdAt: Date;
    readAt?: Date;
}

// Master data
export interface Balai {
    id: string;
    nama: string;
    kode: string;
    wilayah: string[];
}

// Statistics for dashboard
// DTO for creating new aduan (subset of Aduan)
export type CreateAduanDTO = Omit<Aduan, 'id' | 'nomor_tiket' | 'created_at' | 'status' | 'createdBy' | 'createdByName' | 'updatedAt'>;

export type CreateTindakLanjutDTO = Omit<TindakLanjut, 'id' | 'createdAt'>;

export type ActivityType =
    // Existing
    | 'create_aduan'
    | 'update_status'
    | 'assign_pic'
    | 'create_tl'
    | 'blocking_aduan'
    | 'unblocking_aduan'
    | 'delete_aduan'
    | 'update_aduan'
    // Document Management
    | 'upload_document'
    | 'delete_document'
    | 'sync_drive'
    | 'export_data'
    // Specific Aduan & Disposisi
    | 'update_priority'
    | 'update_disposisi'
    | 'update_kps_lokasi'
    | 'send_notification'
    // Follow-up
    | 'update_tl'
    | 'delete_tl'
    | 'upload_tl_document'
    // User & Security
    | 'user_login'
    | 'user_logout'
    | 'create_user'
    | 'update_user'
    | 'change_role'
    // Integration & Settings
    | 'update_settings'
    | 'ai_generate_summary'
    | 'sync_master_data';

export interface AppActivity {
    id: string;
    type: ActivityType;
    description: string;
    aduanId?: string;
    userId: string;
    userName: string;
    createdAt: Date;
    metadata?: any;
}

export interface DashboardStats {
    disposisi: number;
    proses: number;
    selesai: number;
    ditolak: number;
    total: number;
}



export interface AppSettings {
    ai_provider: 'openrouter' | 'gemini';
    openrouter_api_key: string;
    openrouter_model: string;
    gemini_api_key: string;
    gemini_model: string;
    ai_custom_instructions?: string;
}

