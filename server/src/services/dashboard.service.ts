import { DashboardRepository } from '../repositories/dashboard.repository.js'

export const DashboardService = {
  async getStats() {
    const data = await DashboardRepository.getStats()
    
    const statusMap: Record<string, number> = {}
    for (const row of data.byStatus) {
      statusMap[row.status] = Number(row.count)
    }

    const kupsMap: Record<string, number> = {
      'BIRU': 0,
      'PERAK': 0,
      'EMAS': 0,
      'PLATINUM': 0
    }
    for (const row of data.kups) {
      const kelasUpper = String(row.kelas).toUpperCase();
      if (kelasUpper in kupsMap) {
        kupsMap[kelasUpper] = Number(row.count);
      }
    }

    return {
      total: data.total,
      by_status: statusMap,
      last_30_days: data.recent,
      rkps: data.rkps,
      kups: kupsMap,
    }
  }
}
