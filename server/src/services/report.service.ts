import { stat } from 'node:fs/promises'
import path from 'node:path'
import { ReportRepository, type SkpDatabaseRow } from '../repositories/report.repository.js'
import {
  createSkpArchiveStream,
  type SkpArchiveRecord,
} from '../lib/skp-report.js'
import { resolveStoredUploadPathFromUrl } from '../lib/upload.js'

export class SkpExportError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'SkpExportError'
    this.status = status
  }
}

const currentJakartaYear = () => Number(
  new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
  }).format(new Date())
)

const getFileNameFromUrl = (fileUrl: string) => {
  const parsedUrl = new URL(fileUrl)
  const fileName = path.basename(decodeURIComponent(parsedUrl.pathname))
  if (!fileName || fileName === '.' || fileName === '/') {
    throw new SkpExportError(`Nama file SKP tidak valid: ${fileUrl}`, 409)
  }
  return fileName
}

const mapDatabaseRow = (row: SkpDatabaseRow): SkpArchiveRecord => ({
  documentType: row.document_type,
  documentNumber: row.document_number,
  documentDate: row.document_date,
  complaintNumber: row.complaint_number,
  institutionName: row.institution_name,
  scheme: row.scheme,
  complainant: row.complainant,
  regency: row.regency,
  province: row.province,
  status: row.status,
  fileName: getFileNameFromUrl(row.file_url),
  fileUrl: row.file_url,
  filePath: resolveStoredUploadPathFromUrl(row.file_url),
})

export const ReportService = {
  async getSkpYears() {
    const range = await ReportRepository.findSkpYearRange()
    const currentYear = currentJakartaYear()
    const minYear = Math.min(range.min_year || currentYear, currentYear)
    const maxYear = Math.max(range.max_year || currentYear, currentYear)

    return Array.from(
      { length: maxYear - minYear + 1 },
      (_, index) => maxYear - index
    )
  },

  async createSkpExport(year: number) {
    const rows = await ReportRepository.findSkpFilesByYear(year)
    const records = rows.map(mapDatabaseRow)
    const missingFiles: string[] = []

    for (const record of records) {
      const fileStat = await stat(record.filePath).catch(() => null)
      if (!fileStat?.isFile()) missingFiles.push(record.fileName)
    }

    if (missingFiles.length > 0) {
      throw new SkpExportError(
        `${missingFiles.length} file SKP tidak ditemukan di storage: ${missingFiles.slice(0, 3).join(', ')}`,
        409
      )
    }

    return {
      fileName: `SKP_${year}.zip`,
      stream: createSkpArchiveStream(year, records),
      totalFiles: records.length,
    }
  },
}

