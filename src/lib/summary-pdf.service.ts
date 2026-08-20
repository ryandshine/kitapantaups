import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SummaryCount, SummaryReport } from './summary-report.service';

const APP_NAME = 'KitapantauPS';
const AGENCY_NAME = 'Direktorat Pengendalian Perhutanan Sosial';
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
    brand: [46, 106, 87] as const,
    brandDark: [25, 57, 47] as const,
    ink: [31, 41, 55] as const,
    muted: [96, 108, 126] as const,
    border: [218, 224, 218] as const,
    surface: [247, 249, 246] as const,
    sage: [82, 139, 111] as const,
    amber: [190, 127, 42] as const,
    danger: [180, 77, 69] as const,
    blue: [71, 116, 166] as const,
};

const formatNumber = (value: number) => value.toLocaleString('id-ID');

const formatDate = (value?: string | Date) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const compact = (value: unknown) => {
    const text = String(value ?? '-').replace(/\s+/g, ' ').trim();
    return text || '-';
};

const truncate = (value: unknown, max = 34) => {
    const text = compact(value);
    return text.length > max ? `${text.slice(0, max - 1)}...` : text;
};

const displayLabel = (value: unknown) => {
    const normalized = compact(value).toLowerCase();
    const labels: Record<string, string> = {
        baru: 'Baru',
        proses: 'Dalam proses',
        selesai: 'Selesai',
        menunggu_tanggapan: 'Menunggu tanggapan',
        ditolak: 'Ditolak',
        tanpa_status: 'Tanpa status',
        biru: 'Biru',
        perak: 'Perak',
        emas: 'Emas',
        platinum: 'Platinum',
    };
    return labels[normalized] || compact(value).replaceAll('_', ' ');
};

const drawHeader = (doc: any, section: string) => {
    doc.setFillColor(...COLORS.brandDark);
    doc.rect(0, 0, PAGE_WIDTH, 23, 'F');
    doc.setFillColor(...COLORS.brand);
    doc.rect(0, 20, PAGE_WIDTH, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(APP_NAME, MARGIN, 10.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(AGENCY_NAME, MARGIN, 16);
    doc.setTextColor(...COLORS.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(section, MARGIN, 35);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Dibuat ${formatDate(new Date())}`, PAGE_WIDTH - MARGIN, 35, { align: 'right' });
};

const drawFooter = (doc: any) => {
    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.25);
        doc.line(MARGIN, PAGE_HEIGHT - 12, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.muted);
        doc.text(`${APP_NAME} - Laporan Summary`, MARGIN, PAGE_HEIGHT - 7);
        doc.text(`Halaman ${page} dari ${totalPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 7, { align: 'right' });
    }
};

const drawSectionLabel = (doc: any, number: string, title: string, y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.brand);
    doc.text(number, MARGIN, y);
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.ink);
    doc.text(title, MARGIN + 10, y);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, y + 3, PAGE_WIDTH - MARGIN, y + 3);
};

const drawColumnLabel = (doc: any, number: string, title: string, x: number, y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.brand);
    doc.text(number, x, y);
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.ink);
    doc.text(title, x + 10, y);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.25);
    doc.line(x, y + 3, x + 82, y + 3);
};

const drawKpis = (doc: any, cards: Array<{ label: string; value: string }>, y: number) => {
    const gap = 3;
    const width = (CONTENT_WIDTH - gap * (cards.length - 1)) / cards.length;
    cards.forEach((card, index) => {
        const x = MARGIN + index * (width + gap);
        doc.setFillColor(...COLORS.surface);
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(x, y, width, 19, 2, 2, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.muted);
        doc.text(card.label, x + 3, y + 6.5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...COLORS.brandDark);
        doc.text(card.value, x + 3, y + 14.5);
    });
};

