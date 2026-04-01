import { MasterRepository } from '../repositories/master.repository.js'

export const MasterService = {
  async getStatus() {
    return await MasterRepository.findStatus()
  },

  async getKategori() {
    return await MasterRepository.findKategori()
  },

  async getJenisTl() {
    return await MasterRepository.findJenisTl()
  },

  async getKps(query: any) {
    const search = query.search || ''
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 50
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const params: any[] = []

    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(m.nama_kps ILIKE $${params.length} OR m.no_sk ILIKE $${params.length} OR m.id_kps_api ILIKE $${params.length})`)
    }

    const { data, total } = await MasterRepository.findKpsAndCountAll(params, conditions, limit, offset)

    return {
      data,
      total,
      page,
      limit,
    }
  }
}
