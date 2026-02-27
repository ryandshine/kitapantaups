import React, { useState } from 'react';
import { Download, Settings2, CheckSquare, RotateCcw } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, Select } from '../components/ui';
import { ColumnSelector } from '../components/reports/ColumnSelector';
import type { ColumnOption } from '../components/reports/ColumnSelector';
import { ReportService } from '../lib/report.service';

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

    const REPORT_COLUMNS: ColumnOption[] = [
        { id: 'nomorTiket', label: 'Nomor Tiket', category: 'Informasi Dasar' },
        { id: 'createdAt', label: 'Tanggal Buat', category: 'Informasi Dasar' },
        { id: 'perihal', label: 'Perihal', category: 'Informasi Dasar' },
        { id: 'skema', label: 'Skema', category: 'Informasi Dasar' },
        { id: 'prioritas', label: 'Prioritas', category: 'Informasi Dasar' },
        { id: 'status', label: 'Status', category: 'Informasi Dasar' },

        { id: 'provinsi', label: 'Provinsi', category: 'Lokasi' },
        { id: 'kabupaten', label: 'Kabupaten', category: 'Lokasi' },
        { id: 'kecamatan', label: 'Kecamatan', category: 'Lokasi' },
        { id: 'desa', label: 'Desa', category: 'Lokasi' },
        { id: 'luasHa', label: 'Luas (Ha)', category: 'Lokasi' },

        { id: 'pengaduNama', label: 'Nama Pengadu', category: 'Pengadu' },
        { id: 'pengaduTelepon', label: 'Telepon Pengadu', category: 'Pengadu' },
        { id: 'pengaduEmail', label: 'Email Pengadu', category: 'Pengadu' },
        { id: 'pengaduInstansi', label: 'Instansi Pengadu', category: 'Pengadu' },

        { id: 'nomorSurat', label: 'Nomor Surat', category: 'Surat & Dokumen' },
        { id: 'tanggalSurat', label: 'Tanggal Surat', category: 'Surat & Dokumen' },
        { id: 'skTerkait', label: 'SK Terkait', category: 'Surat & Dokumen' },

        { id: 'picName', label: 'PIC', category: 'Penanganan' },
        { id: 'deadline', label: 'Deadline', category: 'Penanganan' },
    ];

    const [selectedColumns, setSelectedColumns] = useState<string[]>(
        REPORT_COLUMNS.filter(c => c.category === 'Informasi Dasar').map(c => c.id)
    );

    const toggleColumn = (id: string) => {
        setSelectedColumns(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const selectAll = (category?: string) => {
        if (category) {
            const categoryIds = REPORT_COLUMNS.filter(c => c.category === category).map(c => c.id);
            setSelectedColumns(prev => Array.from(new Set([...prev, ...categoryIds])));
        } else {
            setSelectedColumns(REPORT_COLUMNS.map(c => c.id));
        }
    };

    const deselectAll = (category?: string) => {
        if (category) {
            const categoryIds = REPORT_COLUMNS.filter(c => c.category === category).map(c => c.id);
            setSelectedColumns(prev => prev.filter(id => !categoryIds.includes(id)));
        } else {
            setSelectedColumns([]);
        }
    };

    const handleGenerate = async () => {

        if (selectedColumns.length === 0) {
            alert('Silakan pilih minimal satu kolom untuk laporan.');
            return;
        }

        setIsGenerating(true);
        try {
            await ReportService.generateReport(format, '', '', selectedColumns, selectedProvinsi);
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
                <p className="mt-2 text-sm text-muted-foreground">Export data pengaduan sesuai kolom dan wilayah yang Anda pilih.</p>
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

            <Card className="overflow-hidden border border-border shadow-none">
                <CardHeader className="border-b border-border/80 bg-muted/20 pb-3">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <CheckSquare size={16} className="text-muted-foreground" />
                            Kolom Laporan
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => selectAll()}
                                className="h-8 text-xs font-semibold"
                            >
                                Pilih Semua
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deselectAll()}
                                className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground"
                                leftIcon={<RotateCcw size={14} />}
                            >
                                Reset
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 pb-8">
                    <ColumnSelector
                        columns={REPORT_COLUMNS}
                        selectedColumns={selectedColumns}
                        onToggle={toggleColumn}
                        onSelectAll={selectAll}
                        onDeselectAll={deselectAll}
                    />
                </CardContent>
            </Card>
        </div>
    );
};