const drawHorizontalBars = (doc: any, rows: SummaryCount[], x: number, y: number, width: number, color: readonly [number, number, number], maxRows = 8) => {
    const visible = rows.slice(0, maxRows);
    const max = Math.max(1, ...visible.map((row) => row.count));
    visible.forEach((row, index) => {
        const rowY = y + index * 14;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.ink);
        doc.text(truncate(displayLabel(row.label), 25), x, rowY);
        doc.setTextColor(...COLORS.muted);
        doc.text(formatNumber(row.count), x + width, rowY, { align: 'right' });
        doc.setFillColor(...COLORS.surface);
        doc.roundedRect(x, rowY + 3, width, 3.5, 1.5, 1.5, 'F');
        const label = compact(row.label).toLowerCase();
        const barColor = label === 'selesai' || label === 'sudah' ? COLORS.sage : label === 'ditolak' ? COLORS.danger : label.includes('menunggu') || label.includes('aktif') ? COLORS.amber : color;
        doc.setFillColor(...barColor);
        doc.roundedRect(x, rowY + 3, Math.max(1.5, (row.count / max) * width), 3.5, 1.5, 1.5, 'F');
    });
    return y + visible.length * 14;
};

const drawLineChart = (doc: any, data: SummaryReport['monthlyTrend'], x: number, y: number, width: number, height: number) => {
    const left = x + 14;
    const right = x + width - 4;
    const top = y + 8;
    const bottom = y + height - 15;
    const max = Math.max(1, ...data.flatMap((item) => [item.received, item.resolved]));
    const points = (key: 'received' | 'resolved') => data.map((item, index) => ({
        x: data.length > 1 ? left + (index / (data.length - 1)) * (right - left) : (left + right) / 2,
        y: bottom - (item[key] / max) * (bottom - top),
    }));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    for (let tick = 0; tick <= 4; tick += 1) {
        const tickValue = Math.round((max / 4) * tick);
        const tickY = bottom - (tick / 4) * (bottom - top);
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.25);
        doc.line(left, tickY, right, tickY);
        doc.text(formatNumber(tickValue), left - 3, tickY + 2.5, { align: 'right' });
    }

    (['received', 'resolved'] as const).forEach((key) => {
        const series = points(key);
        doc.setDrawColor(...(key === 'received' ? COLORS.sage : COLORS.amber));
        doc.setLineWidth(1.1);
        for (let index = 1; index < series.length; index += 1) {
            doc.line(series[index - 1].x, series[index - 1].y, series[index].x, series[index].y);
        }
        doc.setFillColor(...(key === 'received' ? COLORS.sage : COLORS.amber));
        series.forEach((point) => doc.circle(point.x, point.y, 1.4, 'F'));
    });

    data.forEach((item, index) => {
        const point = points('received')[index];
        if (!point) return;
        doc.setFontSize(6.5);
        doc.setTextColor(...COLORS.muted);
        doc.text(formatDate(item.month).split(' ')[1] || item.month.slice(5, 7), point.x, bottom + 10, { align: 'center' });
    });

    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.sage);
    doc.text('Aduan diterima', left, y + height + 1);
    doc.setTextColor(...COLORS.amber);
    doc.text('Aduan diselesaikan', left + 42, y + height + 1);
};

const drawParagraph = (doc: any, text: string, x: number, y: number, width: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.ink);
    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, x, y, { lineHeightFactor: 1.45 });
    return y + lines.length * 4.2;
};

const drawLegend = (doc: any, items: Array<{ label: string; color: readonly [number, number, number] }>, x: number, y: number) => {
    let cursor = x;
    items.forEach((item) => {
        doc.setFillColor(...item.color);
        doc.circle(cursor + 1.5, y - 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.muted);
        doc.text(item.label, cursor + 5, y);
        cursor += 5 + doc.getTextWidth(item.label) + 10;
    });
};

const drawSimpleTable = (doc: any, head: string[], body: string[][], startY: number, widths?: Record<number, any>, options?: { topMargin?: number; onPage?: (pageNumber: number) => void }) => {
    autoTable(doc, {
        startY,
        head: [head],
        body: body.length > 0 ? body : [['Tidak ada data', ...Array(Math.max(0, head.length - 1)).fill('-')]],
        theme: 'grid',
        margin: { top: options?.topMargin ?? 14, left: MARGIN, right: MARGIN, bottom: 17 },
        styles: { font: 'helvetica', fontSize: 7.4, cellPadding: 2.2, valign: 'top', lineColor: [...COLORS.border] as any, lineWidth: 0.15, textColor: [...COLORS.ink] as any },
        headStyles: { fillColor: [...COLORS.brand] as any, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 249, 246] },
        columnStyles: widths as any,
        willDrawPage: (data: { pageNumber: number }) => options?.onPage?.(data.pageNumber),
    });
    return doc.lastAutoTable.finalY as number;
};

