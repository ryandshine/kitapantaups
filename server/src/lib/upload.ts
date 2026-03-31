import path from 'node:path'

const uploadRoot = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'))

const allowedExtensions = new Set([
  'pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'zip',
  'shp', 'dbf', 'prj', 'shx', 'mp3', 'm4a', 'wav', 'ogg', 'aac',
])

export const getUploadsRoot = () => uploadRoot

export const getAllowedUploadExtensions = () => Array.from(allowedExtensions)

export const isAllowedUploadExtension = (ext: string) => allowedExtensions.has(ext.toLowerCase())

export const sanitizePathSegment = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '')

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
