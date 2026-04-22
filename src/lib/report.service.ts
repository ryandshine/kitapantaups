import { AduanService } from './aduan.service';
import type { Aduan } from '../types';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export interface ColumnDefinition {
    id: string;
    label: string;
    getValue: (row: Aduan) => any;
}

export interface ReportFilters {
    provinsi?: string;
    status?: string;
    picId?: string;
    picName?: string;
}

const REPORT_COLUMNS_MAP: Record<string, ColumnDefinition> = {
    nomorTiket: { id: 'nomorTiket', label: 'Nomor Tiket', getValue: (row) => row.nomorTiket || row.nomor_tiket },
    createdAt: { id: 'createdAt', label: 'Tanggal Buat', getValue: (row) => row.createdAt ? format(new Date(row.createdAt), 'dd MMM yyyy', { locale: id }) : '-' },
    status: { id: 'status', label: 'Status', getValue: (row) => row.status },
    namaKps: {
        id: 'namaKps',
        label: 'Nama KPS/Lembaga',
        getValue: (row) => row.nama_kps && row.nama_kps.length > 0 ? row.nama_kps.join(', ') : '-',
    },
    nomorSk: {
        id: 'nomorSk',
        label: 'Nomor SK',
        getValue: (row) => row.nomor_sk && row.nomor_sk.length > 0 ? row.nomor_sk.join(', ') : '-',
    },
    typeKps: {
        id: 'typeKps',
        label: 'Skema',
        getValue: (row) => {
            const values = (row.type_kps && row.type_kps.length > 0) ? row.type_kps : row.jenis_kps;
            return values && values.length > 0 ? values.join(', ') : '-';
        }
    },
    perihal: { id: 'perihal', label: 'Perihal', getValue: (row) => row.perihal },
    ringkasanKasus: {
        id: 'ringkasanKasus',
        label: 'Ringkasan Kasus',
        getValue: (row) => row.ringkasanMasalah || row.ringkasan_masalah || '-',
    },
    pengadu: {
        id: 'pengadu',
        label: 'Pengadu',
        getValue: (row) => row.pengadu?.nama || row.pengadu_nama || '-',
    },
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
    'ringkasanKasus',
    'pengadu',
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

const buildReportMeta = (startDate: string, endDate: string, filters?: ReportFilters) => {
    const periodText = startDate && endDate
        ? `Periode: ${formatDateSafe(startDate)} - ${formatDateSafe(endDate)}`
        : 'Periode: Semua Periode';

    const filterParts = [
        filters?.provinsi && filters.provinsi !== 'all' ? `Provinsi: ${filters.provinsi}` : 'Provinsi: Semua Provinsi',
        filters?.status && filters.status !== 'all' ? `Status: ${filters.status}` : 'Status: Semua Status',
        filters?.picId && filters.picId !== 'all'
            ? `PIC: ${filters.picName || filters.picId}`
            : 'PIC: Semua PIC'
    ];

    const generatedText = `Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}`;

    return { periodText, filterText: filterParts.join(' | '), generatedText };
};

export const ReportService = {
    generateReport: async (outputFormat: string, startDate: string, endDate: string, filters?: ReportFilters) => {
        try {
            const data = await AduanService.getAduanByDateRange(startDate, endDate, filters);
            const columns = FIXED_REPORT_COLUMN_IDS
                .map((id) => REPORT_COLUMNS_MAP[id])
                .filter(Boolean);

            if (outputFormat === 'excel') {
                return ReportService.exportToExcel(data, columns, startDate, endDate, filters);
            } else if (outputFormat === 'csv') {
                return ReportService.exportToCSV(data, columns, startDate, endDate, filters);
            }
            return ReportService.exportToExcel(data, columns, startDate, endDate, filters);
        } catch (error) {
            console.error('Error generating report:', error);
            throw error;
        }
    },

    exportToExcel: (data: Aduan[], columns: ColumnDefinition[], startDate: string, endDate: string, filters?: ReportFilters) => {
        const { periodText, filterText, generatedText } = buildReportMeta(startDate, endDate, filters);
        const tableHeader = ['No', ...columns.map(c => c.label)];
        const tableRows = data.map((row, index) => [String(index + 1), ...columns.map(c => safeText(c.getValue(row)))]);
        const totalColumns = tableHeader.length;
        const lastColumn = XLSX.utils.encode_col(totalColumns - 1);

        const sheetData: Array<Array<string>> = [
            [APP_NAME],
            [AGENCY_NAME],
            [],
            ['Laporan Data Pengaduan'],
            [],
            [periodText, '', '', '', filterText],
            [generatedText, '', '', '', `Total Data: ${data.length} baris`],
            []
        ];
        sheetData.push(tableHeader);
        if (tableRows.length > 0) {
            sheetData.push(...tableRows);
        } else {
            sheetData.push(['1', 'Tidak ada data untuk filter yang dipilih', ...Array(Math.max(totalColumns - 2, 0)).fill('')]);
        }

        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        const headerRowNumber = 9;
        const dataStartRowNumber = headerRowNumber + 1;
        const dataEndRowNumber = dataStartRowNumber + Math.max(tableRows.length, 1) - 1;

        worksheet['!merges'] = [
            XLSX.utils.decode_range(`A1:${lastColumn}1`),
            XLSX.utils.decode_range(`A2:${lastColumn}2`),
            XLSX.utils.decode_range(`A4:${lastColumn}4`),
            XLSX.utils.decode_range(`A6:D6`),
            XLSX.utils.decode_range(`E6:${lastColumn}6`),
            XLSX.utils.decode_range(`A7:D7`),
            XLSX.utils.decode_range(`E7:${lastColumn}7`),
        ];
        worksheet['!autofilter'] = { ref: `A${headerRowNumber}:${lastColumn}${headerRowNumber}` };
        (worksheet as any)['!freeze'] = { xSplit: 1, ySplit: dataStartRowNumber - 1, topLeftCell: `B${dataStartRowNumber}` };

        const measureWidth = (value: string) => {
            const lines = value.split('\n');
            return Math.max(...lines.map((line) => line.length));
        };
        const columnWidths = tableHeader.map((header, index) => {
            const maxValueWidth = Math.max(
                header.length,
                ...tableRows.map((row) => measureWidth(row[index] ?? ''))
            );
            const bounded = Math.min(Math.max(maxValueWidth + 2, index === 0 ? 5 : 12), index === 0 ? 7 : 45);
            return { wch: bounded };
        });
        worksheet['!cols'] = columnWidths;

        const setCellStyle = (address: string, style: any) => {
            const cell = (worksheet as any)[address];
            if (cell) cell.s = style;
        };
        const titleStyle = {
            font: { bold: true, sz: 15, color: { rgb: '1F2937' } },
            alignment: { horizontal: 'left', vertical: 'center' },
        };
        const subtitleStyle = {
            font: { bold: true, sz: 11, color: { rgb: '374151' } },
            alignment: { horizontal: 'left', vertical: 'center' },
        };
        const metaStyle = {
            font: { sz: 10, color: { rgb: '4B5563' } },
            alignment: { horizontal: 'left', vertical: 'center' },
        };
        const tableHeaderStyle = {
            font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '1E3A8A' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
                top: { style: 'thin', color: { rgb: 'D1D5DB' } },
                bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
                left: { style: 'thin', color: { rgb: 'D1D5DB' } },
                right: { style: 'thin', color: { rgb: 'D1D5DB' } },
            },
        };
        const bodyStyle = {
            alignment: { vertical: 'top', wrapText: true },
            border: {
                top: { style: 'thin', color: { rgb: 'E5E7EB' } },
                bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
                left: { style: 'thin', color: { rgb: 'E5E7EB' } },
                right: { style: 'thin', color: { rgb: 'E5E7EB' } },
            },
        };

        setCellStyle('A1', titleStyle);
        setCellStyle('A2', subtitleStyle);
        setCellStyle('A4', { ...subtitleStyle, font: { bold: true, sz: 12, color: { rgb: '111827' } } });
        setCellStyle('A6', metaStyle);
        setCellStyle('E6', metaStyle);
        setCellStyle('A7', metaStyle);
        setCellStyle('E7', metaStyle);

        for (let col = 0; col < totalColumns; col += 1) {
            const headerAddress = XLSX.utils.encode_cell({ r: headerRowNumber - 1, c: col });
            setCellStyle(headerAddress, tableHeaderStyle);
        }
        for (let row = dataStartRowNumber; row <= dataEndRowNumber; row += 1) {
            for (let col = 0; col < totalColumns; col += 1) {
                const bodyAddress = XLSX.utils.encode_cell({ r: row - 1, c: col });
                setCellStyle(bodyAddress, bodyStyle);
            }
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');
        XLSX.writeFile(workbook, `Laporan_Matriks_KitapantauPS_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`, { cellStyles: true });
    },

    exportToCSV: (data: Aduan[], columns: ColumnDefinition[], startDate: string, endDate: string, filters?: ReportFilters) => {
        const docTitle = [['Laporan Pengaduan KitapantauPS']];
        const { periodText, filterText, generatedText } = buildReportMeta(startDate, endDate, filters);

        const metadata = [
            [periodText],
            [filterText],
            [generatedText],
            []
        ];

        const tableHeader = [['No', ...columns.map(c => c.label)]];
        const tableRows = data.map((row, index) => [String(index + 1), ...columns.map(c => safeText(c.getValue(row)))]);

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
