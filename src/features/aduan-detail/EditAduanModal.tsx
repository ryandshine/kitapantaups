import React from 'react';
import { CheckCircle, Sparkles, Trash2, User } from 'lucide-react';
import {
    Badge,
    Button,
    Input,
    KpsSearch,
    Modal,
    ModalFooter,
    Select,
    Textarea,
} from '../../components/ui';
import { cn } from '../../lib/utils';
import type { KpsData } from '../../types';
import {
    detailBadgeClass,
    detailLabelClass,
    detailModalClass,
    detailSectionClass,
    detailSectionSoftClass,
    getDisplayedKpsId,
    getNormalizedKpsId,
    resolveKpsType,
    type EditAduanForm,
} from './utils';

export type EditAduanModalProps = {
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
    suratFileStatuses: Array<{
        fileName: string;
        status: 'selected' | 'uploading' | 'success' | 'error';
        progress?: number;
        message?: string;
    }>;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
    onEditInput: (field: keyof EditAduanForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onSelectKps: (kps: KpsData) => void;
    onRemoveKps: (kpsId: string) => void;
    onSelectPic: (value: string) => void;
    onSuratFileSelected: (files: File[]) => void;
    onSuratFileRemoved: () => void;
};

export const EditAduanModal: React.FC<EditAduanModalProps> = ({
    isOpen,
    isAdmin,
    editForm,
    editSelectedKpsList,
    picOptions,
    isLoadingUsers,
    emailError,
    isEditSubmitting,
    onSubmit,
    onClose,
    onEditInput,
    onSelectKps,
    onRemoveKps,
    onSelectPic,
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Data Aduan"
            description="Perbarui informasi inti aduan tanpa mengubah riwayat penanganan."
            className={cn("max-w-4xl", detailModalClass)}
            size="xl"
        >
            <form onSubmit={onSubmit} className="flex flex-col gap-5">
                <div className={`${detailSectionClass} space-y-4`}>
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

                <div className={detailSectionSoftClass}>
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Sparkles size={16} />
                        Identitas Kelompok / KPS
                    </label>

                    <KpsSearch
                        onSelect={onSelectKps}
                        placeholder="Ketik id, nama_lembaga, atau surat_keputusan..."
                    />
                    <p className="mt-2 text-[10px] text-muted-foreground">
                        Cari & pilih data Master KPS. Bisa pilih lebih dari satu.
                    </p>

                    {editSelectedKpsList.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] ${detailBadgeClass}`}>
                                    Total KPS: {editSelectedKpsList.length}
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] ${detailBadgeClass}`}>
                                    Total luas_total: {editSelectedKpsList.reduce((sum, item) => sum + (Number(item.luas_total ?? item.lokasi_luas_ha) || 0), 0).toLocaleString('id-ID')} Ha
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] ${detailBadgeClass}`}>
                                    Total anggota_pria: {editSelectedKpsList.reduce((sum, item) => sum + (Number(item.anggota_pria) || 0), 0).toLocaleString('id-ID')}
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] ${detailBadgeClass}`}>
                                    Total anggota_wanita: {editSelectedKpsList.reduce((sum, item) => sum + (Number(item.anggota_wanita) || 0), 0).toLocaleString('id-ID')}
                                </Badge>
                            </div>
                            {editSelectedKpsList.map((kps) => {
                                const kpsId = getNormalizedKpsId(kps);
                                return (
                                    <div key={`card-${kpsId || kps.nama_kps}`} className="rounded-md border border-border bg-card p-3 shadow-sm">
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
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>id</span>
                                                <span className="break-all text-xs font-mono text-foreground">{getDisplayedKpsId(kps)}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>nama_lembaga</span>
                                                <span className="text-xs font-semibold text-foreground">{kps.nama_lembaga || kps.nama_kps || '-'}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>surat_keputusan</span>
                                                <span className="text-xs font-mono text-foreground">{kps.surat_keputusan || kps.nomor_sk || '-'}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>skema</span>
                                                <span className="text-xs font-semibold text-foreground">{kps.skema || resolveKpsType(kps)}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>provinsi</span>
                                                <span className="text-xs text-foreground">{kps.provinsi || kps.lokasi_prov || '-'}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>kabupaten</span>
                                                <span className="text-xs text-foreground">{kps.kabupaten || kps.lokasi_kab || '-'}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>luas_total</span>
                                                <Badge variant="outline" className="w-fit">{(Number(kps.luas_total ?? kps.lokasi_luas_ha ?? 0) || 0).toLocaleString('id-ID')} Ha</Badge>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>anggota_pria</span>
                                                <Badge variant="outline" className="w-fit">{(Number(kps.anggota_pria ?? 0) || 0).toLocaleString('id-ID')}</Badge>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>anggota_wanita</span>
                                                <Badge variant="outline" className="w-fit">{(Number(kps.anggota_wanita ?? 0) || 0).toLocaleString('id-ID')}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {isAdmin && (
                    <div className={detailSectionClass}>
                        <Select
                            label="PIC (Penanggung Jawab)"
                            options={picOptions}
                            value={editForm.picId || '__none__'}
                            onChange={onSelectPic}
                            fullWidth
                            disabled={isLoadingUsers}
                        />
                        {isLoadingUsers && <p className="mt-1 text-[10px] text-muted-foreground">Memuat daftar user...</p>}
                    </div>
                )}

                <div className={`${detailSectionSoftClass} space-y-4`}>
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
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
                    <Input
                        label="Lembaga / Kelompok Pengadu"
                        value={editForm.pengaduInstansi}
                        onChange={onEditInput('pengaduInstansi')}
                        placeholder="Contoh: KTH Wana Makmur"
                        fullWidth
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

                <div className={`${detailSectionClass} grid grid-cols-1 gap-4 sm:grid-cols-2`}>
                    <div className="sm:col-span-2">
                        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Administrasi Surat</label>
                    </div>
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

                <ModalFooter className="sticky bottom-0 z-10 -mx-1 border-t border-border bg-card/95 px-1 pt-4 pb-1 backdrop-blur">
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
