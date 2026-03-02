import { AduanService } from './aduan.service';
import type { Aduan } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export interface ColumnDefinition {
    id: string;
    label: string;
    getValue: (row: Aduan) => any;
}

const REPORT_COLUMNS_MAP: Record<string, ColumnDefinition> = {
    nomorTiket: { id: 'nomorTiket', label: 'Nomor Tiket', getValue: (row) => row.nomorTiket },
    createdAt: { id: 'createdAt', label: 'Tanggal Buat', getValue: (row) => row.createdAt ? format(new Date(row.createdAt), 'dd MMM yyyy', { locale: id }) : '-' },
    perihal: { id: 'perihal', label: 'Perihal', getValue: (row) => row.perihal },
    typeKps: {
        id: 'typeKps',
        label: 'Type KPS',
        getValue: (row) => {
            const values = (row.type_kps && row.type_kps.length > 0) ? row.type_kps : row.jenis_kps;
            return values && values.length > 0 ? values.join(', ') : '-';
        }
    },
    prioritas: { id: 'prioritas', label: 'Prioritas', getValue: (row) => row.prioritas },
    status: { id: 'status', label: 'Status', getValue: (row) => row.status },
    provinsi: { id: 'provinsi', label: 'Provinsi', getValue: (row) => row.lokasi.provinsi },
    kabupaten: { id: 'kabupaten', label: 'Kabupaten', getValue: (row) => row.lokasi.kabupaten },
    kecamatan: { id: 'kecamatan', label: 'Kecamatan', getValue: (row) => row.lokasi.kecamatan },
    desa: { id: 'desa', label: 'Desa', getValue: (row) => row.lokasi.desa },
    luasHa: { id: 'luasHa', label: 'Luas (Ha)', getValue: (row) => row.lokasi.luasHa },
    pengaduNama: { id: 'pengaduNama', label: 'Nama Pengadu', getValue: (row) => row.pengadu.nama },
    pengaduTelepon: { id: 'pengaduTelepon', label: 'Telepon Pengadu', getValue: (row) => row.pengadu.telepon },
    pengaduInstansi: { id: 'pengaduInstansi', label: 'Instansi Pengadu', getValue: (row) => row.pengadu.instansi },
    nomorSurat: { id: 'nomorSurat', label: 'Nomor Surat', getValue: (row) => row.suratMasuk.nomorSurat },
    tanggalSurat: { id: 'tanggalSurat', label: 'Tanggal Surat', getValue: (row) => row.suratMasuk.tanggalSurat ? format(row.suratMasuk.tanggalSurat, 'dd MMM yyyy', { locale: id }) : '-' },
    skTerkait: { id: 'skTerkait', label: 'SK Terkait', getValue: (row) => row.skTerkait || '-' },
    picName: { id: 'picName', label: 'PIC', getValue: (row) => row.picName || '-' },
    pengaduEmail: { id: 'pengaduEmail', label: 'Email Pengadu', getValue: (row) => row.pengadu.email || '-' },
};

export const FIXED_REPORT_COLUMN_IDS: string[] = [
    'nomorTiket',
    'createdAt',
    'status',
    'typeKps',
    'perihal',
    'pengaduNama',
    'pengaduTelepon',
    'pengaduEmail',
    'pengaduInstansi',
    'provinsi',
    'kabupaten',
    'kecamatan',
    'desa',
    'luasHa',
    'nomorSurat',
    'tanggalSurat',
    'skTerkait',
    'picName',
];

const APP_NAME = 'KitapantauPS';
const AGENCY_NAME = 'Direktorat Pengendalian Perhutanan Sosial';

const safeText = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    const text = String(value).replace(/\s+/g, ' ').trim();
    return text || '-';
};

const formatDateSafe = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return format(date, 'dd/MM/yyyy');
};

const buildReportMeta = (startDate: string, endDate: string, provinsi?: string) => {
    const periodText = startDate && endDate
        ? `Periode: ${formatDateSafe(startDate)} - ${formatDateSafe(endDate)}`
        : 'Periode: Semua Periode';

    const filterText = provinsi && provinsi !== 'all'
        ? `Provinsi: ${provinsi}`
        : 'Provinsi: Semua Provinsi';

    const generatedText = `Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}`;

    return { periodText, filterText, generatedText };
};

const countByStatus = (data: Aduan[]) => {
    const counts = {
        baru: 0,
        proses: 0,
        selesai: 0,
        ditolak: 0,
    };

    for (const row of data) {
        const status = String(row.status || '').toLowerCase();
        if (status in counts) {
            (counts as any)[status] += 1;
        }
    }

    return counts;
};

