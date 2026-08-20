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
    detailLabelClass,
    detailModalClass,
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
            className={cn(detailModalClass, "flex max-w-5xl h-[90vh] max-h-[90vh] flex-col overflow-hidden p-0")}
            size="xl"
            scrollContent={false}
        >
            <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8">
                    <div className="grid gap-8 lg:grid-cols-[9rem_minmax(0,1fr)]">
                        <aside className="hidden lg:block">
                            <div className="sticky top-0 border-r border-border/70 pr-5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Bagian aduan</p>
                                <nav className="mt-4 space-y-1" aria-label="Bagian formulir aduan">
                                    {[
                                        ['edit-ringkasan', 'Ringkasan'],
                                        ['edit-kps', 'Kelompok / KPS'],
                                        ['edit-pengadu', 'Pengadu & PIC'],
                                        ['edit-administrasi', 'Administrasi'],
                                    ].map(([id, label]) => (
                                        <a
                                            key={id}
                                            href={`#${id}`}
                                            className="block border-l-2 border-transparent px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-foreground"
                                        >
                                            {label}
                                        </a>
                                    ))}
                                </nav>
                            </div>
                        </aside>

                        <div className="min-w-0 divide-y divide-border/70">
                <section id="edit-ringkasan" className="scroll-mt-5 pb-8">
                    <div className="mb-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">01 · Ringkasan</p>
                        <h3 className="mt-1 text-base font-semibold text-foreground">Informasi inti aduan</h3>
                    </div>
                    <div className="space-y-4">
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
                </section>

                <section id="edit-kps" className="scroll-mt-5 py-8">
                    <div className="mb-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">02 · Kelompok / KPS</p>
                        <h3 className="mt-1 flex items-center gap-2 text-base font-semibold text-foreground"><Sparkles size={16} className="text-primary" /> Identitas kelompok</h3>
                    </div>

                    <KpsSearch
                        onSelect={onSelectKps}
                        placeholder="Ketik id, nama_lembaga, atau surat_keputusan..."
                    />
                    <p className="mt-2 text-[10px] text-muted-foreground">
                        Cari & pilih data Master KPS. Bisa pilih lebih dari satu.
                    </p>

                    {editSelectedKpsList.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="mb-1 flex flex-wrap items-baseline gap-x-5 gap-y-2 border-y border-border/70 py-3 text-xs">
                                <span><strong className="mr-1 text-base tabular-nums text-foreground">{editSelectedKpsList.length}</strong><span className="text-muted-foreground">KPS</span></span>
                                <span><strong className="mr-1 text-base tabular-nums text-foreground">{editSelectedKpsList.reduce((sum, item) => sum + (Number(item.luas_total ?? item.lokasi_luas_ha) || 0), 0).toLocaleString('id-ID')}</strong><span className="text-muted-foreground">Ha total</span></span>
                                <span><strong className="mr-1 text-base tabular-nums text-foreground">{editSelectedKpsList.reduce((sum, item) => sum + (Number(item.anggota_pria) || 0), 0).toLocaleString('id-ID')}</strong><span className="text-muted-foreground">anggota pria</span></span>
                                <span><strong className="mr-1 text-base tabular-nums text-foreground">{editSelectedKpsList.reduce((sum, item) => sum + (Number(item.anggota_wanita) || 0), 0).toLocaleString('id-ID')}</strong><span className="text-muted-foreground">anggota wanita</span></span>
                            </div>
                            {editSelectedKpsList.map((kps) => {
                                const kpsId = getNormalizedKpsId(kps);
                                return (
                                    <div key={`card-${kpsId || kps.nama_kps}`} className="border-t border-border/70 py-3 first:border-t-0">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-foreground">{kps.nama_lembaga || kps.nama_kps || '-'}</p>
                                                <p className="mt-0.5 text-[10px] text-muted-foreground">{kps.surat_keputusan || kps.nomor_sk || '-'} · {kps.skema || resolveKpsType(kps) || '-'}</p>
                                            </div>
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => onRemoveKps(kpsId)}
                                            >
                                                <Trash2 size={11} />
                                                Hapus
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>id</span>
                                                <span className="break-all text-xs font-mono text-foreground">{getDisplayedKpsId(kps)}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>nama_lembaga</span>
                                                <span className="truncate text-xs font-semibold text-foreground">{kps.nama_lembaga || kps.nama_kps || '-'}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>surat_keputusan</span>
                                                <span className="truncate text-xs font-mono text-foreground">{kps.surat_keputusan || kps.nomor_sk || '-'}</span>
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
                </section>

                <section id="edit-pengadu" className="scroll-mt-5 py-8">
                    <div className="mb-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">03 · Pengadu & PIC</p>
                        <h3 className="mt-1 flex items-center gap-2 text-base font-semibold text-foreground"><User size={16} className="text-primary" /> Pihak terkait</h3>
                    </div>

                    {isAdmin && (
                    <div className="mb-5 max-w-xl">
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

                    <div className="space-y-4">
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
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                </section>

                <section id="edit-administrasi" className="scroll-mt-5 py-8 pb-2">
                    <div className="mb-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">04 · Administrasi</p>
                        <h3 className="mt-1 text-base font-semibold text-foreground">Administrasi surat</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                            label="Perihal Surat"
                            value={editForm.suratPerihal || ''}
                            onChange={onEditInput('suratPerihal')}
                            placeholder="Masukkan perihal surat..."
                            fullWidth
                        />
                    </div>
                </section>
                        </div>
                    </div>
                </div>

                <ModalFooter className="shrink-0 border-t border-border bg-card px-6 py-4 sm:px-8">
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
