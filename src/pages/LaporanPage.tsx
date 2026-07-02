import React, { useState } from 'react';
import { Archive, CalendarDays, Download, Settings2 } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, Select, FeedbackBanner, Input, Modal, ModalFooter } from '../components/ui';
import { AduanReferenceService } from '../lib/aduan.references';
import { ReportService } from '../lib/report.service';
import { SkpReportService } from '../lib/skp-report.service';
import { useAuth } from '../contexts/AuthContext';

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    return 'Terjadi kesalahan saat membuat laporan.';
};

export const LaporanPage: React.FC = () => {
    const { user } = useAuth();
    const [format, setFormat] = useState('excel');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedProvinsi, setSelectedProvinsi] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedPicId, setSelectedPicId] = useState('all');
    const [provinces, setProvinces] = useState<string[]>([]);
    const [statuses, setStatuses] = useState<string[]>([]);
    const [picOptions, setPicOptions] = useState<Array<{ value: string; label: string }>>([{ value: 'all', label: 'Semua PIC' }]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSkpModalOpen, setIsSkpModalOpen] = useState(false);
    const [isLoadingSkpYears, setIsLoadingSkpYears] = useState(false);
    const [isGeneratingSkp, setIsGeneratingSkp] = useState(false);
    const [skpYears, setSkpYears] = useState<number[]>([]);
    const [selectedSkpYear, setSelectedSkpYear] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    React.useEffect(() => {
        if (!feedback) return;
        const timeout = window.setTimeout(() => setFeedback(null), 4000);
        return () => window.clearTimeout(timeout);
    }, [feedback]);

    // Fetch unique provinces from aduan table
    React.useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [provinceData, statusData, users] = await Promise.all([
                    AduanReferenceService.getUniqueProvinces(),
                    AduanReferenceService.getMasterStatuses(),
                    user?.role === 'admin' ? AduanReferenceService.getUsersByRole() : Promise.resolve([])
                ]);
                setProvinces(provinceData);
                setStatuses((statusData || []).map((item) => item.nama_status).filter(Boolean));
                setPicOptions([
                    { value: 'all', label: 'Semua PIC' },
                    ...users.map((item) => ({
                        value: item.id,
                        label: item.displayName || item.email
                    }))
                ]);
            } catch (error) {
                console.error('Error fetching report filters:', error);
            }
        };
        fetchFilters();
    }, [user?.role]);

    const handleGenerate = async () => {
        if (startDate && endDate && startDate > endDate) {
            setFeedback({ type: 'info', message: 'Tanggal akhir tidak boleh lebih kecil dari tanggal awal.' });
            return;
        }
        setIsGenerating(true);
        try {
            const selectedPic = picOptions.find((option) => option.value === selectedPicId);
            await ReportService.generateReport(format, startDate, endDate, {
                provinsi: selectedProvinsi,
                status: selectedStatus,
                picId: selectedPicId,
                picName: selectedPicId !== 'all' ? selectedPic?.label : undefined,
            });
            setFeedback({ type: 'success', message: 'Laporan berhasil diproses. File akan segera diunduh.' });
        } catch (error: unknown) {
            console.error(error);
            setFeedback({ type: 'error', message: getErrorMessage(error) });
        } finally {
            setIsGenerating(false);
        }
    };

    const openSkpModal = async () => {
        setIsSkpModalOpen(true);
        if (skpYears.length > 0) return;

        setIsLoadingSkpYears(true);
        try {
            const years = await SkpReportService.getYears();
            setSkpYears(years);
            setSelectedSkpYear(String(years[0] || new Date().getFullYear()));
        } catch (error) {
            setFeedback({ type: 'error', message: getErrorMessage(error) });
        } finally {
            setIsLoadingSkpYears(false);
        }
    };

    const handleGenerateSkp = async () => {
        const year = Number(selectedSkpYear);
        if (!Number.isInteger(year)) {
            setFeedback({ type: 'info', message: 'Pilih tahun SKP terlebih dahulu.' });
            return;
        }

        setIsGeneratingSkp(true);
        try {
            const result = await SkpReportService.download(year);
            setIsSkpModalOpen(false);
            setFeedback({
                type: 'success',
                message: `${result.fileName} berhasil dibuat dengan ${result.totalFiles} file dokumen.`,
            });
        } catch (error) {
            setFeedback({ type: 'error', message: getErrorMessage(error) });
        } finally {
            setIsGeneratingSkp(false);
        }
    };

    return (
        <div className="max-w-6xl animate-in fade-in duration-500 flex flex-col gap-6">
            <div className="hero-panel mb-2">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground leading-none">Laporan</h1>
                    <p className="mt-2 text-[0.92rem] text-muted-foreground">Export data pengaduan berdasarkan wilayah dengan format kolom laporan yang sudah ditetapkan.</p>
                </div>
                <div className="hero-orb" />
            </div>

            {feedback && (
                <FeedbackBanner
                    type={feedback.type}
                    message={feedback.message}
                    onClose={() => setFeedback(null)}
                />
            )}

            <Card className="overflow-hidden">
                <CardHeader className="page-section-header pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Settings2 size={16} className="text-primary" />
                        Konfigurasi
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Input
                        type="date"
                        label="Tanggal Awal"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        fullWidth
                    />

                    <Input
                        type="date"
                        label="Tanggal Akhir"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        fullWidth
                    />

                    <Select
                        label="Provinsi"
                        options={[
                            { value: 'all', label: 'Semua Provinsi' },
                            ...provinces.map(p => ({ value: p, label: p }))
                        ]}
                        value={selectedProvinsi}
                        onChange={setSelectedProvinsi}
                        fullWidth
                    />

                    <Select
                        label="Status"
                        options={[
                            { value: 'all', label: 'Semua Status' },
                            ...statuses.map((status) => ({ value: status, label: status }))
                        ]}
                        value={selectedStatus}
                        onChange={setSelectedStatus}
                        fullWidth
                    />

                    {user?.role === 'admin' && (
                        <Select
                            label="PIC"
                            options={picOptions}
                            value={selectedPicId}
                            onChange={setSelectedPicId}
                            fullWidth
                        />
                    )}

                    <Select
                        label="Format"
                        options={[
                            { value: 'excel', label: 'Excel (.xlsx)' },
                            { value: 'csv', label: 'CSV (.csv)' }
                        ]}
                        value={format}
                        onChange={setFormat}
                        fullWidth
                    />

                    <div className="flex items-end">
                        <Button
                            className="rounded-xl font-semibold"
                            fullWidth
                            onClick={handleGenerate}
                            isLoading={isGenerating}
                            leftIcon={!isGenerating && <Download size={16} />}
                        >
                            {isGenerating ? 'Memproses...' : 'Download Laporan'}
                        </Button>
                    </div>

                    <div className="flex items-end">
                        <Button
                            className="rounded-xl font-semibold"
                            variant="outline"
                            fullWidth
                            onClick={() => void openSkpModal()}
                            leftIcon={<Archive size={16} />}
                        >
                            SKP
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Modal
                isOpen={isSkpModalOpen}
                onClose={() => !isGeneratingSkp && setIsSkpModalOpen(false)}
                title="Export SKP"
                description="Pilih tahun dokumen untuk membuat arsip SKP per triwulan."
                size="sm"
            >
                <div className="flex flex-col gap-4">
                    <div className="rounded-xl border border-border bg-muted/45 p-4">
                        <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <CalendarDays size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">Arsip tahunan per triwulan</p>
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                    ZIP berisi folder TW I sampai TW IV, rekap Excel, dan file dokumen tindak lanjut.
                                </p>
                            </div>
                        </div>
                    </div>

                    <Select
                        label="Tahun Dokumen"
                        options={skpYears.map((year) => ({ value: String(year), label: String(year) }))}
                        value={selectedSkpYear}
                        onChange={setSelectedSkpYear}
                        placeholder={isLoadingSkpYears ? 'Memuat tahun...' : 'Pilih tahun'}
                        disabled={isLoadingSkpYears || isGeneratingSkp}
                        fullWidth
                    />
                </div>

                <ModalFooter className="mt-5">
                    <Button
                        variant="ghost"
                        onClick={() => setIsSkpModalOpen(false)}
                        disabled={isGeneratingSkp}
                    >
                        Batal
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => void handleGenerateSkp()}
                        isLoading={isGeneratingSkp}
                        disabled={!selectedSkpYear || isLoadingSkpYears}
                        leftIcon={!isGeneratingSkp && <Download size={16} />}
                    >
                        {isGeneratingSkp ? 'Membuat ZIP...' : 'Download SKP'}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};
