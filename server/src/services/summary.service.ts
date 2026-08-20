import { SummaryRepository } from '../repositories/summary.repository.js'

const toNumber = (value: unknown) => Number(value || 0)

const mapCountRows = (rows: Array<{ label: string; count: unknown }>) =>
  rows.map((row) => ({ label: row.label, count: toNumber(row.count) }))

export const SummaryService = {
  async getSummary() {
    const data = await SummaryRepository.getSummary()
    const overview = {
      totalAduan: toNumber(data.overview.total_aduan),
      selesai: toNumber(data.overview.selesai),
      aktif: toNumber(data.overview.aktif),
      terlambat: toNumber(data.overview.terlambat),
      tahunBerjalan: toNumber(data.overview.tahun_berjalan),
      totalKps: toNumber(data.kpsOverview.total_kps),
      totalLuas: toNumber(data.kpsOverview.total_luas),
      anggotaPria: toNumber(data.kpsOverview.anggota_pria),
      anggotaWanita: toNumber(data.kpsOverview.anggota_wanita),
    }

    return {
      generatedAt: new Date().toISOString(),
      overview: {
        ...overview,
        completionRate: overview.totalAduan > 0 ? Math.round((overview.selesai / overview.totalAduan) * 100) : 0,
      },
      statusSummary: mapCountRows(data.statuses),
      monthlyTrend: data.monthlyTrend.map((row) => ({ month: row.month, received: toNumber(row.received), resolved: toNumber(row.resolved) })),
      agingSummary: mapCountRows(data.aging),
      provinceSummary: mapCountRows(data.provinces),
      regencySummary: mapCountRows(data.regencies),
      categorySummary: mapCountRows(data.categories),
      rkpsSummary: mapCountRows(data.rkps),
      kupsSummary: mapCountRows(data.kups),
      picSummary: data.pics.map((row) => ({ label: row.label, total: toNumber(row.total), selesai: toNumber(row.selesai), aktif: toNumber(row.aktif), rataRataHari: toNumber(row.rata_rata_hari) })),
      priorityAduan: data.priority.map((row) => ({ ...row, ageDays: toNumber(row.age_days) })),
      recentAduan: data.recent,
      appendix: data.appendix,
    }
  },
}
