import React, { useState } from 'react';
import { Download, Settings2 } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, Select, FeedbackBanner } from '../components/ui';
import { AduanService } from '../lib/aduan.service';
import { FIXED_REPORT_COLUMN_IDS, ReportService } from '../lib/report.service';

export const LaporanPage: React.FC = () => {
    const [format, setFormat] = useState('excel');
    const [selectedProvinsi, setSelectedProvinsi] = useState('all');
    const [provinces, setProvinces] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    React.useEffect(() => {
        if (!feedback) return;
        const timeout = window.setTimeout(() => setFeedback(null), 4000);
        return () => window.clearTimeout(timeout);
    }, [feedback]);

    // Fetch unique provinces from aduan table
    React.useEffect(() => {
        const fetchProvinces = async () => {
            try {
                const data = await AduanService.getUniqueProvinces();
                setProvinces(data);
            } catch (error) {
                console.error('Error fetching provinces:', error);
            }
        };
        fetchProvinces();
    }, []);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            await ReportService.generateReport(format, '', '', selectedProvinsi);
            setFeedback({ type: 'success', message: 'Laporan berhasil diproses. File akan segera diunduh.' });
        } catch (error) {
            console.error(error);
            setFeedback({ type: 'error', message: 'Terjadi kesalahan saat membuat laporan.' });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="max-w-6xl animate-in fade-in duration-500 flex flex-col gap-6">
            <div className="border-b border-border pb-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground leading-none">Laporan</h1>
                <p className="mt-2 text-sm text-muted-foreground">Export data pengaduan berdasarkan wilayah dengan format kolom laporan yang sudah ditetapkan.</p>
            </div>

            {feedback && (
                <FeedbackBanner
                    type={feedback.type}
                    message={feedback.message}
                    onClose={() => setFeedback(null)}
                />
            )}

            <Card className="border border-border shadow-none">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Settings2 size={16} className="text-muted-foreground" />
                        Konfigurasi
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                            variant="primary"
                            fullWidth
                            onClick={handleGenerate}
                            isLoading={isGenerating}
                            leftIcon={!isGenerating && <Download size={16} />}
                        >
                            {isGenerating ? 'Memproses...' : 'Download Laporan'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            <Card className="border border-border shadow-none">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Kolom Laporan Tetap</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground">
                        Laporan menggunakan format kolom baku ({FIXED_REPORT_COLUMN_IDS.length} kolom). Output tersedia dalam Excel (utama) dan CSV.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};
