import bcrypt from 'bcryptjs'
import { UserRepository } from '../repositories/user.repository.js'

export const UserService = {
  async getAllUsers() {
    return await UserRepository.findAll()
  },

  async createUser(data: any) {
    const hash = await bcrypt.hash(data.password, 12)

    return await UserRepository.create({
      email: data.email,
      password_hash: hash,
      display_name: data.display_name,
      role: data.role || 'staf',
      phone: data.phone,
    })
  },

  async updateUser(id: string, data: any) {
    const updateData: any = {
      display_name: data.display_name,
      role: data.role,
      phone: data.phone,
      is_active: data.is_active,
    }

    // Logika Bisnis: Hash password jika ada perubahan password
    if (data.password) {
      updateData.password_hash = await bcrypt.hash(data.password, 12)
    }

    return await UserRepository.update(id, updateData)
  },

  async deleteUser(id: string) {
    return await UserRepository.delete(id)
  }
}
