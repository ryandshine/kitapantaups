import React, { useState } from 'react';
import { Download, Settings2 } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, Select } from '../components/ui';
import { FIXED_REPORT_COLUMN_IDS, ReportService } from '../lib/report.service';

export const LaporanPage: React.FC = () => {
    const [format, setFormat] = useState('pdf');
    const [selectedProvinsi, setSelectedProvinsi] = useState('all');
    const [provinces, setProvinces] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch unique provinces from aduan table
    React.useEffect(() => {
        const fetchProvinces = async () => {
            try {
                const { AduanService } = await import('../lib/aduan.service');
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
            alert('Laporan berhasil diproses! File akan segera diunduh.');
        } catch (error) {
            console.error(error);
            alert('Terjadi kesalahan saat membuat laporan.');
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
                            { value: 'pdf', label: 'PDF (.pdf)' },
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
                        Laporan menggunakan format kolom baku ({FIXED_REPORT_COLUMN_IDS.length} kolom) dan otomatis menampilkan stack vertikal per grup status.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};