const buildSummaryDocument = (summary: SummaryReport) => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' }) as any;
        const { overview } = summary;

        drawHeader(doc, 'Laporan Summary Pengaduan');
        drawSectionLabel(doc, '01', 'Ikhtisar Eksekutif', 50);
        drawKpis(doc, [
            { label: 'Total aduan', value: formatNumber(overview.totalAduan) },
            { label: 'Selesai', value: formatNumber(overview.selesai) },
            { label: 'Masih aktif', value: formatNumber(overview.aktif) },
            { label: 'Penyelesaian', value: `${overview.completionRate}%` },
        ], 59);
        drawKpis(doc, [
            { label: 'Total KPS', value: formatNumber(overview.totalKps) },
            { label: 'Luas area', value: `${formatNumber(overview.totalLuas)} Ha` },
            { label: 'Anggota pria', value: formatNumber(overview.anggotaPria) },
            { label: 'Anggota wanita', value: formatNumber(overview.anggotaWanita) },
        ], 82);
        drawSectionLabel(doc, '02', 'Status Penanganan', 117);
        drawLegend(doc, [
            { label: 'Selesai', color: COLORS.sage },
            { label: 'Aktif', color: COLORS.amber },
            { label: 'Terlambat', color: COLORS.danger },
        ], MARGIN, 129);
        drawHorizontalBars(doc, summary.statusSummary, MARGIN, 140, CONTENT_WIDTH, COLORS.sage, 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.brandDark);
        doc.text('Catatan eksekutif', MARGIN, 235);
        const insight = overview.totalAduan === 0
            ? 'Belum terdapat data aduan yang dapat diringkas.'
            : `Sebanyak ${overview.completionRate}% aduan telah berstatus selesai. Terdapat ${formatNumber(overview.terlambat)} aduan aktif yang telah berusia lebih dari 30 hari dan perlu diperhatikan dalam pemantauan berikutnya.`;
        drawParagraph(doc, insight, MARGIN, 244, CONTENT_WIDTH);

        doc.addPage();
        drawHeader(doc, 'Tren dan Umur Penanganan');
        drawSectionLabel(doc, '03', 'Tren Aduan Tahun Berjalan', 50);
        drawLegend(doc, [
            { label: 'Diterima', color: COLORS.sage },
            { label: 'Diselesaikan', color: COLORS.amber },
        ], MARGIN, 62);
        drawLineChart(doc, summary.monthlyTrend, MARGIN, 68, CONTENT_WIDTH, 92);
        drawSectionLabel(doc, '04', 'Umur Aduan Aktif', 181);
        drawHorizontalBars(doc, summary.agingSummary, MARGIN, 194, CONTENT_WIDTH, COLORS.amber, 6);

        doc.addPage();
        drawHeader(doc, 'Wilayah dan Substansi Aduan');
        drawColumnLabel(doc, '05', 'Distribusi Wilayah', MARGIN, 50);
        drawHorizontalBars(doc, summary.provinceSummary, MARGIN, 63, 82, COLORS.brand, 8);
        drawColumnLabel(doc, '06', 'Kategori Masalah', 108, 50);
        drawHorizontalBars(doc, summary.categorySummary, 108, 63, 88, COLORS.blue, 8);
        const regencyY = 190;
        drawSectionLabel(doc, '06A', 'Kabupaten dengan Aduan Terbanyak', 177);
        drawSimpleTable(doc, ['Kabupaten', 'Jumlah Aduan'], summary.regencySummary.map((row) => [row.label, formatNumber(row.count)]), regencyY, { 0: { cellWidth: 130 }, 1: { cellWidth: 40, halign: 'right' } });

        doc.addPage();
        drawHeader(doc, 'KPS, RKPS, dan KUPS');
        drawColumnLabel(doc, '07', 'Kelengkapan RKPS', MARGIN, 50);
        drawHorizontalBars(doc, summary.rkpsSummary, MARGIN, 64, 82, COLORS.sage, 4);
        drawColumnLabel(doc, '08', 'Kelas KUPS', 108, 50);
        drawHorizontalBars(doc, summary.kupsSummary, 108, 64, 88, COLORS.amber, 6);
        const kupsBottom = 64 + Math.max(2, summary.kupsSummary.length) * 14;
        drawSectionLabel(doc, '09', 'Ringkasan KPS', Math.max(150, kupsBottom + 18));
        drawSimpleTable(doc, ['Indikator', 'Nilai'], [
            ['KPS unik terhubung ke aduan', formatNumber(overview.totalKps)],
            ['Total luas area', `${formatNumber(overview.totalLuas)} Ha`],
            ['Anggota pria', formatNumber(overview.anggotaPria)],
            ['Anggota wanita', formatNumber(overview.anggotaWanita)],
        ], Math.max(159, kupsBottom + 27), { 0: { cellWidth: 125 }, 1: { cellWidth: 45, halign: 'right' } });

        doc.addPage();
        drawHeader(doc, 'Kinerja Penanganan');
        drawSectionLabel(doc, '10', 'Beban Aduan per PIC', 50);
        drawSimpleTable(doc, ['PIC', 'Total', 'Selesai', 'Aktif', 'Rata-rata usia'], summary.picSummary.map((row) => [row.label, formatNumber(row.total), formatNumber(row.selesai), formatNumber(row.aktif), `${formatNumber(row.rataRataHari)} hari`]), 61, { 0: { cellWidth: 78 }, 1: { cellWidth: 20, halign: 'right' }, 2: { cellWidth: 22, halign: 'right' }, 3: { cellWidth: 20, halign: 'right' }, 4: { cellWidth: 36, halign: 'right' } });

        doc.addPage();
        drawHeader(doc, 'Prioritas dan Aktivitas Terbaru');
        drawSectionLabel(doc, '11', 'Prioritas Penanganan', 50);
        drawSimpleTable(doc, ['Tiket', 'Perihal', 'Status', 'Usia'], summary.priorityAduan.map((row) => [row.ticket, truncate(row.perihal, 52), displayLabel(row.status), `${formatNumber(row.ageDays)} hari`]), 61, { 0: { cellWidth: 30 }, 1: { cellWidth: 95 }, 2: { cellWidth: 32 }, 3: { cellWidth: 20, halign: 'right' } });
        drawSectionLabel(doc, '12', 'Aduan Terbaru Diperbarui', 178);
        drawSimpleTable(doc, ['Tiket', 'Perihal', 'Status', 'PIC', 'Pembaruan'], summary.recentAduan.slice(0, 6).map((row) => [row.ticket, truncate(row.perihal, 48), displayLabel(row.status), truncate(row.pic, 24), formatDate(row.updated_at)]), 189, { 0: { cellWidth: 30 }, 1: { cellWidth: 72 }, 2: { cellWidth: 30 }, 3: { cellWidth: 30 }, 4: { cellWidth: 20 } });

        doc.addPage();
        drawHeader(doc, 'Lampiran Seluruh Aduan');
        drawSectionLabel(doc, '13', 'Daftar Aduan', 50);
        drawParagraph(doc, `Lampiran ini memuat ${formatNumber(summary.appendix.length)} aduan yang tersedia saat laporan dibuat.`, MARGIN, 61, CONTENT_WIDTH);
        drawSimpleTable(doc, ['Tiket', 'Tanggal', 'Perihal', 'KPS', 'Wilayah', 'PIC', 'Status'], summary.appendix.map((row) => [
            row.ticket,
            formatDate(row.created_at),
            truncate(row.perihal, 38),
            truncate(row.kps, 28),
            truncate([row.kabupaten, row.provinsi].filter(Boolean).join(', '), 28),
            truncate(row.pic, 22),
            truncate(displayLabel(row.status), 18),
        ]), 70, { 0: { cellWidth: 24 }, 1: { cellWidth: 20 }, 2: { cellWidth: 40 }, 3: { cellWidth: 30 }, 4: { cellWidth: 28 }, 5: { cellWidth: 22 }, 6: { cellWidth: 18 } }, { topMargin: 60, onPage: (pageNumber) => { if (pageNumber > 1) { drawHeader(doc, 'Lampiran Seluruh Aduan'); drawSectionLabel(doc, '13', 'Daftar Aduan', 50); } } });

        drawFooter(doc);
        return doc;
};

export const SummaryPdfService = {
    createDocument: buildSummaryDocument,
    exportSummary: (summary: SummaryReport) => {
        const doc = buildSummaryDocument(summary);
        const stamp = new Date().toISOString().slice(0, 10);
        doc.save(`Laporan_Summary_KitapantauPS_${stamp}.pdf`);
    },
};
