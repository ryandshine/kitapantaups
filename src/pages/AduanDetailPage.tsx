import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    FileUpload
} from '../components/ui';
import type { Aduan, KpsData, TindakLanjut } from '../types';
import { AduanService } from '../lib/aduan.service';
import { KpsService } from '../lib/kps.service';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useAduanByTicket, useUpdateAduan, useDeleteAduan } from '../hooks/useAduan';
import { useKpsDetail } from '../hooks/useKps';
import { useTindakLanjutList, useCreateTindakLanjut, useDeleteTindakLanjut, useUpdateTindakLanjut } from '../hooks/useTindakLanjut';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

const formatDate = (date: Date): string => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date(date));
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
    driveFolderId: string;
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
    aduan?: Aduan;
    editForm: EditAduanForm;
    editSelectedKps: KpsData | null;
    picOptions: { value: string; label: string }[];
    isLoadingUsers: boolean;
    emailError?: string;
    isEditSubmitting: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
    onEditInput: (field: keyof EditAduanForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onSelectKps: (kps: KpsData) => void;
    onResetKps: () => void;
    onSelectPic: (value: string) => void;
    onAsalSuratKategoriChange: (value: string) => void;
    onSuratFileSelected: (files: File[]) => void;
    onSuratFileRemoved: () => void;
};

const editSectionClass = "rounded-xl border border-border/70 bg-muted/20 p-4";

