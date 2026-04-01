import { TindakLanjutRepository } from '../repositories/tindak-lanjut.repository.js'

export const TindakLanjutService = {
  async getByAduanId(aduanId: string) {
    return await TindakLanjutRepository.findByAduanId(aduanId)
  },

  async create(aduanId: string, data: any, user: any) {
    const actorName = await TindakLanjutRepository.getActorName(user.userId, user.email)
    return await TindakLanjutRepository.create(aduanId, data, user.userId, actorName)
  },

  async update(id: string, data: any) {
    return await TindakLanjutRepository.update(id, data)
  },

  async delete(id: string) {
    return await TindakLanjutRepository.delete(id)
  }
}
