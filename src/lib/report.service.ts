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
    nomorTiket: { id: 'nomorTiket', label: 'Nomor Tiket', getValue: (row) => row.nomorTiket || row.nomor_tiket },
    createdAt: { id: 'createdAt', label: 'Tanggal Buat', getValue: (row) => row.createdAt ? format(new Date(row.createdAt), 'dd MMM yyyy', { locale: id }) : '-' },
    status: { id: 'status', label: 'Status', getValue: (row) => row.status },
    namaKps: {
        id: 'namaKps',
        label: 'Nama KPS',
        getValue: (row) => row.nama_kps && row.nama_kps.length > 0 ? row.nama_kps.join(', ') : '-',
    },
    nomorSk: {
        id: 'nomorSk',
        label: 'No SK',
        getValue: (row) => row.nomor_sk && row.nomor_sk.length > 0 ? row.nomor_sk.join(', ') : '-',
    },
    typeKps: {
        id: 'typeKps',
        label: 'Type KPS',
        getValue: (row) => {
            const values = (row.type_kps && row.type_kps.length > 0) ? row.type_kps : row.jenis_kps;
            return values && values.length > 0 ? values.join(', ') : '-';
        }
    },
    perihal: { id: 'perihal', label: 'Perihal', getValue: (row) => row.perihal },
    provinsi: { id: 'provinsi', label: 'Provinsi', getValue: (row) => row.lokasi.provinsi },
    kabupaten: { id: 'kabupaten', label: 'Kabupaten', getValue: (row) => row.lokasi.kabupaten },
    picName: { id: 'picName', label: 'PIC', getValue: (row) => row.picName || '-' },
};

export const FIXED_REPORT_COLUMN_IDS: string[] = [
    'nomorTiket',
    'createdAt',
    'status',
    'namaKps',
    'nomorSk',
    'typeKps',
    'perihal',
    'provinsi',
    'kabupaten',
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

export const ReportService = {
    generateReport: async (outputFormat: string, startDate: string, endDate: string, provinsi?: string) => {
        try {
            const data = await AduanService.getAduanByDateRange(startDate, endDate, provinsi);
            const columns = FIXED_REPORT_COLUMN_IDS
                .map((id) => REPORT_COLUMNS_MAP[id])
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
            doc.text(`${APP_NAME} - Laporan Data Matriks`, 14, 8.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(AGENCY_NAME, 14, 14.2);

            doc.setTextColor(17, 24, 39);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.text('Matriks Data Pengaduan', 14, 28);
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

        const tableColumn = columns.map((c) => c.label);
        const tableRows = data.length > 0
            ? data.map((row) => columns.map((c) => safeText(c.getValue(row))))
            : [[`Tidak ada data untuk filter yang dipilih (${filterText})`, ...Array(Math.max(columns.length - 1, 0)).fill('')]];
        const colIndex = (id: string) => columns.findIndex((c) => c.id === id);
        const colWidthStyles: Record<number, { cellWidth: number | 'wrap' }> = {};
        const setWidth = (id: string, width: number | 'wrap') => {
            const index = colIndex(id);
            if (index >= 0) colWidthStyles[index] = { cellWidth: width };
        };
        setWidth('nomorTiket', 26);
        setWidth('createdAt', 19);
        setWidth('status', 15);
        setWidth('namaKps', 42);
        setWidth('nomorSk', 36);
        setWidth('typeKps', 30);
        setWidth('perihal', 44);
        setWidth('provinsi', 20);
        setWidth('kabupaten', 24);
        setWidth('picName', 18);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 50,
            margin: { left: 14, right: 14, bottom: 14 },
            styles: {
                fontSize: 7,
                cellPadding: 2,
                textColor: [31, 41, 55],
                lineColor: [219, 223, 230],
                lineWidth: 0.1,
                valign: 'top',
                overflow: 'linebreak',
                cellWidth: 'wrap',
            },
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: 255,
                fontStyle: 'bold',
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            theme: 'grid',
            columnStyles: colWidthStyles,
            didDrawPage: () => {
                drawHeader();
                drawFooter();
            },
            horizontalPageBreak: true,
            horizontalPageBreakRepeat: 0,
        });

        doc.save(`Laporan_KitapantauPS_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
    },

    exportToExcel: (data: Aduan[], columns: ColumnDefinition[], startDate: string, endDate: string, provinsi?: string) => {
        const docTitle = [['Laporan Pengaduan KitapantauPS']];
        const { periodText, filterText, generatedText } = buildReportMeta(startDate, endDate, provinsi);

        const metadata = [
            [periodText],
            [filterText],
            [generatedText],
            []
        ];

        const tableHeader = [columns.map(c => c.label)];
        const tableRows = data.map(row => columns.map(c => safeText(c.getValue(row))));

        const combinedData = [...docTitle, ...metadata, ...tableHeader, ...tableRows];

        const worksheet = XLSX.utils.aoa_to_sheet(combinedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');

        XLSX.writeFile(workbook, `Laporan_KitapantauPS_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
    },

    exportToCSV: (data: Aduan[], columns: ColumnDefinition[], startDate: string, endDate: string, provinsi?: string) => {
        const docTitle = [['Laporan Pengaduan KitapantauPS']];
        const { periodText, filterText, generatedText } = buildReportMeta(startDate, endDate, provinsi);

        const metadata = [
            [periodText],
            [filterText],
            [generatedText],
            []
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