const EditAduanModal: React.FC<EditAduanModalProps> = ({
    isOpen,
    isAdmin,
    aduan,
    editForm,
    editSelectedKps,
    picOptions,
    isLoadingUsers,
    emailError,
    isEditSubmitting,
    onSubmit,
    onClose,
    onEditInput,
    onSelectKps,
    onResetKps,
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

                    {!editSelectedKps ? (
                        <>
                            <KpsSearch onSelect={onSelectKps} />
                            <p className="text-[10px] text-muted-foreground mt-2">
                                Cari & pilih data Master KPS untuk mengisi otomatis lokasi.
                            </p>
                        </>
                    ) : (
                        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="p-3 bg-white rounded-md border border-border shadow-sm flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-foreground">{editSelectedKps.NAMA_KPS}</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">SK: {editSelectedKps.NO_SK}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5 bg-primary/5 text-primary border-border">
                                        {editSelectedKps.SKEMA}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-1 pt-2 border-t border-slate-50">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-semibold text-muted-foreground uppercase">Lokasi</span>
                                        <span className="text-[10px] text-foreground font-medium">Desa {editSelectedKps.DESA}, Kec. {editSelectedKps.KECAMATAN}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-semibold text-muted-foreground uppercase">Luas / KK</span>
                                        <span className="text-[10px] text-foreground font-medium">{editSelectedKps.LUAS_SK} Ha / {editSelectedKps.JML_KK} KK</span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="self-end text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/5"
                                onClick={onResetKps}
                            >
                                <Trash2 size={12} className="mr-1.5" /> Ganti / Cari Ulang
                            </Button>
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

                {!editSelectedKps && (
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
                        helperText="Unggah berkas surat masuk baru (PDF/Gambar)"
                        initialFiles={aduan?.suratMasuk?.fileUrl ? [{ name: 'Surat Terarsip', size: 0, type: 'application/pdf' } as File] : []}
                        onFileSelected={onSuratFileSelected}
                        onFileRemoved={onSuratFileRemoved}
                        accept=".pdf,image/*,.doc,.docx"
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
    const { data: selectedKpsInfo, isLoading: isLoadingKps } = useKpsDetail(aduan?.kpsId);


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
        const jenisTlLabel = latestTindakLanjut.jenisTL?.trim() || 'Tindak lanjut terbaru';
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
                    jenisTL: tl.jenisTL,
                    tanggal: tl.tanggal,
                    fileName: url.split('/').pop()?.split('?')[0] || `Lampiran TL ${index + 1}`,
                    source: 'Tindak Lanjut',
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

    // Modal State
    const [isTLModalOpen, setIsTLModalOpen] = useState(false);
    const [tlForm, setTlForm] = useState({
        jenisTL: 'Telaah Administrasi',
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: '',
        linkDrive: '',
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
        linkDrive: '',
        nomorSuratOutput: '',
        fileUrls: [] as string[],
        newFiles: [] as File[]
    });
    const [editTlUploadProgress, setEditTlUploadProgress] = useState(0);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const buildEditForm = (source?: typeof aduan | null): EditAduanForm => ({
        perihal: source?.perihal || '',
        ringkasanMasalah: source?.ringkasanMasalah || '',
        picName: source?.picName || '',
        lokasiDesa: source?.lokasi?.desa || '',
        lokasiKecamatan: source?.lokasi?.kecamatan || '',
        lokasiKabupaten: source?.lokasi?.kabupaten || '',
        lokasiProvinsi: source?.lokasi?.provinsi || '',
        lokasiLuasHa: source?.lokasi?.luasHa || 0,
        lokasiBalaiId: source?.lokasi?.balaiId || '',
        lokasiBalaiName: source?.lokasi?.balaiName || '',
        skema: source?.skema,
        jumlahKK: source?.jumlahKK || 0,
        skTerkait: source?.skTerkait || '',
        fileUrl: source?.suratMasuk?.fileUrl || '',
        driveFolderId: source?.driveFolderId || '',
        kpsId: source?.kpsId || '',
        asalSurat: source?.suratMasuk?.asalSurat || '',
        suratPerihal: source?.suratMasuk?.perihal || '',
        asalSuratKategori: source?.suratMasuk?.asalSuratKategori || 'Masyarakat',

        pengaduNama: source?.pengadu?.nama || '',
        pengaduTelepon: source?.pengadu?.telepon || '',
        pengaduEmail: source?.pengadu?.email || '',
        picId: source?.picId || ''
    });

    const [editForm, setEditForm] = useState<EditAduanForm>(buildEditForm());

    const [statusForm, setStatusForm] = useState({
        status: '',
        alasanPenolakan: '',
    });
    const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);

    const [suratFile, setSuratFile] = useState<File | null>(null);

    const [editSelectedKps, setEditSelectedKps] = useState<KpsData | null>(null);

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
    const [uploadPickerKey, setUploadPickerKey] = useState(0);
    const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
    const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<{ id: string; fileName: string } | null>(null);
    const [tlUploadProgress, setTlUploadProgress] = useState(0);
    const picOptions = useMemo(
        () => [
            { value: '__none__', label: '-- Pilih PIC --' },
            ...users.map(u => ({ value: u.id, label: u.displayName || u.email }))
        ],
        [users]
    );
    const handleEditFieldChange = (field: keyof EditAduanForm) => (value: string | number | undefined) =>
        setEditForm((prev) => ({ ...prev, [field]: value }));
    const handleEditInput = (field: keyof EditAduanForm) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            handleEditFieldChange(field)(e.target.value);

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditSelectedKps(null);
        setSuratFile(null);
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

    // Fetch Jenis Tindak Lanjut when TL Modal opens
    useEffect(() => {
        if (isTLModalOpen || isEditTlModalOpen) {
            AduanService.getJenisTindakLanjut().then(data => {
                setJenisTlOptions(data);
            });
        }
    }, [isTLModalOpen, isEditTlModalOpen]);



    const handlePrint = () => {
        window.print();
    };

    const handleDelete = async () => {
        if (!aduan || !isAdmin || !user) return;

        const confirmed = window.confirm(
            `Apakah Anda yakin ingin menghapus aduan "${aduan.nomorTiket}"?\n\nTindakan ini tidak dapat dibatalkan.`
        );

        if (!confirmed) return;

        // Log activity BEFORE deleting (since aduan_id will be gone after delete)
        const { ActivityService } = await import('../lib/activity.service');
        await ActivityService.logActivity({
            type: 'delete_aduan',
            description: `Menghapus aduan: ${aduan.nomorTiket || ''} - ${(aduan.perihal || '').substring(0, 30)}...`,
            userId: user.id,
            userName: user.displayName,
            metadata: { nomorTiket: aduan.nomorTiket, perihal: aduan.perihal }
        });

        deleteAduan(aduan.id, {
            onSuccess: () => {
                alert('Aduan berhasil dihapus.');
                navigate('/pengaduan');
            },
            onError: (err: any) => {
                console.error(err);
                alert(`Gagal menghapus aduan: ${err.message || 'Error tidak diketahui'}`);
            }
        });
    };

    const handleDeleteDocument = async () => {
        if (!deleteConfirmDoc || !aduan) return;
        setDeletingDocId(deleteConfirmDoc.id);
        try {
            await AduanService.deleteDocument(aduan.id, deleteConfirmDoc.id);
            setDeleteConfirmDoc(null);
            refetchAduan();
        } catch (err: any) {
            alert(`Gagal menghapus dokumen: ${err.message || 'Error tidak diketahui'}`);
        } finally {
            setDeletingDocId(null);
        }
    };

    const handleTLSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !aduan) return;

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
                linkDrive: tlForm.linkDrive,
                nomorSuratOutput: tlForm.nomorSuratOutput,
                fileUrls: fileUrls,
                createdBy: user.id,
                createdByName: user.displayName
            }, {
                onSuccess: () => {
                    setIsTLModalOpen(false);
                    setTlForm({
                        jenisTL: 'Telaah Administrasi',
                        tanggal: new Date().toISOString().split('T')[0],
                        keterangan: '',
                        linkDrive: '',
                        nomorSuratOutput: '',
                        files: []
                    });
                },
                onError: (err) => {
                    console.error(err);
                    alert('Gagal menyimpan tindak lanjut.');
                }
            });
        } catch (uploadError) {
            console.error('File upload failed:', uploadError);
            alert('Gagal mengunggah file. Silakan coba lagi.');
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
        setUploadPickerKey((k) => k + 1);
    };

    const handleUploadSubmit = async () => {
        if (!aduan || uploadFiles.length === 0) {
            setIsUploadModalOpen(false);
            return;
        }
        setIsUploadingSurat(true);
        try {
            await AduanService.uploadAdditionalDocuments(aduan.id, uploadFiles);
            await refetchAduan();
            resetUploadModal();
        } catch (err) {
            console.error('Failed to upload documents:', err);
            alert('Gagal mengunggah dokumen.');
        } finally {
            setIsUploadingSurat(false);
        }
    };

    const openEditTlModal = (tl: TindakLanjut) => {
        setEditingTl(tl);
        setEditTlForm({
            id: tl.id,
            jenisTL: tl.jenisTL,
            tanggal: new Date(tl.tanggal).toISOString().split('T')[0],
            keterangan: tl.keterangan || '',
            linkDrive: tl.linkDrive || '',
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
            linkDrive: '',
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
                linkDrive: editTlForm.linkDrive,
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
                    alert('Gagal memperbarui tindak lanjut.');
                }
            });
        } catch (err) {
            console.error('Gagal memperbarui tindak lanjut:', err);
            alert('Gagal memperbarui tindak lanjut.');
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

        // Initialize editSelectedKps if exists
        if (aduan.kpsId) {
            try {
                const kpsData = await KpsService.getKpsById(aduan.kpsId);
                setEditSelectedKps(kpsData);
            } catch (err) {
                console.error("Failed to load existing KPS data for edit", err);
            }
        } else {
            setEditSelectedKps(null);
        }

        setIsEditModalOpen(true);
    };

    const handleKpsSelect = (kps: KpsData) => {
        const parsedLuasHa = Number(kps.lokasi_luas_ha);
        setEditSelectedKps(kps);
        setEditForm(prev => ({
            ...prev,
            lokasiDesa: kps.lokasi_desa || prev.lokasiDesa,
            lokasiKecamatan: kps.lokasi_kec || prev.lokasiKecamatan,
            lokasiKabupaten: kps.lokasi_kab || prev.lokasiKabupaten,
            lokasiProvinsi: kps.lokasi_prov || prev.lokasiProvinsi,
            lokasiLuasHa: Number.isFinite(parsedLuasHa) ? parsedLuasHa : prev.lokasiLuasHa,
            lokasiBalaiId: (kps.balai || '').toLowerCase().replace(/\s+/g, '_') || prev.lokasiBalaiId,
            lokasiBalaiName: kps.balai || prev.lokasiBalaiName,
            skema: (kps.jenis_kps as any) || prev.skema,
            jumlahKK: kps.jumlah_kk || prev.jumlahKK,
            skTerkait: kps.nomor_sk || prev.skTerkait,
            kpsId: kps.id_kps_api || ''
        }));
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !aduan) return;

        try {


            let suratFileUrl = editForm.fileUrl;
            if (suratFile) {
                suratFileUrl = await AduanService.uploadSuratMasuk(suratFile, aduan.id);
            }

            const updateData: Partial<Aduan> & { updatedBy?: string } = {
                updatedBy: user.id,
                perihal: editForm.perihal,
                ringkasanMasalah: editForm.ringkasanMasalah,
                picId: editForm.picId,
                picName: editForm.picName,
                kpsId: editForm.kpsId,
                skema: editForm.skema,
                jumlahKK: editForm.jumlahKK,
                skTerkait: editForm.skTerkait,
                driveFolderId: editForm.driveFolderId,
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

                    setSuratFile(null);
                },
                onError: (err: any) => {
                    console.error(err);
                    alert(`Gagal menyimpan perubahan: ${err.message || 'Error tidak diketahui'}`);
                }
            });
        } catch (err: any) {
            console.error('Error in submission:', err);
            alert(`Terjadi kesalahan: ${err.message || 'Error tidak diketahui'}`);
        }
    };

    const handleStatusUpdate = () => {
        if (!user || !aduan) return;
        if (statusForm.status === 'ditolak' && !statusForm.alasanPenolakan.trim()) {
            alert('Alasan penolakan wajib diisi jika status Ditolak.');
            return;
        }
        setIsStatusSubmitting(true);
        updateAduan(
            {
                id: aduan.id,
                data: {
                    updatedBy: user.id,
                    status: statusForm.status as any,
                    alasanPenolakan: statusForm.alasanPenolakan,
                },
            },
            {
                onSuccess: () => {
                    setIsStatusSubmitting(false);
                },
                onError: (err: any) => {
                    setIsStatusSubmitting(false);
                    alert(`Gagal mengubah status: ${err.message || 'Error tidak diketahui'}`);
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
                        const res = await fetch(file.url);
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
            alert('Gagal membuat file ZIP. Silakan coba lagi.');
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

    const primaryKpsId = selectedKpsInfo?.["KPS-ID"] || selectedKpsInfo?.id_kps_api || aduan.id_kps_api?.[0] || '-';
    const primaryNamaKps = selectedKpsInfo?.NAMA_KPS || selectedKpsInfo?.nama_kps || aduan.nama_kps?.[0] || '-';
    const primaryNoSk = selectedKpsInfo?.NO_SK || selectedKpsInfo?.nomor_sk || aduan.nomor_sk?.[0] || '-';
    const primaryKpsType = selectedKpsInfo?.KPS_TYPE || selectedKpsInfo?.kps_type || selectedKpsInfo?.SKEMA || selectedKpsInfo?.jenis_kps || aduan.jenis_kps?.[0] || '-';
    const primaryProvinsi = selectedKpsInfo?.PROVINSI || selectedKpsInfo?.lokasi_prov || aduan.lokasi.provinsi || '-';
    const primaryKabupaten = selectedKpsInfo?.KAB_KOTA || selectedKpsInfo?.lokasi_kab || aduan.lokasi.kabupaten || '-';
    const primaryLuasHa = Number(selectedKpsInfo?.LUAS_SK ?? selectedKpsInfo?.lokasi_luas_ha ?? aduan.lokasi.luasHa ?? 0);
    const primaryJumlahKk = Number(selectedKpsInfo?.JML_KK ?? selectedKpsInfo?.jumlah_kk ?? aduan.jumlahKK ?? aduan.jumlah_kk ?? 0);

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700"
        >
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

            {/* Print Master KPS Info - If Available */}
            {selectedKpsInfo && (
                <div className="hidden print:block border rounded-lg p-4 mb-4 avoid-break">
                    <h3 className="font-semibold text-[11px] mb-3 border-b-2 border-primary pb-2 uppercase tracking-widest text-primary">DATA MASTER KPS (DATABASE TERVERIFIKASI)</h3>
                    <table className="w-full text-xs border-collapse border border-border">
                        <tbody>
                            <tr>
                                <td className="p-1.5 font-semibold bg-muted border border-border w-1/6">ID API KPS</td>
                                <td className="p-1.5 border border-border w-1/3">{primaryKpsId}</td>
                                <td className="p-1.5 font-semibold bg-muted border border-border w-1/6">Nama KPS</td>
                                <td className="p-1.5 border border-border w-1/3">{primaryNamaKps}</td>
                            </tr>
                            <tr>
                                <td className="p-1.5 font-semibold bg-muted border border-border">No SK</td>
                                <td className="p-1.5 border border-border">{primaryNoSk}</td>
                                <td className="p-1.5 font-semibold bg-muted border border-border">KPS Type</td>
                                <td className="p-1.5 border border-border">{primaryKpsType}</td>
                            </tr>
                            <tr>
                                <td className="p-1.5 font-semibold bg-muted border border-border">Provinsi</td>
                                <td className="p-1.5 border border-border">{primaryProvinsi}</td>
                                <td className="p-1.5 font-semibold bg-muted border border-border">Kabupaten</td>
                                <td className="p-1.5 border border-border">{primaryKabupaten}</td>
                            </tr>
                            <tr>
                                <td className="p-1.5 font-semibold bg-muted border border-border">Luas</td>
                                <td className="p-1.5 border border-border">{Number.isFinite(primaryLuasHa) ? primaryLuasHa.toLocaleString('id-ID') : 0} Ha</td>
                                <td className="p-1.5 font-semibold bg-muted border border-border">Jumlah KK</td>
                                <td className="p-1.5 border border-border">{Number.isFinite(primaryJumlahKk) ? primaryJumlahKk.toLocaleString('id-ID') : 0} KK</td>
                            </tr>
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

            {/* Print - Riwayat Tindak Lanjut */}
            {qTindakLanjutList.length > 0 && (
                <div className="hidden print:block border rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-sm mb-3 border-b pb-2 uppercase tracking-wide">RIWAYAT TINDAK LANJUT ({qTindakLanjutList.length} catatan)</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted">
                                <th className="py-2 px-2 text-left font-semibold w-8">No</th>
                                <th className="py-2 px-2 text-left font-semibold w-24">Tanggal</th>
                                <th className="py-2 px-2 text-left font-semibold w-32">Jenis TL</th>
                                <th className="py-2 px-2 text-left font-semibold">Keterangan</th>
                                <th className="py-2 px-2 text-left font-semibold w-28">Oleh</th>
                            </tr>
                        </thead>
                        <tbody>
                            {qTindakLanjutList.map((tl, index) => (
                                <tr key={tl.id} className="border-b">
                                    <td className="py-2 px-2 align-top">{index + 1}</td>
                                    <td className="py-2 px-2 align-top text-xs">{formatDate(tl.tanggal)}</td>
                                    <td className="py-2 px-2 align-top font-medium">{tl.jenisTL}</td>
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
                <div className="rounded-2xl border border-border/60 bg-white/90 dark:bg-card/90 px-5 py-4 shadow-sm backdrop-blur-xl">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-col gap-3">
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

                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{aduan.nomorTiket}</h1>
                                <StatusBadge status={aduan.status || 'baru'} className="shadow-none" />
                            </div>
                            <p className="max-w-3xl text-sm text-muted-foreground">{aduan.perihal || 'Tanpa perihal'}</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" leftIcon={<FileText size={15} />} onClick={handlePrint} className="hidden h-9 rounded-xl px-4 sm:flex">
                                Cetak
                            </Button>
                            {isAdmin && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    leftIcon={<Trash2 size={15} />}
                                    onClick={handleDelete}
                                    isLoading={isDeleting}
                                    className="h-9 rounded-xl px-4 text-destructive hover:bg-destructive/10"
                                >
                                    Hapus
                                </Button>
                            )}
                            <Button
                                variant="primary"
                                size="sm"
                                leftIcon={<Edit size={15} />}
                                onClick={openEditModal}
                                className="h-9 rounded-xl px-4"
                            >
                                Edit Data
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <motion.div variants={itemVariants} className="no-print grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{(aduan.status || '-').toUpperCase()}</p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tanggal Masuk</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{formatDate(aduan.createdAt || new Date())}</p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">PIC</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{aduan.picName || 'Belum ditentukan'}</p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Tindak Lanjut</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{qTindakLanjutList.length} catatan</p>
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

            {/* Mini TL Timeline */}
            <motion.div
                variants={itemVariants}
                className="no-print relative overflow-hidden sm:rounded-2xl border-y sm:border border-border/60 bg-white dark:bg-card p-6"
            >
                <div className="flex items-center gap-2 mb-4">
                    <Clock size={15} className="text-muted-foreground" />
                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                        Progres Tindak Lanjut
                    </span>
                    {qTindakLanjutList.length > 0 && (
                        <span className="ml-auto text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {qTindakLanjutList.length} catatan
                        </span>
                    )}
                </div>

                {qTindakLanjutList.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-4">
                        Belum ada tindak lanjut
                    </p>
                ) : (
                    <div className="relative pl-4">
                        {/* Vertical line */}
                        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

                        <div className="flex flex-col gap-4">
                            {qTindakLanjutList.map((tl, index) => (
                                <div key={tl.id} className="relative flex items-start gap-3">
                                    {/* Dot */}
                                    <div className={cn(
                                        "absolute -left-[9px] mt-0.5 h-3 w-3 rounded-full border-2 border-white shrink-0 shadow-sm",
                                        index === 0 ? "bg-foreground" : "bg-muted-foreground/40"
                                    )} />

                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={cn(
                                                "text-[11px] font-bold",
                                                index === 0 ? "text-foreground" : "text-muted-foreground"
                                            )}>
                                                {tl.jenisTL}
                                            </span>
                                            {index === 0 && (
                                                <span className="text-[9px] font-semibold bg-foreground/10 text-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                                    Terkini
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <Calendar size={9} />
                                            <span>{formatDate(tl.tanggal)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Progress Section - Removed as per user request */}


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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">ID API KPS</span>
                                    <span className="text-sm font-mono text-foreground">{primaryKpsId}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Nama KPS</span>
                                    <span className="text-sm font-semibold text-foreground">{primaryNamaKps}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">No SK</span>
                                    <span className="text-sm font-mono text-foreground">{primaryNoSk}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">KPS Type</span>
                                    <span className="text-sm font-semibold text-foreground">{primaryKpsType}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Provinsi</span>
                                    <span className="text-sm text-foreground">{primaryProvinsi}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Kabupaten</span>
                                    <span className="text-sm text-foreground">{primaryKabupaten}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Luas</span>
                                    <Badge variant="outline" className="w-fit">{Number.isFinite(primaryLuasHa) ? primaryLuasHa.toLocaleString('id-ID') : 0} Ha</Badge>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Jumlah KK</span>
                                    <Badge variant="outline" className="w-fit">{Number.isFinite(primaryJumlahKk) ? primaryJumlahKk.toLocaleString('id-ID') : 0} KK</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Informasi Master KPS */}
                    <div className="flex flex-col gap-4">
                        {isLoadingKps ? (
                            <motion.div variants={itemVariants}>
                                <Card className="rounded-2xl border border-border/80 shadow-sm">
                                    <CardContent className="p-8 flex items-center justify-center text-muted-foreground">
                                        <span className="loading loading-spinner loading-sm mr-2"></span>
                                        Memuat data KPS...
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : selectedKpsInfo ? (
                            <motion.div variants={itemVariants}>
                                <Card className="overflow-hidden rounded-2xl border border-border/80 shadow-sm">
                                    <CardHeader className="border-b border-border/70 bg-muted/30 py-4">
                                        <CardTitle className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-muted text-foreground flex items-center justify-center">
                                                    <Sparkles size={16} />
                                                </div>
                                                <span className="text-sm font-semibold">Data Master KPS</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border">
                                                    Data Terverifikasi SI-PS
                                                </Badge>
                                                <span className="text-xs text-muted-foreground font-mono">{selectedKpsInfo["KPS-ID"]}</span>
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">ID API KPS</p>
                                                    <p className="text-sm font-mono text-foreground">{primaryKpsId}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Nama KPS</p>
                                                    <p className="font-semibold text-foreground">{primaryNamaKps}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">No SK</p>
                                                    <p className="text-sm font-mono">{primaryNoSk}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">KPS Type</p>
                                                    <p className="font-semibold">{primaryKpsType}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Provinsi</p>
                                                    <p className="text-sm font-semibold">{primaryProvinsi}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Kabupaten</p>
                                                    <p className="text-sm font-semibold">{primaryKabupaten}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Luas</p>
                                                    <p className="text-sm font-semibold">{Number.isFinite(primaryLuasHa) ? primaryLuasHa.toLocaleString('id-ID') : 0} Ha</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Jumlah KK</p>
                                                    <p className="text-sm font-semibold">{Number.isFinite(primaryJumlahKk) ? primaryJumlahKk.toLocaleString('id-ID') : 0} KK</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : null}
                    </div>



                    {/* Problem Description */}
                    <motion.div variants={itemVariants}>
                        <Card className="overflow-hidden rounded-2xl border border-border/80 shadow-sm">
                            <CardHeader className="border-b border-border/70 bg-muted/30">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest">
                                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                        <FileText size={16} />
                                    </div>
                                    Ringkasan Permasalahan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <h3 className="font-semibold text-lg text-foreground mb-3">
                                    {aduan.perihal}
                                </h3>
                                <div className="text-sm text-muted-foreground leading-relaxed prose prose-slate prose-sm max-w-none">
                                    {aduan.ringkasanMasalah ? (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{aduan.ringkasanMasalah}</ReactMarkdown>
                                    ) : (
                                        <span className="text-muted-foreground italic">Tidak ada ringkasan detail.</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Tindak Lanjut Timeline */}
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
                                    >
                                        Tambah TL
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
                                                            <span className="text-[11px] font-bold text-foreground uppercase tracking-tight">{tl.jenisTL}</span>
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
                                                                {tl.linkDrive && (
                                                                    <a
                                                                        href={tl.linkDrive}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-foreground hover:text-foreground bg-muted px-2 py-1 rounded-md transition-colors"
                                                                >
                                                                    <FolderOpen size={10} />
                                                                    DOKUMEN TL
                                                                </a>
                                                            )}
                                                            {tl.fileUrls && tl.fileUrls.length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {tl.fileUrls.filter(Boolean).map((url, i) => {
                                                                        const fileName = url?.split('/').pop()?.split('?')[0] || `Lampiran ${i + 1}`;
                                                                        const displayName = fileName.includes('_') ? fileName.split('_').slice(1).join('_') : fileName;
                                                                        return (
                                                                            <a
                                                                                key={i}
                                                                                href={url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted text-foreground hover:bg-muted transition-colors text-[10px] font-medium border border-border"
                                                                                title={fileName}
                                                                            >
                                                                                <FileText size={10} />
                                                                                <span className="max-w-[150px] truncate">{displayName}</span>
                                                                            </a>
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
                                                                    title="Edit Tindak Lanjut"
                                                                >
                                                                    <Edit size={12} />
                                                                </button>
                                                            )}
                                                                {isAdmin && (
                                                                    <button
                                                                        onClick={() => {
                                                                            if (confirm('Apakah Anda yakin ingin menghapus riwayat penanganan ini?')) {
                                                                                deleteTL(tl.id);
                                                                        }
                                                                    }}
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
                                            <p className="text-xs text-muted-foreground">Dit. Pengendalian PS</p>
                                        </div>
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
                                                {file.source === 'Tindak Lanjut' ? <FolderOpen size={20} /> : <FileText size={20} />}
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
                                                <a
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-primary transition-colors"
                                                    title="Buka File"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Tindak Lanjut Modal */}
            <Modal
                isOpen={isTLModalOpen}
                onClose={() => setIsTLModalOpen(false)}
                title="Tambah Tindak Lanjut"
                description="Catat langkah penanganan terbaru agar jejak proses aduan tetap lengkap."
                className="max-w-3xl rounded-2xl border-border/80 bg-white p-6"
                size="xl"
            >
                <form onSubmit={handleTLSubmit} className="flex flex-col gap-5">
                    <div className="rounded-xl border border-border/70 bg-muted/25 p-4 space-y-4">
                        <Select
                            label="Jenis Tindak Lanjut"
                            options={jenisTlOptions.length > 0
                                ? jenisTlOptions.map(t => ({ value: t.nama_jenis_tl, label: t.nama_jenis_tl }))
                                : [
                                    { value: 'Telaah Administrasi', label: 'Telaah Administrasi' },
                                    { value: 'Dokumen Lengkap / Puldasi', label: 'Dokumen Lengkap / Puldasi' },
                                    { value: 'Sudah Puldasi / Agenda Rapat Pembahasan', label: 'Sudah Puldasi / Agenda Rapat Pembahasan' },
                                    { value: 'ND Perubahan Persetujuan PS', label: 'ND Perubahan Persetujuan PS' },
                                    { value: 'Surat Penolakan Aduan', label: 'Surat Penolakan Aduan' },
                                    { value: 'Lainnya', label: 'Lainnya' }
                                ]
                            }
                            value={tlForm.jenisTL}
                            onChange={(val) => setTlForm({ ...tlForm, jenisTL: val })}
                            fullWidth
                        />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Input
                                label="Tanggal Tindak Lanjut"
                                type="date"
                                value={tlForm.tanggal}
                                onChange={(e) => setTlForm({ ...tlForm, tanggal: e.target.value })}
                                required
                                fullWidth
                            />
                            <Input
                                label="Nomor Surat Output (Jika Ada)"
                                placeholder="Contoh: S.123/PKPS/..."
                                value={tlForm.nomorSuratOutput}
                                onChange={(e) => setTlForm({ ...tlForm, nomorSuratOutput: e.target.value })}
                                fullWidth
                                leftIcon={<FileText size={16} />}
                            />
                        </div>
                        <Textarea
                            label="Keterangan / Hasil TL"
                            placeholder="Uraikan secara ringkas hasil dari tindak lanjut ini..."
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
                            helperText="Klik atau seret file dokumen/foto hasil TL"
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
                            Simpan TL
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Edit Tindak Lanjut Modal */}
            <Modal
                isOpen={isEditTlModalOpen}
                onClose={resetEditTlForm}
                title="Edit Tindak Lanjut"
                description="Perbarui catatan tindak lanjut tanpa membuat catatan baru."
                className="max-w-3xl rounded-2xl border-border/80 bg-white p-6"
                size="xl"
            >
                <form onSubmit={handleEditTlSubmit} className="flex flex-col gap-5">
                    <div className="rounded-xl border border-border/70 bg-muted/25 p-4 space-y-4">
                        <Select
                            label="Jenis Tindak Lanjut"
                            options={jenisTlOptions.length > 0
                                ? jenisTlOptions.map(t => ({ value: t.nama_jenis_tl, label: t.nama_jenis_tl }))
                                : [
                                    { value: 'Telaah Administrasi', label: 'Telaah Administrasi' },
                                    { value: 'Dokumen Lengkap / Puldasi', label: 'Dokumen Lengkap / Puldasi' },
                                    { value: 'Sudah Puldasi / Agenda Rapat Pembahasan', label: 'Sudah Puldasi / Agenda Rapat Pembahasan' },
                                    { value: 'ND Perubahan Persetujuan PS', label: 'ND Perubahan Persetujuan PS' },
                                    { value: 'Surat Penolakan Aduan', label: 'Surat Penolakan Aduan' },
                                    { value: 'Lainnya', label: 'Lainnya' }
                                ]
                            }
                            value={editTlForm.jenisTL}
                            onChange={(val) => setEditTlForm(prev => ({ ...prev, jenisTL: val }))}
                            fullWidth
                        />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Input
                                label="Tanggal Tindak Lanjut"
                                type="date"
                                value={editTlForm.tanggal}
                                onChange={(e) => setEditTlForm(prev => ({ ...prev, tanggal: e.target.value }))}
                                required
                                fullWidth
                            />
                            <Input
                                label="Nomor Surat Output (Jika Ada)"
                                placeholder="Contoh: S.123/PKPS/..."
                                value={editTlForm.nomorSuratOutput}
                                onChange={(e) => setEditTlForm(prev => ({ ...prev, nomorSuratOutput: e.target.value }))}
                                fullWidth
                                leftIcon={<FileText size={16} />}
                            />
                        </div>
                        <Textarea
                            label="Keterangan / Hasil TL"
                            placeholder="Uraikan secara ringkas hasil dari tindak lanjut ini..."
                            value={editTlForm.keterangan}
                            onChange={(e) => setEditTlForm(prev => ({ ...prev, keterangan: e.target.value }))}
                            rows={5}
                            required
                            fullWidth
                        />
                        <Input
                            label="Link Drive (Opsional)"
                            placeholder="https://drive.google.com/..."
                            value={editTlForm.linkDrive}
                            onChange={(e) => setEditTlForm(prev => ({ ...prev, linkDrive: e.target.value }))}
                            fullWidth
                            leftIcon={<FolderOpen size={16} />}
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
                            helperText="Klik atau seret file dokumen/foto untuk menambah lampiran baru"
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
                aduan={aduan}
                editForm={editForm}
                editSelectedKps={editSelectedKps}
                picOptions={picOptions}
                isLoadingUsers={isLoadingUsers}
                emailError={emailError}
                isEditSubmitting={isEditSubmitting}
                onSubmit={handleEditSubmit}
                onClose={closeEditModal}
                onEditInput={handleEditInput}
                onSelectKps={handleKpsSelect}
                onResetKps={() => {
                    setEditSelectedKps(null);
                    setEditForm(prev => ({ ...prev, kpsId: '' }));
                }}
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
                onSuratFileSelected={(files) => setSuratFile(files[0] || null)}
                onSuratFileRemoved={() => {
                    setSuratFile(null);
                    if (!aduan?.suratMasuk?.fileUrl) {
                        setEditForm(prev => ({ ...prev, fileUrl: '' }));
                    }
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
                            onFileSelected={(files) => setUploadFiles(files)}
                            onFileRemoved={(idx) => setUploadFiles((prev) => prev.filter((_, i) => i !== idx))}
                            isLoading={isUploadingSurat}
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
        </motion.div>
    );
};
