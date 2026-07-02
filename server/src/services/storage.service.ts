import path from 'path'
import { access, mkdir, rename, unlink } from 'fs/promises'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import {
  buildUploadPublicUrl,
  buildStoredUploadFileName,
  getAllowedUploadExtensions,
  getUploadCodeFromFileName,
  getUploadsRoot,
  isAllowedUploadExtension,
  resolveStoredUploadPathFromUrl,
  sanitizePathSegment,
} from '../lib/upload.js'
import { buildFileUrlWithNewName } from '../lib/upload-migration.js'

export const StorageService = {
  async saveAduanFile(
    file: File,
    rawAduanId: string,
    nomorTiket: string,
    category: string,
    documentDate: string | Date | null
  ) {
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

    const fileName = buildStoredUploadFileName(category || 'dokumen', ext, documentDate)
    const uploadDir = path.join(getUploadsRoot(), nomorTiketFolder)

    await mkdir(uploadDir, { recursive: true })
    
    const writePath = path.join(uploadDir, fileName)
    const writeStream = createWriteStream(writePath, { flags: 'wx' })

    try {
      await pipeline(file.stream() as any, writeStream)
    } catch (err: any) {
      if (err?.code === 'EEXIST') {
        throw new Error('Kode file bentrok. Silakan ulangi upload')
      }
      await unlink(writePath).catch(() => {})
      throw new Error('Gagal menyimpan file')
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`
    return {
      url: buildUploadPublicUrl(baseUrl, nomorTiketFolder, fileName),
      fileName,
      originalFileName: file.name,
    }
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

  async renameDocumentFiles(
    fileUrls: string[],
    category: string,
    documentDate: string | Date | null,
    persistUrls: (fileUrls: string[]) => Promise<void>
  ) {
    const plans = fileUrls.map((fileUrl) => {
      const sourcePath = resolveStoredUploadPathFromUrl(fileUrl)
      const currentFileName = path.basename(sourcePath)
      const extension = path.extname(currentFileName).slice(1).toLowerCase()
      if (!extension) throw new Error(`Ekstensi file tidak ditemukan: ${currentFileName}`)

      const code = getUploadCodeFromFileName(currentFileName) || undefined
      const targetFileName = buildStoredUploadFileName(category, extension, documentDate, code)
      const targetPath = path.join(path.dirname(sourcePath), targetFileName)

      return {
        sourcePath,
        targetPath,
        fileUrl,
        targetUrl: buildFileUrlWithNewName(fileUrl, targetFileName),
      }
    })

    const changedPlans = plans.filter((plan) => plan.sourcePath !== plan.targetPath)
    const uniqueTargets = new Set(changedPlans.map((plan) => plan.targetPath))
    if (uniqueTargets.size !== changedPlans.length) {
      throw new Error('Konflik nama target dokumen')
    }

    for (const plan of changedPlans) {
      await access(plan.sourcePath)
      const targetExists = await access(plan.targetPath).then(() => true).catch(() => false)
      if (targetExists) throw new Error(`Target file sudah ada: ${path.basename(plan.targetPath)}`)
    }

    const renamed: typeof changedPlans = []
    try {
      for (const plan of changedPlans) {
        await rename(plan.sourcePath, plan.targetPath)
        renamed.push(plan)
      }

      const nextUrls = plans.map((plan) => plan.targetUrl)
      await persistUrls(nextUrls)
      return nextUrls
    } catch (error) {
      for (const plan of renamed.reverse()) {
        await rename(plan.targetPath, plan.sourcePath).catch(() => {})
      }
      throw error
    }
  },
}
