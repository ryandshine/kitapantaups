import { ActivityRepository } from '../repositories/activity.repository.js'

export const ActivityService = {
  async getActivities(query: any) {
    const limit = Number(query.limit) || 20
    const aduanId = query.aduan_id

    return await ActivityRepository.findByAduanId(aduanId, limit)
  },

  async createActivity(data: any, user: any) {
    const actorName = await ActivityRepository.getActorName(user.userId, user.email)
    await ActivityRepository.create(
      data.type,
      data.description,
      data.aduan_id || null,
      user.userId,
      actorName,
      data.metadata || {}
    )
  }
}