const summarizeKps = (data: Aduan[]) => {
    const uniqueKps = new Set<string>();
    const typeCounts = new Map<string, number>();
    let totalLuas = 0;
    let totalKk = 0;

    for (const row of data) {
        const ids = row.id_kps_api || [];
        ids.forEach((id) => {
            if (id) uniqueKps.add(String(id));
        });

        totalLuas += Number(row.lokasi?.luasHa ?? row.lokasi_luas_ha ?? 0) || 0;
        totalKk += Number(row.jumlahKK ?? row.jumlah_kk ?? 0) || 0;

        const rowTypes = ((row.type_kps && row.type_kps.length > 0) ? row.type_kps : row.jenis_kps) || [];
        const uniqueTypesInRow = new Set(rowTypes.map((t) => safeText(t)).filter((t) => t !== '-'));
        uniqueTypesInRow.forEach((type) => {
            typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
        });
    }

    const sortedTypeCounts = [...typeCounts.entries()]
        .sort((a, b) => b[1] - a[1]);

    return {
        totalKpsUnik: uniqueKps.size,
        totalLuas,
        totalKk,
        sortedTypeCounts,
    };
};

const groupByStatus = (data: Aduan[]) => {
    const order = ['baru', 'proses', 'selesai', 'ditolak'];
    const groups = order.map((status) => ({
        key: status,
        title: status.toUpperCase(),
        rows: data.filter((row) => String(row.status || '').toLowerCase() === status),
    }));
    const others = data.filter((row) => !order.includes(String(row.status || '').toLowerCase()));
    if (others.length > 0) {
        groups.push({ key: 'lainnya', title: 'LAINNYA', rows: others });
    }
    return groups;
};

