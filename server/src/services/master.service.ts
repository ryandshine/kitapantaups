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
      conditions.push(`(
        k.nama_lembaga ILIKE $${params.length}
        OR COALESCE(k.surat_keputusan, '') ILIKE $${params.length}
        OR k.id::text ILIKE $${params.length}
        OR COALESCE(k.skema, '') ILIKE $${params.length}
        OR COALESCE(k.provinsi, '') ILIKE $${params.length}
        OR COALESCE(k.kabupaten, '') ILIKE $${params.length}
      )`)
    }

    const { data, total } = await MasterRepository.findKpsAndCountAll(params, conditions, limit, offset)

    return {
      data,
      total,
      page,
      limit,
    }
  },

  async getKpsById(id: string) {
    return await MasterRepository.findKpsById(id)
  }
}
