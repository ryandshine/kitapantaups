import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Aduan, TindakLanjut } from '../types';

type LokasiObjekItem = {
    idApiKps: string;
    namaKps: string;
    noSk: string;
    kpsType: string;
    provinsi: string;
    kabupaten: string;
    luasHa: number;
    jumlahKk: number;
};

const APP_NAME = 'KitapantauPS';
const AGENCY_NAME = 'Direktorat Pengendalian Perhutanan Sosial';
const DOC_TITLE = 'Laporan Detail Aduan';

const formatDate = (value?: Date | string) => {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(date);
};

const compact = (value: unknown) => {
    if (value === null || value === undefined) return '-';
    const text = String(value).replace(/\s+/g, ' ').trim();
    return text || '-';
};

const stripMarkdown = (text?: string) => {
    if (!text) return '-';
    return text
        .replace(/[#>*_`~\-]/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim() || '-';
};

const getTimestamp = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const drawSectionTitle = (doc: any, y: number, title: string) => {
    doc.setFillColor(240, 246, 255);
    doc.setDrawColor(210, 224, 246);
    doc.roundedRect(14, y - 4, 182, 8, 1.8, 1.8, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(24, 48, 92);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 16, y + 1.2);
    doc.setTextColor(33, 37, 41);
    doc.setFont('helvetica', 'normal');
};

const drawHeader = (doc: any, nomorTiket: string) => {
    doc.setFillColor(24, 48, 92);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(APP_NAME, 14, 10.5);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(AGENCY_NAME, 14, 16.5);

    doc.setTextColor(33, 37, 41);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(DOC_TITLE, 14, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Nomor Tiket: ${compact(nomorTiket)}`, 14, 35.5);
    doc.text(`Tanggal Cetak: ${formatDate(new Date())}`, 14, 40.5);
};

const drawFooterAllPages = (doc: any) => {
    const totalPages = doc.getNumberOfPages();
    const printedAt = formatDate(new Date());

    for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(215, 220, 228);
        doc.line(14, 288, 196, 288);
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(`${APP_NAME} • ${AGENCY_NAME}`, 14, 292);
        doc.text(`Dicetak ${printedAt}`, 14, 296);
        doc.text(`Halaman ${page} dari ${totalPages}`, 196, 296, { align: 'right' });
    }
};

export const AduanPdfService = {
    exportDetail: (aduan: Aduan, lokasiObjekItems: LokasiObjekItem[], tindakLanjutList: TindakLanjut[]) => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' }) as any;
        const nomorTiket = aduan.nomorTiket || aduan.nomor_tiket || aduan.id;
        drawHeader(doc, nomorTiket);

        drawSectionTitle(doc, 49, 'Informasi Utama Aduan');
        autoTable(doc, {
            startY: 53,
            head: [['Field', 'Nilai']],
            body: [
                ['Status Aduan', compact(aduan.status).toUpperCase()],
                ['Kategori', compact(aduan.kategoriMasalah || aduan.kategori_masalah)],
                ['Nama Pengadu', compact(aduan.pengadu?.nama || aduan.pengadu_nama)],
                ['Telepon', compact(aduan.pengadu?.telepon)],
                ['Email', compact(aduan.pengadu?.email)],
                ['Instansi/Kelompok', compact(aduan.pengadu?.instansi || aduan.pengadu_instansi)],
                ['PIC', compact(aduan.picName)],
                ['Tanggal Masuk', formatDate(aduan.createdAt || aduan.created_at)],
                ['Perihal', compact(aduan.perihal || aduan.surat_asal_perihal)],
            ],
            styles: { fontSize: 9, cellPadding: 2.5, valign: 'top', lineColor: [220, 224, 231], lineWidth: 0.1 },
            headStyles: { fillColor: [248, 250, 252], textColor: [17, 24, 39] },
            theme: 'grid',
            margin: { left: 14, right: 14, bottom: 14 },
            columnStyles: {
                0: { cellWidth: 52, fontStyle: 'bold' },
                1: { cellWidth: 130 },
            },
        });

        const lokasiRows = (lokasiObjekItems || []).map((item) => [
            compact(item.idApiKps),
            compact(item.namaKps),
            compact(item.noSk),
            compact(item.kpsType),
            compact(item.provinsi),
            compact(item.kabupaten),
            `${Number(item.luasHa || 0).toLocaleString('id-ID')} Ha`,
            `${Number(item.jumlahKk || 0).toLocaleString('id-ID')} KK`,
        ]);

        drawSectionTitle(doc, doc.lastAutoTable.finalY + 9, 'Lokasi Objek KPS');
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 13,
            head: [['ID API KPS', 'Nama KPS', 'No SK', 'KPS Type', 'Provinsi', 'Kabupaten', 'Luas', 'Jumlah KK']],
            body: lokasiRows.length > 0 ? lokasiRows : [['-', '-', '-', '-', '-', '-', '-', '-']],
            styles: { fontSize: 8, cellPadding: 2, valign: 'top', lineColor: [220, 224, 231], lineWidth: 0.1 },
            headStyles: { fillColor: [248, 250, 252], textColor: [17, 24, 39] },
            theme: 'grid',
            margin: { left: 14, right: 14, bottom: 14 },
            columnStyles: {
                0: { cellWidth: 22 },
                1: { cellWidth: 30 },
                2: { cellWidth: 24 },
                3: { cellWidth: 19 },
                4: { cellWidth: 24 },
                5: { cellWidth: 24 },
                6: { cellWidth: 18 },
                7: { cellWidth: 21 },
            },
        });

        drawSectionTitle(doc, doc.lastAutoTable.finalY + 9, 'Ringkasan Permasalahan');
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 13,
            body: [[stripMarkdown(aduan.ringkasanMasalah || aduan.ringkasan_masalah)]],
            styles: { fontSize: 9, cellPadding: 3, valign: 'top', lineColor: [220, 224, 231], lineWidth: 0.1 },
            theme: 'grid',
            margin: { left: 14, right: 14, bottom: 14 },
        });

        const tlRows = (tindakLanjutList || []).map((tl) => [
            formatDate(tl.tanggal),
            compact(tl.jenisTL),
            stripMarkdown(tl.keterangan),
            compact(tl.createdByName),
        ]);

        drawSectionTitle(doc, doc.lastAutoTable.finalY + 9, 'Riwayat Tindak Lanjut');
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 13,
            head: [['Tanggal', 'Jenis TL', 'Keterangan', 'Oleh']],
            body: tlRows.length > 0 ? tlRows : [['-', '-', 'Belum ada tindak lanjut', '-']],
            styles: { fontSize: 8, cellPadding: 2, valign: 'top', lineColor: [220, 224, 231], lineWidth: 0.1 },
            headStyles: { fillColor: [248, 250, 252], textColor: [17, 24, 39] },
            theme: 'grid',
            margin: { left: 14, right: 14, bottom: 16 },
            columnStyles: {
                0: { cellWidth: 26 },
                1: { cellWidth: 33 },
                2: { cellWidth: 95 },
                3: { cellWidth: 28 },
            },
        });

        drawFooterAllPages(doc);
        const safeTicket = compact(nomorTiket).replace(/[^a-zA-Z0-9_-]/g, '_');
        doc.save(`Detail_Aduan_${safeTicket}_${getTimestamp()}.pdf`);
    },
};
