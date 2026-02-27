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
    deadline: { id: 'deadline', label: 'Deadline', getValue: (row) => row.deadline ? format(row.deadline, 'dd MMM yyyy', { locale: id }) : '-' },
    pengaduEmail: { id: 'pengaduEmail', label: 'Email Pengadu', getValue: (row) => row.pengadu.email || '-' },
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
        const doc = new jsPDF({ orientation: 'landscape' }) as any;

        // Add Title
        doc.setFontSize(18);
        doc.text('Laporan Pengaduan KitapantauPS', 14, 15);

        doc.setFontSize(10);
        const periodText = startDate && endDate
            ? `Periode: ${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`
            : 'Semua Periode';

        const filterText = provinsi && provinsi !== 'all' ? `Provinsi: ${provinsi}` : 'Semua Provinsi';

        doc.text(periodText, 14, 22);
        doc.text(filterText, 14, 27);
        doc.text(`Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}`, 14, 32);

        const tableColumn = columns.map(c => c.label);
        const tableRows = data.map(row => columns.map(c => c.getValue(row)));

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [15, 23, 42], textColor: 255 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        doc.save(`Laporan_KitapantauPS_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    },

    exportToExcel: (data: Aduan[], columns: ColumnDefinition[], startDate: string, endDate: string, provinsi?: string) => {
        const docTitle = [['Laporan Pengaduan KitapantauPS']];
        const periodText = startDate && endDate
            ? `Periode: ${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`
            : 'Semua Periode';
        const filterText = provinsi && provinsi !== 'all' ? `Provinsi: ${provinsi}` : 'Semua Provinsi';

        const metadata = [
            [periodText],
            [filterText],
            [`Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}`],
            [] // Empty row separator
        ];

        const tableHeader = [columns.map(c => c.label)];
        const tableRows = data.map(row => columns.map(c => c.getValue(row)));

        // Combine all parts
        const combinedData = [...docTitle, ...metadata, ...tableHeader, ...tableRows];

        const worksheet = XLSX.utils.aoa_to_sheet(combinedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');

        // Save
        XLSX.writeFile(workbook, `Laporan_KitapantauPS_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    },

    exportToCSV: (data: Aduan[], columns: ColumnDefinition[], startDate: string, endDate: string, provinsi?: string) => {
        const docTitle = [['Laporan Pengaduan KitapantauPS']];
        const periodText = startDate && endDate
            ? `Periode: ${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`
            : 'Semua Periode';
        const filterText = provinsi && provinsi !== 'all' ? `Provinsi: ${provinsi}` : 'Semua Provinsi';

        const metadata = [
            [periodText],
            [filterText],
            [`Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}`],
            [] // Empty row separator
        ];

        const tableHeader = [columns.map(c => c.label)];
        const tableRows = data.map(row => columns.map(c => c.getValue(row)));

        const combinedData = [...docTitle, ...metadata, ...tableHeader, ...tableRows];

        const worksheet = XLSX.utils.aoa_to_sheet(combinedData);
        const csv = XLSX.utils.sheet_to_csv(worksheet);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Laporan_KitapantauPS_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
