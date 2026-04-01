import { SettingRepository } from '../repositories/setting.repository.js'

export const SettingService = {
  async getAllSettings() {
    const rows = await SettingRepository.findAll()
    const map: Record<string, string> = {}
    for (const row of rows) map[row.key] = row.value
    return map
  },

  async updateSetting(key: string, value: string, userId: string) {
    await SettingRepository.upsert(key, value, userId)
    return { key, value }
  }
}
