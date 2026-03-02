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
    skema: { id: 'skema', label: 'Skema', getValue: (row) => row.skema },
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

export const ReportService = {
    generateReport: async (outputFormat: string, startDate: string, endDate: string, selectedColumnIds: string[], provinsi?: string) => {
        try {
            const data = await AduanService.getAduanByDateRange(startDate, endDate, provinsi);

            const columns = selectedColumnIds
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

        const previewRows = data
            .slice(0, 5)
            .map((row) => ([
                safeText(row.nomorTiket || row.nomor_tiket),
                safeText(row.createdAt ? format(new Date(row.createdAt), 'dd/MM/yyyy') : '-'),
                safeText(row.status).toUpperCase(),
                safeText(row.perihal).slice(0, 65),
                safeText(row.picName),
            ]));

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 5,
            margin: { left: 14, right: 14, bottom: 14 },
            head: [['Preview Data (5 Terbaru)', 'Tanggal', 'Status', 'Perihal', 'PIC']],
            body: previewRows.length > 0 ? previewRows : [['-', '-', '-', 'Tidak ada data untuk filter ini', '-']],
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
                0: { cellWidth: 45 },
                1: { cellWidth: 22 },
                2: { cellWidth: 22 },
                3: { cellWidth: 150 },
                4: { cellWidth: 28 },
            },
            theme: 'grid',
        });

        const tableColumn = columns.map((c) => c.label);
        const tableRows = data.length > 0
            ? data.map((row) => columns.map((c) => safeText(c.getValue(row))))
            : [[`Tidak ada data untuk filter yang dipilih (${filterText})`, ...Array(Math.max(columns.length - 1, 0)).fill('')]];

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: doc.lastAutoTable.finalY + 6,
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
                fillColor: [30, 41, 59],
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
