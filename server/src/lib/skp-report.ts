import { createReadStream } from 'node:fs'
import { PassThrough } from 'node:stream'
import { ZipArchive } from 'archiver'
import * as XLSX from 'xlsx'

export const SKP_DOCUMENT_TYPES = [
  'TL Surat Jawaban',
  'TL Nota Dinas',
  'TL Notula Rapat',
  'TL BA Pembahasan',
  'TL BA Rapat Pembahasan',
  'TL Berita Acara Evaluasi',
  'TL Surat Teguran',
] as const

const skpDocumentTypes = new Set<string>(SKP_DOCUMENT_TYPES)

export const SKP_EXCEL_HEADERS = [
  'Nomor',
  'Triwulan',
  'Jenis Dokumen',
  'Nomor Dokumen',
  'Tanggal Dokumen',
  'Nomor Aduan',
  'Nama KPS/Lembaga',
  'Skema',
  'Pengadu',
  'Kabupaten',
  'Provinsi',
  'Status',
  'Nama File',
]

export const SKP_QUARTERS = [
  { key: 'TW_I', label: 'TW I', startMonth: 1, endMonth: 3 },
  { key: 'TW_II', label: 'TW II', startMonth: 4, endMonth: 6 },
  { key: 'TW_III', label: 'TW III', startMonth: 7, endMonth: 9 },
  { key: 'TW_IV', label: 'TW IV', startMonth: 10, endMonth: 12 },
] as const

export type SkpQuarterKey = typeof SKP_QUARTERS[number]['key']

export type SkpFileRecord = {
  documentType: string
  documentNumber: string
  documentDate: string
  complaintNumber: string
  institutionName: string
  scheme: string
  complainant: string
  regency: string
  province: string
  status: string
  fileName: string
  fileUrl: string
}

export type SkpArchiveRecord = SkpFileRecord & {
  filePath: string
}

export const isSkpDocumentType = (value: string) => skpDocumentTypes.has(value.trim())

export const getSkpQuarter = (documentDate: string) => {
  const match = documentDate.match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (!match) throw new Error(`Tanggal dokumen SKP tidak valid: ${documentDate}`)

  const month = Number(match[1])
  const quarter = SKP_QUARTERS.find((item) => month >= item.startMonth && month <= item.endMonth)
  if (!quarter) throw new Error(`Tanggal dokumen SKP tidak valid: ${documentDate}`)
  return quarter
}

const formatDocumentDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return '-'
  return `${match[3]}/${match[2]}/${match[1]}`
}

export const createSkpWorkbookBuffer = (
  year: number,
  quarterKey: SkpQuarterKey,
  records: SkpFileRecord[]
) => {
  const quarter = SKP_QUARTERS.find((item) => item.key === quarterKey)
  if (!quarter) throw new Error(`Triwulan SKP tidak valid: ${quarterKey}`)

  const rows = records.map((record, index) => [
    index + 1,
    quarter.label,
    record.documentType,
    record.documentNumber || '-',
    formatDocumentDate(record.documentDate),
    record.complaintNumber || '-',
    record.institutionName || '-',
    record.scheme || '-',
    record.complainant || '-',
    record.regency || '-',
    record.province || '-',
    record.status || '-',
    record.fileName,
  ])

  const worksheet = XLSX.utils.aoa_to_sheet([SKP_EXCEL_HEADERS, ...rows])
  worksheet['!autofilter'] = { ref: `A1:M${Math.max(rows.length + 1, 1)}` }
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 12 },
    { wch: 30 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 36 },
    { wch: 28 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 16 },
    { wch: 48 },
  ]

  const workbook = XLSX.utils.book_new()
  workbook.Props = {
    Title: `SKP ${year} ${quarter.label}`,
    Subject: 'Rekap dokumen tindak lanjut KITAPANTAUPS',
    Author: 'KITAPANTAUPS',
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, quarter.label)

  return Buffer.from(XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true,
  }))
}

export const createSkpArchiveStream = (year: number, records: SkpArchiveRecord[]) => {
  const groupedRecords = new Map<SkpQuarterKey, SkpArchiveRecord[]>(
    SKP_QUARTERS.map((quarter) => [quarter.key, []])
  )
  const entryNames = new Set<string>()

  for (const record of records) {
    if (!isSkpDocumentType(record.documentType)) {
      throw new Error(`Jenis dokumen tidak termasuk SKP: ${record.documentType}`)
    }
    if (!record.documentDate.startsWith(`${year}-`)) {
      throw new Error(`Tanggal dokumen berada di luar tahun ${year}: ${record.documentDate}`)
    }

    const quarter = getSkpQuarter(record.documentDate)
    const entryName = `${quarter.key}/${record.fileName}`
    if (entryNames.has(entryName)) {
      throw new Error(`Nama file SKP duplikat: ${entryName}`)
    }
    entryNames.add(entryName)
    groupedRecords.get(quarter.key)?.push(record)
  }

  const output = new PassThrough()
  const archive = new ZipArchive({ zlib: { level: 6 } })
  archive.on('error', (error) => output.destroy(error))
  archive.pipe(output)

  for (const quarter of SKP_QUARTERS) {
    const quarterRecords = groupedRecords.get(quarter.key) || []
    archive.append(createSkpWorkbookBuffer(year, quarter.key, quarterRecords), {
      name: `${quarter.key}/SKP_${year}_${quarter.key}.xlsx`,
    })

    for (const record of quarterRecords) {
      archive.append(createReadStream(record.filePath), {
        name: `${quarter.key}/${record.fileName}`,
      })
    }
  }

  void archive.finalize().catch((error) => output.destroy(error))
  return output
}
