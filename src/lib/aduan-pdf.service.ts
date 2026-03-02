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

export const AduanPdfService = {
    exportDetail: (aduan: Aduan, lokasiObjekItems: LokasiObjekItem[], tindakLanjutList: TindakLanjut[]) => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' }) as any;
        const nomorTiket = aduan.nomorTiket || aduan.nomor_tiket || aduan.id;

        doc.setFontSize(14);
        doc.text('Laporan Detail Aduan', 14, 14);
        doc.setFontSize(10);
        doc.text(`Nomor Tiket: ${compact(nomorTiket)}`, 14, 20);
        doc.text(`Dicetak: ${formatDate(new Date())}`, 14, 25);

        autoTable(doc, {
            startY: 30,
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
            styles: { fontSize: 9, cellPadding: 2.5, valign: 'top' },
            headStyles: { fillColor: [238, 242, 247], textColor: [17, 24, 39] },
            theme: 'grid',
            margin: { left: 14, right: 14 },
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

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 7,
            head: [['ID API KPS', 'Nama KPS', 'No SK', 'KPS Type', 'Provinsi', 'Kabupaten', 'Luas', 'Jumlah KK']],
            body: lokasiRows.length > 0 ? lokasiRows : [['-', '-', '-', '-', '-', '-', '-', '-']],
            styles: { fontSize: 8, cellPadding: 2, valign: 'top' },
            headStyles: { fillColor: [238, 242, 247], textColor: [17, 24, 39] },
            theme: 'grid',
            margin: { left: 14, right: 14 },
        });

        const ringkasanTitleY = doc.lastAutoTable.finalY + 8;
        doc.setFontSize(10);
        doc.text('Ringkasan Permasalahan', 14, ringkasanTitleY);
        doc.setFontSize(9);
        const ringkasanText = stripMarkdown(aduan.ringkasanMasalah || aduan.ringkasan_masalah);
        const split = doc.splitTextToSize(ringkasanText, 182);
        doc.text(split, 14, ringkasanTitleY + 5);

        const textEndY = ringkasanTitleY + 5 + (split.length * 4.2);
        const tlRows = (tindakLanjutList || []).map((tl) => [
            formatDate(tl.tanggal),
            compact(tl.jenisTL),
            stripMarkdown(tl.keterangan),
            compact(tl.createdByName),
        ]);

        autoTable(doc, {
            startY: textEndY + 6,
            head: [['Tanggal', 'Jenis TL', 'Keterangan', 'Oleh']],
            body: tlRows.length > 0 ? tlRows : [['-', '-', 'Belum ada tindak lanjut', '-']],
            styles: { fontSize: 8, cellPadding: 2, valign: 'top' },
            headStyles: { fillColor: [238, 242, 247], textColor: [17, 24, 39] },
            theme: 'grid',
            margin: { left: 14, right: 14 },
            columnStyles: { 2: { cellWidth: 90 } },
        });

        const safeTicket = compact(nomorTiket).replace(/[^a-zA-Z0-9_-]/g, '_');
        doc.save(`Detail_Aduan_${safeTicket}_${getTimestamp()}.pdf`);
    },
};
