import { AduanRepository } from '../repositories/aduan.repository.js'
import { StorageService } from './storage.service.js'
import { generateAduanTicketNumber } from '../lib/aduan-ticket.js'

export const AduanService = {
  async getList(query: any) {
    const { status, search, page = 1, limit = 20, offset: reqOffset, start_date, end_date, provinsi, nomor_tiket } = query
    const offset = reqOffset ? Number(reqOffset) : (Number(page) - 1) * Number(limit)

    const conditions: string[] = []
    const params: any[] = []

    if (status) {
      params.push(status)
      conditions.push(`a.status = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(
        a.pengadu_nama ILIKE $${params.length}
        OR a.ringkasan_masalah ILIKE $${params.length}
        OR a.nomor_tiket ILIKE $${params.length}
        OR a.surat_asal_perihal ILIKE $${params.length}
        OR a.lokasi_prov ILIKE $${params.length}
        OR a.lokasi_kab ILIKE $${params.length}
        OR a.lokasi_kec ILIKE $${params.length}
        OR a.lokasi_desa ILIKE $${params.length}
        OR EXISTS (
          SELECT 1
          FROM public.aduan_kps ak
          JOIN public.kps k ON k.id = ak.kps_id
          WHERE ak.aduan_id = a.id
            AND (
              k.nama_lembaga ILIKE $${params.length}
              OR COALESCE(k.surat_keputusan, '') ILIKE $${params.length}
              OR k.id::text ILIKE $${params.length}
              OR COALESCE(k.skema, '') ILIKE $${params.length}
              OR COALESCE(k.provinsi, '') ILIKE $${params.length}
              OR COALESCE(k.kabupaten, '') ILIKE $${params.length}
            )
        )
      )`)
    }
    if (nomor_tiket) {
      params.push(nomor_tiket)
      conditions.push(`a.nomor_tiket = $${params.length}`)
    }
    if (start_date) {
      params.push(start_date)
      conditions.push(`a.created_at >= $${params.length}::timestamp`)
    }
    if (end_date) {
      params.push(end_date + ' 23:59:59')
      conditions.push(`a.created_at <= $${params.length}::timestamp`)
    }
    if (provinsi && provinsi !== 'all') {
      params.push(provinsi)
      conditions.push(`a.lokasi_prov = $${params.length}`)
    }

    const { data, total } = await AduanRepository.findAndCountAll(params, conditions, Number(limit), offset)
    return { data, total, page: Number(page), limit: Number(limit) }
  },

  async getProvinces() {
    return await AduanRepository.findDistinctProvinces()
  },

  async getDetail(id: string) {
    return await AduanRepository.findById(id)
  },

  async uploadFile(file: File, aduanId: string, category: string) {
    const aduan = await AduanRepository.findSimpleById(aduanId)
    if (!aduan) {
      throw new Error('Aduan tidak ditemukan')
    }

    const url = await StorageService.saveAduanFile(file, aduanId, aduan.nomor_tiket as string, category)
    return { url }
  },

  async addDocument(aduanId: string, data: any, userId: string) {
    await AduanRepository.createDocument(aduanId, data.file_url, data.file_name, data.file_category || 'dokumen', userId)
  },

  async deleteDocument(aduanId: string, docId: string, user: any) {
    const doc = await AduanRepository.findDocument(docId, aduanId)
    if (!doc) throw new Error('Dokumen tidak ditemukan')

    await StorageService.deleteFile(doc.file_url)
    await AduanRepository.deleteDocument(docId)

    const actorName = await AduanRepository.getActorName(user.userId, user.email)
    await AduanRepository.logActivity(
      'delete_document',
      `Menghapus dokumen: ${doc.file_name}`,
      user.userId,
      actorName,
      aduanId,
      { file_name: doc.file_name, file_url: doc.file_url }
    )
  },

  async create(data: any, userId: string) {
    const year = new Date().getFullYear()
    const count = await AduanRepository.countByYear(year)
    const nomorTiket = generateAduanTicketNumber(year, count + 1)

    return await AduanRepository.create(data, nomorTiket, userId)
  },

  async update(id: string, data: any, user: any) {
    if ((data.status !== undefined || data.alasan_penolakan !== undefined) && user.role !== 'admin') {
      throw new Error('Akses ditolak: hanya admin yang dapat mengubah status aduan')
    }

    return await AduanRepository.update(id, data, user.userId)
  },

  async delete(id: string) {
    return await AduanRepository.delete(id)
  }
}
