import { createHash } from 'node:crypto'

export const deriveStableUploadCode = (docId: string) => {
  const digest = createHash('sha1').update(docId).digest('hex').toUpperCase()
  return digest.replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

export const buildFileUrlWithNewName = (fileUrl: string, newFileName: string) => {
  const parsedUrl = new URL(fileUrl)
  parsedUrl.pathname = parsedUrl.pathname.replace(/\/[^/]+$/, `/${newFileName}`)
  parsedUrl.search = ''
  parsedUrl.hash = ''
  return parsedUrl.toString()
}

export const isModernUploadFileName = (fileName: string) =>
  /^\d{8}_[a-z0-9_]+_[a-z0-9]{6}\.[a-z0-9]+$/i.test(fileName)
