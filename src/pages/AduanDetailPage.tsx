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
    formatStatusLabel,
    Badge,
    Modal,
    ModalFooter,
    Input,
    Select,
    Textarea,
    FileUpload,
    type FileUploadItemState,
    ConfirmDialog
} from '../components/ui';
import type { KpsData, TindakLanjut, User as AppUser } from '../types';
import { AduanService } from '../lib/aduan.service';
import { KpsService } from '../lib/kps.service';
import { ActivityService } from '../lib/activity.service';
import { authorizedFetch } from '../lib/api';
import { AduanFollowUpService } from '../lib/aduan.followups';
import { AduanReferenceService } from '../lib/aduan.references';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useAduanByTicket, useUpdateAduan, useDeleteAduan } from '../hooks/useAduan';
import { useTindakLanjutList, useCreateTindakLanjut, useDeleteTindakLanjut, useUpdateTindakLanjut } from '../hooks/useTindakLanjut';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AduanPdfService } from '../lib/aduan-pdf.service';
import { EditAduanModal } from '../features/aduan-detail/EditAduanModal';
import {
    DEFAULT_JENIS_TL_SELECT_OPTIONS,
    buildEditAduanForm,
    buildEditAduanUpdatePayload,
    buildEditFormFromSelectedKps,
    buildLokasiObjekItems,
    buildSelectedUploadStates,
    buildStoredUploadState,
    detailBadgeClass,
    detailCardClass,
    detailCardHeaderClass,
    detailIconClass,
    detailLabelClass,
    detailModalClass,
    detailSectionClass,
    detailSectionSoftClass,
    formatDate,
    getFileAccessErrorMessage,
    getNormalizedKpsId,
    normalizeJenisTlLabel,
    normalizeSelectedKps,
    openProtectedFile,
    type EditAduanForm,
    type FeedbackState,
    updateUploadStatusAt,
} from '../features/aduan-detail/utils';

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

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
                    source: 'Dok. Tindak Lanjut',
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

    const [editForm, setEditForm] = useState<EditAduanForm>(buildEditAduanForm());

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
    const handleOpenProtectedFile = async (url: string, fileName: string) => {
        await openProtectedFile({
            url,
            fileName,
            fetchAuthorizedFile,
            onFeedback: setFeedback,
        });
    };

    const canInputRiwayatPenanganan = (aduan?.status || '').toLowerCase() === 'proses';
    const lokasiObjekItems = useMemo(() => buildLokasiObjekItems(aduan, relatedKpsById), [aduan, relatedKpsById]);

    const totalLuasObjek = lokasiObjekItems.reduce((sum, item) => sum + (Number(item.luasHa) || 0), 0);
    const totalAnggotaPriaObjek = lokasiObjekItems.reduce((sum, item) => sum + (Number(item.anggotaPria) || 0), 0);
    const totalAnggotaWanitaObjek = lokasiObjekItems.reduce((sum, item) => sum + (Number(item.anggotaWanita) || 0), 0);
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

    const [users, setUsers] = useState<AppUser[]>([]);
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
        setEditForm(buildEditAduanForm(aduan));
    };

    useEffect(() => {
        if (aduan) {
            setEditForm(buildEditAduanForm(aduan));
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
            AduanReferenceService.getMasterStatuses().then(setMasterStatuses).catch(console.error);
        }

        if (isAdmin && !users.length && !isLoadingUsers) {
            setIsLoadingUsers(true);
            AduanReferenceService.getUsersByRole()
                .then(setUsers)
                .catch(console.error)
                .finally(() => setIsLoadingUsers(false));
        }
    }, [isEditModalOpen, isAdmin, masterStatuses.length, users.length, isLoadingUsers]);

    // Fetch jenis dokumen when the dokumen modal opens
    useEffect(() => {
        if (isTLModalOpen || isEditTlModalOpen) {
            AduanFollowUpService.getJenisTindakLanjut()
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
        } catch (err) {
            console.error('Failed to export PDF:', err);
            setFeedback({ type: 'error', message: `Gagal membuat PDF: ${getErrorMessage(err, 'Error tidak diketahui')}` });
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
            onError: (err: unknown) => {
                console.error(err);
                setFeedback({ type: 'error', message: `Gagal menghapus aduan: ${getErrorMessage(err, 'Error tidak diketahui')}` });
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
            await AduanReferenceService.deleteDocument(aduan.id, deleteConfirmDoc.id);
            setDeleteConfirmDoc(null);
            refetchAduan();
        } catch (err) {
            setFeedback({ type: 'error', message: `Gagal menghapus dokumen: ${getErrorMessage(err, 'Error tidak diketahui')}` });
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
                onError: (err: unknown) => {
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
        const baseForm = buildEditAduanForm(aduan);
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
            setEditForm((current) => ({
                ...current,
                ...buildEditFormFromSelectedKps(nextList, current),
            }));
            return nextList;
        });
    };

    const handleRemoveSelectedKps = (kpsId: string) => {
        setEditSelectedKpsList((prev) => {
            const nextList = prev.filter((item) => getNormalizedKpsId(item) !== kpsId);
            setEditForm((current) => ({
                ...current,
                ...buildEditFormFromSelectedKps(nextList, current, { clearLocationWhenEmpty: true }),
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
                } catch (uploadError) {
                    console.error('Failed to upload surat masuk during edit:', uploadError);
                    setSuratUploadProgress(0);
                    setSuratFileStatuses((prev) => updateUploadStatusAt(prev, [suratFile], 0, {
                        status: 'error',
                        progress: undefined,
                        message: getErrorMessage(uploadError, 'Lampiran surat masuk gagal diunggah.'),
                    }));
                    setFeedback({
                        type: 'error',
                        message: `Upload surat masuk gagal: ${getErrorMessage(uploadError, 'Lampiran surat masuk gagal diunggah.')}`
                    });
                    return;
                }
            }

            const updateData = buildEditAduanUpdatePayload({
                aduan,
                editForm,
                editSelectedKpsList,
                updatedBy: user.id,
                updatedByName: user.displayName,
                suratFileUrl,
            });

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
                onError: (err: unknown) => {
                    console.error(err);
                    setFeedback({ type: 'error', message: `Gagal menyimpan perubahan: ${getErrorMessage(err, 'Error tidak diketahui')}` });
                }
            });
        } catch (err) {
            console.error('Error in submission:', err);
            setFeedback({ type: 'error', message: `Terjadi kesalahan: ${getErrorMessage(err, 'Error tidak diketahui')}` });
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
                    status: statusForm.status,
                    alasanPenolakan: statusForm.alasanPenolakan,
                },
            },
            {
                onSuccess: () => {
                    setIsStatusSubmitting(false);
                    setFeedback({ type: 'success', message: 'Status aduan berhasil diperbarui.' });
                },
                onError: (err: unknown) => {
                    setIsStatusSubmitting(false);
                    setFeedback({ type: 'error', message: `Gagal mengubah status: ${getErrorMessage(err, 'Error tidak diketahui')}` });
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
            <div className="flex h-96 flex-col items-center justify-center gap-4 text-muted-foreground">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="animate-pulse">Menghubungkan ke database...</p>
            </div>
        );
    }

    if (isDeleting) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4 text-muted-foreground">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="animate-pulse font-semibold">Menghapus data...</p>
            </div>
        );
    }

    if (isAduanError || !aduan) {
        return (
            <Card className="mx-auto mt-20 max-w-md border-border bg-card text-center shadow-xl">
                <CardContent className="pt-10 pb-10">
                    <AlertTriangle className="h-16 w-16 text-destructive/50 mx-auto mb-6" />
                    <h2 className="text-xl font-bold mb-3">
                        {isAduanError ? 'Terjadi Kesalahan' : 'Aduan Tidak Ditemukan'}
                    </h2>
                    <p className="mb-8 px-4 text-balance text-muted-foreground">
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
        <Card className={detailCardClass}>
            <CardHeader className={detailCardHeaderClass}>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-foreground">
                    <div className={detailIconClass}>
                        <FileText size={16} />
                    </div>
                    Ringkasan Permasalahan
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <h3 className="mb-3 text-lg font-semibold text-foreground">
                    {aduan.perihal}
                </h3>
                <div className="prose prose-slate prose-sm max-w-none text-sm leading-relaxed text-foreground prose-p:text-foreground prose-strong:text-foreground">
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
                            feedback.type === 'success' && "border-secondary/20 bg-secondary/10 text-secondary",
                            feedback.type === 'error' && "border-destructive/20 bg-destructive/10 text-destructive",
                            feedback.type === 'info' && "border-primary/20 bg-primary/10 text-foreground"
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
                    <p className="text-sm text-black/70">Direktorat Pengendalian Perhutanan Sosial</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-semibold">Laporan Detail Aduan</p>
                    <p className="text-xs text-black/70">Tiket: {aduan.nomorTiket}</p>
                    <p className="text-xs text-black/70">Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
            </div>

            {/* Print Summary Table - Only visible when printing */}
            <div className="hidden print:block border rounded-lg p-4 mb-4">
                <table className="w-full text-sm border-collapse">
                    <tbody>
                        <tr className="border-b">
                            <td className="py-2 font-semibold w-1/4 bg-white/20 px-2 text-[10px] uppercase">No. Tiket</td>
                            <td className="py-2 px-2 font-mono">{aduan.nomorTiket}</td>
                            <td className="py-2 font-semibold w-1/4 bg-white/20 px-2 text-[10px] uppercase">Status Aduan</td>
                            <td className="py-2 px-2 font-semibold uppercase">{formatStatusLabel(aduan.status)}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 font-semibold bg-white/20 px-2 text-[10px] uppercase">Kategori</td>
                            <td className="py-2 px-2 capitalize" colSpan={3}>{aduan.kategoriMasalah?.replace(/_/g, ' ') || '-'}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 font-semibold bg-white/20 px-2 text-[10px] uppercase">Nama Pengadu</td>
                            <td className="py-2 px-2 font-semibold">{aduan.pengadu.nama}</td>
                            <td className="py-2 font-semibold bg-white/20 px-2 text-[10px] uppercase">Kontak/HP</td>
                            <td className="py-2 px-2">{aduan.pengadu.telepon || '-'}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 font-semibold bg-white/20 px-2 text-[10px] uppercase">Instansi/Kelompok</td>
                            <td className="py-2 px-2" colSpan={3}>{aduan.pengadu.instansi || '-'}</td>
                        </tr>
                        <tr>
                            <td className="py-2 font-semibold bg-white/20 px-2 text-[10px] uppercase">PIC Petugas</td>
                            <td className="py-2 px-2">{aduan.picName || 'Belum ditentukan'}</td>
                            <td className="py-2 font-semibold bg-white/20 px-2 text-[10px] uppercase">Tgl Masuk</td>
                            <td className="py-2 px-2">{formatDate(aduan.createdAt || new Date())}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Print Master KPS Info */}
            {lokasiObjekItems.length > 0 && (
                <div className="hidden print:block border rounded-lg p-4 mb-4 avoid-break">
                    <h3 className="mb-3 border-b-2 border-primary pb-2 text-[11px] font-semibold uppercase tracking-widest">LOKASI OBJEK</h3>
                    <table className="w-full text-xs border-collapse border border-white/20">
                        <thead>
                            <tr className="bg-white/20">
                                <th className="p-1.5 border border-white/20 text-left">id</th>
                                <th className="p-1.5 border border-white/20 text-left">nama_lembaga</th>
                                <th className="p-1.5 border border-white/20 text-left">surat_keputusan</th>
                                <th className="p-1.5 border border-white/20 text-left">skema</th>
                                <th className="p-1.5 border border-white/20 text-left">provinsi</th>
                                <th className="p-1.5 border border-white/20 text-left">kabupaten</th>
                                <th className="p-1.5 border border-white/20 text-left">luas_total</th>
                                <th className="p-1.5 border border-white/20 text-left">anggota_pria</th>
                                <th className="p-1.5 border border-white/20 text-left">anggota_wanita</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lokasiObjekItems.map((item, index) => (
                                <tr key={`print-kps-${index}`}>
                                    <td className="p-1.5 border border-white/20">{item.idApiKps}</td>
                                    <td className="p-1.5 border border-white/20">{item.namaKps}</td>
                                    <td className="p-1.5 border border-white/20">{item.noSk}</td>
                                    <td className="p-1.5 border border-white/20">{item.kpsType}</td>
                                    <td className="p-1.5 border border-white/20">{item.provinsi}</td>
                                    <td className="p-1.5 border border-white/20">{item.kabupaten}</td>
                                    <td className="p-1.5 border border-white/20">{(Number(item.luasHa) || 0).toLocaleString('id-ID')} Ha</td>
                                    <td className="p-1.5 border border-white/20">{(Number(item.anggotaPria) || 0).toLocaleString('id-ID')}</td>
                                    <td className="p-1.5 border border-white/20">{(Number(item.anggotaWanita) || 0).toLocaleString('id-ID')}</td>
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
                            <tr className="border-b bg-white/20">
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
                <div className="google-panel-green relative overflow-hidden rounded-2xl px-5 py-4 backdrop-blur-xl">
                    <div className="google-hero-orb pointer-events-none" />
                    <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1fr)_27rem] xl:items-start">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate('/pengaduan')}
                                    className="h-8 rounded-lg px-2.5 text-muted-foreground hover:bg-white/8 hover:text-foreground"
                                    leftIcon={<ArrowLeft size={14} />}
                                >
                                    Kembali
                                </Button>
                                <span className="text-border">|</span>
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    <Tag size={12} />
                                    <span>{aduan.kategoriMasalah || '-'}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2.5">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{aduan.nomorTiket}</h1>
                                    <StatusBadge status={aduan.status || 'baru'} className="border-border bg-muted text-foreground shadow-none" />
                                </div>
                                <p className="max-w-3xl text-[0.92rem] leading-relaxed text-muted-foreground">{aduan.perihal || 'Tanpa perihal'}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 xl:items-stretch">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2 xl:w-full">
                                {overviewCards.map((card) => (
                                    <div key={card.label} className="rounded-2xl border border-border bg-muted/60 p-3 shadow-sm">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{card.label}</p>
                                            <card.icon size={13} className="text-muted-foreground" />
                                        </div>
                                        <p className="mt-2 text-sm font-semibold text-foreground">{card.value}</p>
                                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{card.hint}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<FileText size={15} />}
                                    onClick={handlePrint}
                                    className="h-9 rounded-xl border-border bg-muted px-4 text-foreground hover:bg-accent hover:text-foreground"
                                    isLoading={isExportingPdf}
                                >
                                    PDF
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Upload size={15} />}
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="h-9 rounded-xl border-border bg-muted px-4 text-foreground hover:bg-accent hover:text-foreground"
                                >
                                    Upload
                                </Button>
                                <Button
                                    className="google-hero-button h-9 rounded-xl px-4 border-none"
                                    leftIcon={<Edit size={15} />}
                                    onClick={openEditModal}
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
                                        className="h-9 rounded-xl px-4 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
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

            {/* Rejection Alert Banner */}
            {aduan.status === 'ditolak' && (
                <div className="mx-1 flex items-start gap-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-3.5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 no-print">
                    <div className="p-2 bg-destructive/10 rounded-full h-fit text-destructive shrink-0">
                        <AlertCircle size={20} />
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                        <div className="flex justify-between items-start gap-4">
                            <h3 className="font-semibold text-destructive text-sm uppercase tracking-wider">Aduan Ditolak</h3>
                            {aduan.ditolakAt && (
                                <span className="text-[10px] bg-transparent/50 px-2 py-0.5 rounded-md text-destructive font-medium border border-destructive/10">
                                    {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(aduan.ditolakAt))}
                                </span>
                            )}
                        </div>
                        <p className="text-sm leading-relaxed font-medium text-muted-foreground">
                            {aduan.alasanPenolakan || 'Tidak ada alasan penolakan yang dicatat.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Status Card — Admin Only */}
            {isAdmin && (
                <motion.div
                    variants={itemVariants}
                    className="no-print relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-[var(--shadow-card)]"
                >
                    <div className="mb-3 flex items-center gap-2">
                        <Settings size={15} className="text-muted-foreground" />
                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                            Ubah Status Aduan
                        </span>
                        <StatusBadge status={aduan.status} className="ml-auto border-border bg-muted text-foreground" />
                    </div>
                    <div className="space-y-3">
                        <Select
                            label="Status Baru"
                            options={[
                                { value: 'baru', label: 'Baru' },
                                { value: 'proses', label: 'Proses Penanganan' },
                                { value: 'menunggu_tanggapan', label: 'Menunggu Tanggapan' },
                                { value: 'selesai', label: 'Selesai' },
                            ]}
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

            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-5">
                    {/* Summary Info - Always 2 columns for Pengadu & Surat Masuk */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Card className={`h-full ${detailCardClass}`}>
                            <CardHeader className={`${detailCardHeaderClass} py-3.5`}>
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-foreground">
                                    <User className="h-4 w-4" />
                                    Data Pengadu
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4 py-5">
                                <div className="flex flex-col gap-1.5">
                                    <span className={detailLabelClass}>Nama Lengkap</span>
                                    <span className="text-[0.95rem] font-semibold text-foreground">{aduan.pengadu.nama}</span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className={detailLabelClass}>Informasi Kontak</span>
                                    <div className="flex flex-col gap-2.5">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <Phone size={14} />
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-foreground">{aduan.pengadu.telepon || 'Tidak tersedia'}</span>
                                            {aduan.pengadu.telepon && (
                                                <a href={`tel:${aduan.pengadu.telepon}`} className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-foreground transition-colors hover:bg-accent">
                                                    <ExternalLink size={12} />
                                                </a>
                                            )}
                                        </div>
                                        {aduan.pengadu.email && (
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                                                    <Globe size={14} />
                                                </div>
                                                <span className="break-all text-[11px] font-semibold text-foreground">{aduan.pengadu.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className={detailLabelClass}>Instansi / Kelompok</span>
                                    <div className="flex items-center gap-2 text-[0.92rem] font-medium text-foreground">
                                        <div className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                                            <Briefcase size={14} />
                                        </div>
                                        <span>{aduan.pengadu.instansi || <span className="italic text-muted-foreground">Personal / Umum</span>}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={`h-full ${detailCardClass}`}>
                            <CardHeader className={`${detailCardHeaderClass} py-3.5`}>
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-foreground">
                                    <FileText className="h-4 w-4" />
                                    Administrasi Surat
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 py-5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <span className={detailLabelClass}>Nomor Surat</span>
                                        <span className="rounded border border-border bg-muted px-2 py-1 font-mono text-[11px] font-semibold text-foreground">{aduan.suratMasuk.nomorSurat}</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <span className={detailLabelClass}>Tgl Masuk</span>
                                        <span className="text-[0.92rem] font-semibold text-foreground">{formatDate(aduan.suratMasuk.tanggalSurat)}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className={detailLabelClass}>Perihal</span>
                                    <p className="text-[0.92rem] font-semibold leading-tight text-foreground">
                                        {aduan.suratMasuk.perihal || <span className="italic font-medium text-muted-foreground">Tidak dicantumkan</span>}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <Card className={detailCardClass}>
                        <CardHeader className={`${detailCardHeaderClass} py-3.5`}>
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-foreground">
                                <MapPin className="h-4 w-4" />
                                Lokasi Objek
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-4">
                            <div className="mb-3 flex flex-wrap items-center gap-1.5">
                                <Badge variant="outline" className={`text-[10px] ${detailBadgeClass}`}>
                                    Total KPS: {lokasiObjekItems.length}
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] ${detailBadgeClass}`}>
                                    Total luas_total: {totalLuasObjek.toLocaleString('id-ID')} Ha
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] ${detailBadgeClass}`}>
                                    Total anggota_pria: {totalAnggotaPriaObjek.toLocaleString('id-ID')}
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] ${detailBadgeClass}`}>
                                    Total anggota_wanita: {totalAnggotaWanitaObjek.toLocaleString('id-ID')}
                                </Badge>
                            </div>
                            {lokasiObjekItems.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                                    Belum ada KPS yang tertaut pada aduan ini.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2.5">
                                    {lokasiObjekItems.map((item, index) => (
                                    <div key={`lokasi-kps-${index}`} className="rounded-xl border border-border bg-muted/60 p-3">
                                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>balai</span>
                                                <span className="text-[0.92rem] font-semibold text-foreground">{item.balai}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>nama_lembaga</span>
                                                <span className="text-[0.92rem] font-semibold text-foreground">{item.namaKps}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>surat_keputusan</span>
                                                <span className="text-[0.92rem] font-mono text-foreground">{item.noSk}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>skema</span>
                                                <span className="text-[0.92rem] font-semibold text-foreground">{item.kpsType}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>provinsi</span>
                                                <span className="text-[0.92rem] text-foreground">{item.provinsi}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>kabupaten</span>
                                                <span className="text-[0.92rem] text-foreground">{item.kabupaten}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>luas_total</span>
                                                <Badge variant="outline" className="w-fit">{(Number(item.luasHa) || 0).toLocaleString('id-ID')} Ha</Badge>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>anggota_pria</span>
                                                <Badge variant="outline" className="w-fit">{(Number(item.anggotaPria) || 0).toLocaleString('id-ID')}</Badge>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={detailLabelClass}>anggota_wanita</span>
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
                        <Card className={detailCardClass}>
                            <CardHeader
                                className={`flex flex-row items-center justify-between py-3.5 ${detailCardHeaderClass}`}
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
                                    <div className={detailIconClass}>
                                        <Clock size={16} />
                                    </div>
                                    Riwayat Penanganan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5">
                                {!canInputRiwayatPenanganan && (
                                    <p className="mb-4 rounded-lg border border-border bg-muted px-3 py-2 text-[11px] font-medium text-foreground">
                                        Ubah status aduan ke <span className="font-semibold text-foreground">PROSES</span> untuk menambah Riwayat Penanganan.
                                    </p>
                                )}
                                <div className="flex flex-col gap-3">
                                    {qTindakLanjutList.length === 0 ? (
                                        <p className="py-6 text-center text-sm italic text-muted-foreground">
                                            Belum ada langkah penanganan
                                        </p>
                                    ) : (
                                        qTindakLanjutList.map((tl, index) => (
                                            <div key={tl.id} className="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-border bg-muted/60 p-3.5 shadow-sm">
                                                {/* Decorative element */}
                                                <div className={cn(
                                                    "absolute left-0 top-0 bottom-0 w-1",
                                                    index === 0 ? "bg-primary/70" : "bg-border"
                                                )} />

                                                <div className={cn(
                                                    "flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground shadow-sm",
                                                    index === 0 ? "bg-primary" : "bg-muted-foreground/70"
                                                )}>
                                                    {qTindakLanjutList.length - index}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] font-bold uppercase tracking-tight text-foreground">{normalizeJenisTlLabel(tl.jenisTL)}</span>
                                                            {tl.nomorSuratOutput && (
                                                                <Badge variant="outline" className={`h-5 px-1.5 text-[9px] font-mono ${detailBadgeClass}`}>
                                                                    {tl.nomorSuratOutput}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                            <Calendar size={10} />
                                                            {formatDate(tl.tanggal)}
                                                        </div>
                                                    </div>
                                                    <div className="prose prose-slate prose-sm mb-3 max-w-none text-[11px] leading-relaxed text-foreground prose-p:text-foreground prose-strong:text-foreground">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{tl.keterangan}</ReactMarkdown>
                                                    </div>
                                                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-2">
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
                                                                                onClick={() => void handleOpenProtectedFile(url, displayName)}
                                                                                className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-accent"
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
                                                                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                                    title="Edit Dokumen"
                                                                >
                                                                    <Edit size={12} />
                                                                </button>
                                                            )}
                                                                {isAdmin && (
                                                                <button
                                                                    onClick={() => setDeleteTlConfirm({ id: tl.id, label: normalizeJenisTlLabel(tl.jenisTL) })}
                                                                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                                    title="Hapus Riwayat"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                            <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
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

                    {/* Lampiran & Berkas */}
                    <Card className={detailCardClass}>
                        <CardHeader className={`flex flex-row items-center justify-between pb-3 ${detailCardHeaderClass}`}>
                            <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground">Lampiran & Berkas</CardTitle>
                            <div className="flex items-center gap-2">
                                {allAttachments.length > 0 && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 rounded-lg border-border text-[10px] font-semibold uppercase hover:bg-accent"
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
                                    className="h-8 rounded-lg border-border text-[10px] font-semibold uppercase hover:bg-accent"
                                    onClick={() => setIsUploadModalOpen(true)}
                                >
                                    <Upload size={12} className="mr-1.5" /> Upload
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 p-4">
                            <div className="flex flex-col gap-2.5">
                                {allAttachments.length === 0 && (
                                    <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                                        Belum ada lampiran
                                    </div>
                                )}

                                {allAttachments.map((file) => (
                                    <div key={file.id} className="group flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3 transition-all hover:border-primary/25 hover:bg-accent/70">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground">
                                            {file.source === 'Dok. Tindak Lanjut' ? <FolderOpen size={20} /> : <FileText size={20} />}
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate pr-2 text-[11px] font-semibold text-foreground">
                                                {file.fileName}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="px-1.5 py-0.5 text-[9px] font-semibold leading-tight">
                                                    {file.source}
                                                </Badge>
                                                <span className="truncate text-[10px] text-muted-foreground">{file.meta}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {isAdmin && file.rawId && (
                                                <button
                                                    onClick={() => setDeleteConfirmDoc({ id: file.rawId!, fileName: file.fileName })}
                                                    disabled={deletingDocId === file.rawId}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
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
                                                onClick={() => void handleOpenProtectedFile(file.url, file.fileName)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
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

            {/* Dokumen Tindak Lanjut Modal */}
            <Modal
                isOpen={isTLModalOpen}
                onClose={() => setIsTLModalOpen(false)}
                title="Tambah Dokumen"
                description="Catat dokumen atau hasil penanganan terbaru agar jejak proses aduan tetap lengkap."
                className={cn("max-w-3xl", detailModalClass)}
                size="xl"
            >
                <form onSubmit={handleTLSubmit} className="flex flex-col gap-5">
                    <div className={`${detailSectionSoftClass} space-y-4`}>
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

                    <div className={`${detailSectionClass} space-y-2`}>
                        <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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

                    <ModalFooter className="sticky bottom-0 z-10 -mx-1 border-t border-border bg-card/95 px-1 pt-4 pb-1 backdrop-blur">
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
                className={cn("max-w-3xl", detailModalClass)}
                size="xl"
            >
                <form onSubmit={handleEditTlSubmit} className="flex flex-col gap-5">
                    <div className={`${detailSectionSoftClass} space-y-4`}>
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

                    <div className={`${detailSectionClass} space-y-3`}>
                        <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Lampiran Saat Ini
                        </label>
                        {editTlForm.fileUrls.length === 0 ? (
                            <p className="text-[11px] italic text-muted-foreground">Tidak ada lampiran.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {editTlForm.fileUrls.map((url, idx) => {
                                    const fileName = url?.split('/').pop()?.split('?')[0] || `Lampiran ${idx + 1}`;
                                    return (
                                        <div key={idx} className="inline-flex items-center gap-2 rounded border border-border bg-card px-2 py-1 text-[10px] font-medium text-foreground">
                                            <FileText size={10} />
                                            <span className="max-w-[180px] truncate">{fileName}</span>
                                            <button
                                                type="button"
                                                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
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

                    <div className={`${detailSectionClass} space-y-2`}>
                        <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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

                    <ModalFooter className="sticky bottom-0 z-10 -mx-1 border-t border-border bg-card/95 px-1 pt-4 pb-1 backdrop-blur">
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
                        <div className="mb-4 rounded-lg border border-border bg-muted p-4">
                            <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                                <FileText size={16} />
                                Upload Dokumen Pendukung
                            </h4>
                            <p className="text-xs text-muted-foreground">
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
            <div className="fixed bottom-0 left-0 right-0 hidden border-t pt-2 text-center text-[10px] text-black/70 print:block">
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
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
