import { DashboardRepository } from '../repositories/dashboard.repository.js'

export const DashboardService = {
  async getStats() {
    const data = await DashboardRepository.getStats()
    
    const statusMap: Record<string, number> = {}
    for (const row of data.byStatus) {
      statusMap[row.status] = Number(row.count)
    }

    return {
      total: data.total,
      by_status: statusMap,
      last_30_days: data.recent,
    }
  }
}
