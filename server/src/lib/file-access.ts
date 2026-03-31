import { pool } from '../db.js'

type UploadTarget =
  | { type: 'profile'; userId: string }
  | { type: 'aduan'; nomorTiket: string }

type AuthenticatedUser = {
  userId: string
  role: string
}

export const classifyUploadPath = (relativePath: string): UploadTarget | null => {
  const parts = relativePath.split('/').filter(Boolean)
  if (parts.length < 2) return null

  if (parts[0] === 'profiles') {
    return { type: 'profile', userId: parts[1] }
  }

  return { type: 'aduan', nomorTiket: parts[0] }
}

export const canAccessUpload = async (relativePath: string, user: AuthenticatedUser) => {
  if (user.role === 'admin') return true

  const target = classifyUploadPath(relativePath)
  if (!target) return false

  if (target.type === 'profile') {
    return target.userId === user.userId
  }

  const result = await pool.query(
    'SELECT 1 FROM aduan WHERE nomor_tiket = $1 LIMIT 1',
    [target.nomorTiket]
  )

  return result.rowCount > 0
}
