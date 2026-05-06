import path from 'node:path'
import { randomBytes } from 'node:crypto'

const uploadRoot = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'))

const allowedExtensions = new Set([
  'pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'zip',
  'shp', 'dbf', 'prj', 'shx', 'mp3', 'm4a', 'wav', 'ogg', 'aac',
])

export const getUploadsRoot = () => uploadRoot

export const getAllowedUploadExtensions = () => Array.from(allowedExtensions)

export const isAllowedUploadExtension = (ext: string) => allowedExtensions.has(ext.toLowerCase())

export const sanitizePathSegment = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '')

export const normalizeUploadLabel = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'dokumen'

export const formatUploadDateStamp = (date = new Date(), timeZone = process.env.UPLOAD_TIMEZONE || 'Asia/Jakarta') => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value || '1970'
  const month = parts.find((part) => part.type === 'month')?.value || '01'
  const day = parts.find((part) => part.type === 'day')?.value || '01'

  return `${year}${month}${day}`
}

export const generateUploadCode = (length = 6) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = randomBytes(length)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('').slice(0, length)
}

export const buildStoredUploadFileName = (
  category: string,
  ext: string,
  date = new Date(),
  code = generateUploadCode()
) => `${formatUploadDateStamp(date)}_${normalizeUploadLabel(category)}_${code}.${ext.toLowerCase()}`

export const buildUploadPublicUrl = (baseUrl: string, ...segments: string[]) => {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  const normalizedSegments = segments.map((segment) => encodeURIComponent(segment))
  return `${normalizedBaseUrl}/uploads/${normalizedSegments.join('/')}`
}

export const resolveStoredUploadPathFromUrl = (fileUrl: string) => {
  const parsedUrl = new URL(fileUrl)
  const pathname = decodeURIComponent(parsedUrl.pathname)

  if (!pathname.startsWith('/uploads/')) {
    throw new Error('URL file tidak valid')
  }

  const relativePath = pathname.replace(/^\/uploads\//, '')
  const absolutePath = path.resolve(uploadRoot, relativePath)

  if (!absolutePath.startsWith(uploadRoot)) {
    throw new Error('Path file tidak valid')
  }

  return absolutePath
}
