import path from 'path'
import { mkdir, unlink } from 'fs/promises'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { randomUUID } from 'crypto'
import {
  buildUploadPublicUrl,
  getAllowedUploadExtensions,
  getUploadsRoot,
  isAllowedUploadExtension,
  resolveStoredUploadPathFromUrl,
  sanitizePathSegment,
} from '../lib/upload.js'

export const StorageService = {
  async saveAduanFile(file: File, rawAduanId: string, nomorTiket: string, category: string = 'dokumen') {
    if (!file || typeof file === 'string') {
      throw new Error('File tidak valid')
    }

    const safeAduanId = sanitizePathSegment(rawAduanId)
    if (!safeAduanId) {
      throw new Error('aduan_id tidak valid')
    }

    const nomorTiketFolder = sanitizePathSegment(nomorTiket)
    if (!nomorTiketFolder) {
      throw new Error('nomor tiket tidak valid')
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!isAllowedUploadExtension(ext)) {
      throw new Error(`Tipe file tidak diizinkan. Gunakan: ${getAllowedUploadExtensions().join(', ')}`)
    }

    const safeCategory = sanitizePathSegment(category)
    const fileName = `${safeCategory}_${randomUUID()}.${ext}`
    const uploadDir = path.join(getUploadsRoot(), nomorTiketFolder)

    await mkdir(uploadDir, { recursive: true })
    
    const writePath = path.join(uploadDir, fileName)
    const writeStream = createWriteStream(writePath)

    try {
      await pipeline(file.stream() as any, writeStream)
    } catch (err) {
      await unlink(writePath).catch(() => {})
      throw new Error('Gagal menyimpan file')
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`
    return buildUploadPublicUrl(baseUrl, nomorTiketFolder, fileName)
  },

  async deleteFile(fileUrl: string) {
    try {
      const filePath = resolveStoredUploadPathFromUrl(fileUrl)
      await unlink(filePath).catch(() => {})
      return true
    } catch {
      return false
    }
  },
}
