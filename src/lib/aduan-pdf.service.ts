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
    anggotaPria?: number;
    anggotaWanita?: number;
};

const APP_NAME = 'KitapantauPS';
const AGENCY_NAME = 'Direktorat Pengendalian Perhutanan Sosial';
const DOC_TITLE = 'Laporan Detail Aduan';
const COLOR_BRAND = [13, 71, 161] as const;
const COLOR_BRAND_DARK = [9, 46, 105] as const;
const COLOR_SURFACE = [246, 249, 255] as const;
const COLOR_BORDER = [216, 225, 241] as const;
const COLOR_TEXT = [31, 41, 55] as const;

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
    doc.setFillColor(...COLOR_SURFACE);
    doc.setDrawColor(...COLOR_BORDER);
    doc.roundedRect(14, y - 4.5, 182, 9, 2, 2, 'FD');
    doc.setFillColor(...COLOR_BRAND);
    doc.roundedRect(16, y - 2.3, 2.5, 4.6, 1, 1, 'F');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_BRAND_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20.5, y + 1.3);
    doc.setTextColor(...COLOR_TEXT);
    doc.setFont('helvetica', 'normal');
};

const drawHeader = (doc: any, nomorTiket: string) => {
    doc.setFillColor(...COLOR_BRAND_DARK);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setFillColor(...COLOR_BRAND);
    doc.rect(0, 20, 210, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.text(APP_NAME, 14, 11);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(AGENCY_NAME, 14, 16.5);

    doc.setTextColor(...COLOR_TEXT);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14.5);
    doc.text(DOC_TITLE, 14, 33);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Nomor Tiket: ${compact(nomorTiket)}`, 14, 39);
    doc.text(`Tanggal Cetak: ${formatDate(new Date())}`, 14, 44);
};

const drawKpiCards = (doc: any, startY: number, cards: Array<{ label: string; value: string }>) => {
    const gap = 3.2;
    const availableWidth = 182 - gap * Math.max(cards.length - 1, 0);
    const cardWidth = availableWidth / Math.max(cards.length, 1);
    const cardHeight = 18;

    cards.forEach((card, idx) => {
        const x = 14 + idx * (cardWidth + gap);
        doc.setFillColor(...COLOR_SURFACE);
        doc.setDrawColor(...COLOR_BORDER);
        doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(86, 99, 124);
        doc.text(card.label, x + 3, startY + 6.5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...COLOR_BRAND_DARK);
        doc.text(card.value, x + 3, startY + 13.5);
        doc.setFont('helvetica', 'normal');
    });
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
        const totalLuas = (lokasiObjekItems || []).reduce((acc, item) => acc + Number(item.luasHa || 0), 0);
        const totalAnggotaPria = (lokasiObjekItems || []).reduce((acc, item) => acc + Number(item.anggotaPria || 0), 0);
        const totalAnggotaWanita = (lokasiObjekItems || []).reduce((acc, item) => acc + Number(item.anggotaWanita || 0), 0);

        drawHeader(doc, nomorTiket);
        drawKpiCards(doc, 49, [
            { label: 'Status', value: compact(aduan.status).toUpperCase() },
            { label: 'Lokasi Objek', value: `${(lokasiObjekItems || []).length}` },
            { label: 'Total luas_total', value: `${totalLuas.toLocaleString('id-ID')} Ha` },
            { label: 'Total anggota_pria', value: `${totalAnggotaPria.toLocaleString('id-ID')}` },
            { label: 'Total anggota_wanita', value: `${totalAnggotaWanita.toLocaleString('id-ID')}` },
        ]);

        drawSectionTitle(doc, 74, 'Informasi Utama Aduan');
        autoTable(doc, {
            startY: 78,
            head: [['Field', 'Nilai']],
            body: [
                ['Kategori', compact(aduan.kategoriMasalah || aduan.kategori_masalah)],
                ['Nama Pengadu', compact(aduan.pengadu?.nama || aduan.pengadu_nama)],
                ['Telepon', compact(aduan.pengadu?.telepon)],
                ['Email', compact(aduan.pengadu?.email)],
                ['Instansi/Kelompok', compact(aduan.pengadu?.instansi || aduan.pengadu_instansi)],
                ['PIC', compact(aduan.picName)],
                ['Tanggal Masuk', formatDate(aduan.createdAt || aduan.created_at)],
                ['Perihal', compact(aduan.perihal || aduan.surat_asal_perihal)],
            ],
            styles: { fontSize: 9, cellPadding: 2.6, valign: 'top', lineColor: [226, 232, 240], lineWidth: 0.1 },
            headStyles: { fillColor: [...COLOR_BRAND] as any, textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [250, 252, 255] },
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
            `${Number(item.anggotaPria || 0).toLocaleString('id-ID')}`,
            `${Number(item.anggotaWanita || 0).toLocaleString('id-ID')}`,
        ]);

        drawSectionTitle(doc, doc.lastAutoTable.finalY + 9, 'Lokasi Objek KPS');
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 13,
            head: [['id', 'nama_lembaga', 'surat_keputusan', 'skema', 'provinsi', 'kabupaten', 'luas_total', 'anggota_pria', 'anggota_wanita']],
            body: lokasiRows.length > 0 ? lokasiRows : [['-', '-', '-', '-', '-', '-', '-', '-', '-']],
            styles: { fontSize: 8, cellPadding: 2, valign: 'top', lineColor: [226, 232, 240], lineWidth: 0.1 },
            headStyles: { fillColor: [...COLOR_BRAND] as any, textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [250, 252, 255] },
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
                7: { cellWidth: 16 },
                8: { cellWidth: 16 },
            },
        });

        drawSectionTitle(doc, doc.lastAutoTable.finalY + 9, 'Ringkasan Permasalahan');
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 13,
            body: [[stripMarkdown(aduan.ringkasanMasalah || aduan.ringkasan_masalah)]],
            styles: { fontSize: 9, cellPadding: 3.2, valign: 'top', lineColor: [226, 232, 240], lineWidth: 0.1 },
            alternateRowStyles: { fillColor: [250, 252, 255] },
            theme: 'grid',
            margin: { left: 14, right: 14, bottom: 14 },
        });

        const tlRows = (tindakLanjutList || []).map((tl) => [
            formatDate(tl.tanggal),
            compact(tl.jenisTL),
            stripMarkdown(tl.keterangan),
            compact(tl.createdByName),
        ]);

        drawSectionTitle(doc, doc.lastAutoTable.finalY + 9, 'Riwayat Dokumen Tindak Lanjut');
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 13,
            head: [['Tanggal', 'Jenis Dokumen', 'Keterangan', 'Oleh']],
            body: tlRows.length > 0 ? tlRows : [['-', '-', 'Belum ada dokumen tindak lanjut', '-']],
            styles: { fontSize: 8, cellPadding: 2.2, valign: 'top', lineColor: [226, 232, 240], lineWidth: 0.1 },
            headStyles: { fillColor: [...COLOR_BRAND] as any, textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [250, 252, 255] },
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