export const ReportService = {
    generateReport: async (outputFormat: string, startDate: string, endDate: string, provinsi?: string) => {
        try {
            const data = await AduanService.getAduanByDateRange(startDate, endDate, provinsi);
            const columns = FIXED_REPORT_COLUMN_IDS
                .map(id => REPORT_COLUMNS_MAP[id])
                .filter(Boolean);

            if (outputFormat === 'pdf') {
                return ReportService.exportToPDF(data, columns, startDate, endDate, provinsi);
            } else if (outputFormat === 'excel') {
                return ReportService.exportToExcel(data, columns, startDate, endDate, provinsi);
            } else if (outputFormat === 'csv') {
                return ReportService.exportToCSV(data, columns, startDate, endDate, provinsi);
            }
        } catch (error) {
            console.error('Error generating report:', error);
            throw error;
        }
    },

    exportToPDF: (data: Aduan[], columns: ColumnDefinition[], startDate: string, endDate: string, provinsi?: string) => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as any;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const { periodText, filterText, generatedText } = buildReportMeta(startDate, endDate, provinsi);

        const drawHeader = () => {
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageWidth, 20, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(`${APP_NAME} - Laporan Pengaduan`, 14, 8.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(AGENCY_NAME, 14, 14.2);

            doc.setTextColor(17, 24, 39);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.text('Rekapitulasi Laporan Pengaduan', 14, 28);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(periodText, 14, 33.5);
            doc.text(filterText, 14, 38.5);
            doc.text(generatedText, 14, 43.5);
            doc.text(`Total Data: ${data.length} baris`, pageWidth - 14, 43.5, { align: 'right' });
        };

        const drawFooter = () => {
            const currentPage = doc.internal.getNumberOfPages();
            doc.setDrawColor(209, 213, 219);
            doc.line(14, pageHeight - 10.5, pageWidth - 14, pageHeight - 10.5);
            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128);
            doc.text(`${APP_NAME} • ${AGENCY_NAME}`, 14, pageHeight - 6.2);
            doc.text(`Halaman ${currentPage}`, pageWidth - 14, pageHeight - 6.2, { align: 'right' });
        };

        drawHeader();

        const statusCounts = countByStatus(data);
        const kpsSummary = summarizeKps(data);
        autoTable(doc, {
            startY: 50,
            margin: { left: 14, right: 14, bottom: 14 },
            head: [['Ringkasan Status', 'Baru', 'Proses', 'Selesai', 'Ditolak']],
            body: [[
                'Jumlah Aduan',
                String(statusCounts.baru),
                String(statusCounts.proses),
                String(statusCounts.selesai),
                String(statusCounts.ditolak),
            ]],
            styles: {
                fontSize: 8.5,
                cellPadding: 2.2,
                lineColor: [219, 223, 230],
                lineWidth: 0.1,
                halign: 'center',
            },
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: 255,
                fontStyle: 'bold',
            },
            bodyStyles: {
                textColor: [17, 24, 39],
            },
            columnStyles: {
                0: { halign: 'left', cellWidth: 60 },
                1: { cellWidth: 25 },
                2: { cellWidth: 25 },
                3: { cellWidth: 25 },
                4: { cellWidth: 25 },
            },
            theme: 'grid',
        });

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 5,
            margin: { left: 14, right: 14, bottom: 14 },
            head: [['Informasi KPS', 'Nilai']],
            body: [
                ['Total KPS Unik', String(kpsSummary.totalKpsUnik)],
                ['Total Luas (Ha)', Number(kpsSummary.totalLuas).toLocaleString('id-ID')],
                ['Total KK', Number(kpsSummary.totalKk).toLocaleString('id-ID')],
                ['Type KPS Dominan', kpsSummary.sortedTypeCounts.slice(0, 5).map(([type]) => type).join(', ') || '-'],
            ],
            styles: {
                fontSize: 8,
                cellPadding: 2.2,
                lineColor: [219, 223, 230],
                lineWidth: 0.1,
                valign: 'top',
            },
            headStyles: {
                fillColor: [51, 65, 85],
                textColor: 255,
                fontStyle: 'bold',
            },
            columnStyles: {
                0: { cellWidth: 70, fontStyle: 'bold' },
                1: { cellWidth: 190 },
            },
            theme: 'grid',
        });

        const typeRows = kpsSummary.sortedTypeCounts.map(([type, count]) => {
            const percent = data.length > 0 ? `${((count / data.length) * 100).toFixed(1)}%` : '0.0%';
            return [type, String(count), percent];
        });
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 5,
            margin: { left: 14, right: 14, bottom: 14 },
            head: [['Distribusi Type KPS', 'Jumlah Aduan', 'Persentase']],
            body: typeRows.length > 0 ? typeRows : [['-', '0', '0.0%']],
            styles: {
                fontSize: 8,
                cellPadding: 2.2,
                lineColor: [219, 223, 230],
                lineWidth: 0.1,
                valign: 'top',
                halign: 'center',
            },
            headStyles: {
                fillColor: [51, 65, 85],
                textColor: 255,
                fontStyle: 'bold',
            },
            columnStyles: {
                0: { halign: 'left', cellWidth: 170 },
                1: { cellWidth: 45 },
                2: { cellWidth: 45 },
            },
            theme: 'grid',
        });

        const tableColumn = columns.map((c) => c.label);
        const groups = groupByStatus(data);
        let currentY = doc.lastAutoTable.finalY + 6;

        for (const group of groups) {
            const groupRows = group.rows.length > 0
                ? group.rows.map((row) => columns.map((c) => safeText(c.getValue(row))))
                : [[`Tidak ada data status ${group.title}`, ...Array(Math.max(columns.length - 1, 0)).fill('')]];

            autoTable(doc, {
                head: [[`Grup Status: ${group.title} (${group.rows.length})`]],
                body: [],
                startY: currentY,
                margin: { left: 14, right: 14, bottom: 14 },
                styles: { fontSize: 8.5, cellPadding: 2, halign: 'left' },
                headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
                theme: 'plain',
                didDrawPage: () => {
                    drawHeader();
                    drawFooter();
                },
            });

            autoTable(doc, {
                head: [tableColumn],
                body: groupRows,
                startY: doc.lastAutoTable.finalY + 1,
                margin: { left: 14, right: 14, bottom: 14 },
                styles: {
                    fontSize: 8,
                    cellPadding: 2.2,
                    textColor: [31, 41, 55],
                    lineColor: [219, 223, 230],
                    lineWidth: 0.1,
                    valign: 'top',
                },
                headStyles: {
                    fillColor: [51, 65, 85],
                    textColor: 255,
                    fontStyle: 'bold',
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                theme: 'grid',
                didDrawPage: () => {
                    drawHeader();
                    drawFooter();
                },
                horizontalPageBreak: true,
                horizontalPageBreakRepeat: 0,
            });

            currentY = doc.lastAutoTable.finalY + 4;
        }

        doc.save(`Laporan_KitapantauPS_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
    },

    exportToExcel: (data: Aduan[], columns: ColumnDefinition[], startDate: string, endDate: string, provinsi?: string) => {
        const docTitle = [['Laporan Pengaduan KitapantauPS']];
        const { periodText, filterText, generatedText } = buildReportMeta(startDate, endDate, provinsi);

        const metadata = [
            [periodText],
            [filterText],
            [generatedText],
            [] // Empty row separator
        ];

        const tableHeader = [columns.map(c => c.label)];
        const tableRows = data.map(row => columns.map(c => safeText(c.getValue(row))));

        // Combine all parts
        const combinedData = [...docTitle, ...metadata, ...tableHeader, ...tableRows];

        const worksheet = XLSX.utils.aoa_to_sheet(combinedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');

        // Save
        XLSX.writeFile(workbook, `Laporan_KitapantauPS_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
    },

    exportToCSV: (data: Aduan[], columns: ColumnDefinition[], startDate: string, endDate: string, provinsi?: string) => {
        const docTitle = [['Laporan Pengaduan KitapantauPS']];
        const { periodText, filterText, generatedText } = buildReportMeta(startDate, endDate, provinsi);

        const metadata = [
            [periodText],
            [filterText],
            [generatedText],
            [] // Empty row separator
        ];

        const tableHeader = [columns.map(c => c.label)];
        const tableRows = data.map(row => columns.map(c => safeText(c.getValue(row))));

        const combinedData = [...docTitle, ...metadata, ...tableHeader, ...tableRows];

        const worksheet = XLSX.utils.aoa_to_sheet(combinedData);
        const csv = XLSX.utils.sheet_to_csv(worksheet);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Laporan_KitapantauPS_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
