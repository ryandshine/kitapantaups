import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Download, FileText, FolderArchive } from 'lucide-react';
import { Button, Select, FeedbackBanner, Input } from '../components/ui';
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
    const [isLoadingSkpYears, setIsLoadingSkpYears] = useState(false);
    const [isGeneratingSkp, setIsGeneratingSkp] = useState(false);
    const [skpYears, setSkpYears] = useState<number[]>([]);
    const [selectedSkpYear, setSelectedSkpYear] = useState('');
    const [activeReportTab, setActiveReportTab] = useState<'aduan' | 'skp'>('aduan');
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

    React.useEffect(() => {
        const loadSkpYears = async () => {
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
        loadSkpYears();
    }, []);

    const handleGenerateSkp = async () => {
        const year = Number(selectedSkpYear);
        if (!Number.isInteger(year)) {
            setFeedback({ type: 'info', message: 'Pilih tahun SKP terlebih dahulu.' });
            return;
        }

        setIsGeneratingSkp(true);
        try {
            const result = await SkpReportService.download(year);
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
        <div className="flex max-w-6xl flex-col gap-5 animate-in fade-in duration-500">
            <div className="relative px-1 py-2">
                <div className="relative z-10">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-primary">Pusat Pelaporan</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Laporan</h1>
                    <p className="mt-2 max-w-2xl text-[0.92rem] leading-relaxed text-muted-foreground">
                        Buat laporan pengaduan atau arsipkan dokumen SKP sesuai kebutuhan administrasi.
                    </p>
                </div>
            </div>

            {feedback && (
                <FeedbackBanner
                    type={feedback.type}
                    message={feedback.message}
                    onClose={() => setFeedback(null)}
                />
            )}

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]"
            >
                <div className="flex border-b border-border bg-muted/30" role="tablist" aria-label="Jenis laporan">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeReportTab === 'aduan'}
                        onClick={() => setActiveReportTab('aduan')}
                        className={`flex flex-1 items-center gap-2 border-b-2 px-5 py-4 text-left text-sm font-semibold transition-colors sm:px-6 ${activeReportTab === 'aduan'
                            ? 'border-primary bg-card text-foreground'
                            : 'border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground'
                            }`}
                    >
                        <FileText size={17} className={activeReportTab === 'aduan' ? 'text-primary' : 'text-muted-foreground'} />
                        <span>Laporan Aduan</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeReportTab === 'skp'}
                        onClick={() => setActiveReportTab('skp')}
                        className={`flex flex-1 items-center gap-2 border-b-2 px-5 py-4 text-left text-sm font-semibold transition-colors sm:px-6 ${activeReportTab === 'skp'
                            ? 'border-primary bg-card text-foreground'
                            : 'border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground'
                            }`}
                    >
                        <FolderArchive size={17} className={activeReportTab === 'skp' ? 'text-primary' : 'text-muted-foreground'} />
                        <span>Arsip SKP</span>
                    </button>
                </div>

                {activeReportTab === 'aduan' ? (
                    <section role="tabpanel" className="p-5 sm:p-7">
                        <div className="mb-6 flex items-start gap-3">
                            <div className="mt-0.5 text-primary"><FileText size={20} /></div>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">Export Laporan Aduan</h2>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                    Pilih periode dan filter data yang ingin dimasukkan ke dalam laporan.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
                            <Input
                                type="date"
                                label="Tanggal awal"
                                helperText="Format tanggal: DD/MM/YYYY"
                                lang="id-ID"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                fullWidth
                            />

                            <Input
                                type="date"
                                label="Tanggal akhir"
                                helperText="Format tanggal: DD/MM/YYYY"
                                lang="id-ID"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                fullWidth
                            />

                            <Select
                                label="Provinsi"
                                options={[
                                    { value: 'all', label: 'Semua Provinsi' },
                                    ...provinces.map((province) => ({ value: province, label: province }))
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
                                label="Format file"
                                options={[
                                    { value: 'excel', label: 'Excel (.xlsx)' },
                                    { value: 'csv', label: 'CSV (.csv)' }
                                ]}
                                value={format}
                                onChange={setFormat}
                                fullWidth
                            />
                        </div>

                        <div className="mt-7 flex flex-col gap-4 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
                            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                                Data yang dihasilkan akan mengikuti seluruh filter yang dipilih di atas.
                            </p>
                            <Button
                                className="rounded-xl font-semibold"
                                onClick={handleGenerate}
                                isLoading={isGenerating}
                                leftIcon={!isGenerating && <Download size={16} />}
                            >
                                {isGenerating ? 'Memproses...' : 'Export Laporan'}
                            </Button>
                        </div>
                    </section>
                ) : (
                    <section role="tabpanel" className="p-5 sm:p-7">
                        <div className="mb-7 flex items-start gap-3">
                            <div className="mt-0.5 text-primary"><CalendarDays size={20} /></div>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">Arsip SKP Tahunan</h2>
                                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                                    Buat arsip ZIP per triwulan berdasarkan tahun dokumen. Arsip berisi rekap Excel dan dokumen tindak lanjut.
                                </p>
                            </div>
                        </div>

                        <div className="max-w-xl">
                            <Select
                                label="Tahun dokumen"
                                options={skpYears.map((year) => ({ value: String(year), label: String(year) }))}
                                value={selectedSkpYear}
                                onChange={setSelectedSkpYear}
                                placeholder={isLoadingSkpYears ? 'Memuat tahun...' : 'Pilih tahun'}
                                disabled={isLoadingSkpYears || isGeneratingSkp}
                                fullWidth
                            />
                        </div>

                        <div className="mt-7 flex flex-col gap-4 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Folder arsip akan disusun menjadi TW I sampai TW IV.
                            </p>
                            <Button
                                className="rounded-xl font-semibold"
                                variant="primary"
                                onClick={() => void handleGenerateSkp()}
                                isLoading={isGeneratingSkp}
                                disabled={!selectedSkpYear || isLoadingSkpYears}
                                leftIcon={!isGeneratingSkp && <Download size={16} />}
                            >
                                {isGeneratingSkp ? 'Membuat ZIP...' : 'Download Arsip SKP'}
                            </Button>
                        </div>
                    </section>
                )}
            </motion.div>
        </div>
    );
};
