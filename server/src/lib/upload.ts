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

export const normalizeDocumentTypeLabel = (value: string) => {
  const words = value.trim().match(/[a-zA-Z0-9]+/g) || []
  if (words.length === 0) return 'Dokumen'

  return words
    .map((word) => {
      if (/^[A-Z0-9]+$/.test(word)) return word
      return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`
    })
    .join('')
}

// Kept as an alias for callers that only need a safe path label.
export const normalizeUploadLabel = normalizeDocumentTypeLabel

export type DocumentDateValue = string | Date | null | undefined

export const formatUploadDateStamp = (
  date: DocumentDateValue,
  timeZone = process.env.UPLOAD_TIMEZONE || 'Asia/Jakarta'
) => {
  if (typeof date === 'string') {
    const calendarDate = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!calendarDate) {
      throw new Error('Tanggal dokumen tidak valid')
    }

    const [, year, month, day] = calendarDate
    const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`)
    if (
      Number.isNaN(parsed.getTime())
      || parsed.getUTCFullYear() !== Number(year)
      || parsed.getUTCMonth() + 1 !== Number(month)
      || parsed.getUTCDate() !== Number(day)
    ) {
      throw new Error('Tanggal dokumen tidak valid')
    }

    return `${year}${month}${day}`
  }

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error('Tanggal dokumen wajib tersedia')
  }

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

export const getUploadCodeFromFileName = (fileName: string) =>
  fileName.match(/_([A-Z0-9]{6})\.[A-Z0-9]+$/i)?.[1]?.toUpperCase() || null

export const buildStoredUploadFileName = (
  category: string,
  ext: string,
  documentDate: DocumentDateValue,
  code = generateUploadCode()
) => `${formatUploadDateStamp(documentDate)}_${normalizeDocumentTypeLabel(category)}_${code}.${ext.toLowerCase()}`

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
