import { TindakLanjutRepository } from '../repositories/tindak-lanjut.repository.js'
import { StorageService } from './storage.service.js'

const normalizeFileNames = async (row: any) => {
  const fileUrls = (row.file_urls || []).filter((url: unknown): url is string => typeof url === 'string' && url.length > 0)
  if (fileUrls.length === 0) return row
  if (!row.tanggal) {
    throw new Error('Perlu Perbaikan Tanggal Dokumen: tanggal tindak lanjut belum tersedia')
  }

  const nextUrls = await StorageService.renameDocumentFiles(
    fileUrls,
    row.jenis_tl || 'Tindak Lanjut',
    row.tanggal,
    async (urls) => {
      await TindakLanjutRepository.updateFileUrls(row.id, urls)
    }
  )

  return { ...row, file_urls: nextUrls }
}

export const TindakLanjutService = {
  async getByAduanId(aduanId: string) {
    return await TindakLanjutRepository.findByAduanId(aduanId)
  },

  async create(aduanId: string, data: any, user: any) {
    const actorName = await TindakLanjutRepository.getActorName(user.userId, user.email)
    const created = await TindakLanjutRepository.create(aduanId, data, user.userId, actorName)
    try {
      return await normalizeFileNames(created)
    } catch (error) {
      await TindakLanjutRepository.delete(created.id)
      throw error
    }
  },

  async update(id: string, data: any) {
    const before = await TindakLanjutRepository.findById(id)
    if (!before) return null

    const updated = await TindakLanjutRepository.update(id, data)
    if (!updated) return null

    try {
      return await normalizeFileNames(updated)
    } catch (error) {
      await TindakLanjutRepository.restore(id, before)
      throw error
    }
  },

  async delete(id: string) {
    return await TindakLanjutRepository.delete(id)
  }
}
