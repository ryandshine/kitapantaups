import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'
import * as XLSX from 'xlsx'
import {
  SKP_EXCEL_HEADERS,
  createSkpArchiveStream,
  createSkpSummaryWorkbookBuffer,
  createSkpWorkbookBuffer,
  getSkpQuarter,
  isSkpDocumentType,
  type SkpFileRecord,
} from './skp-report.js'

const execFileAsync = promisify(execFile)

const readRows = (buffer: Buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: false })
}

test('recognizes only SKP document types including the database BA label', () => {
  assert.equal(isSkpDocumentType('TL Surat Jawaban'), true)
  assert.equal(isSkpDocumentType('TL BA Pembahasan'), true)
  assert.equal(isSkpDocumentType('TL BA Rapat Pembahasan'), true)
  assert.equal(isSkpDocumentType('Surat/ND Internal'), false)
})

test('maps document calendar months to the correct quarter', () => {
  assert.equal(getSkpQuarter('2026-01-01').key, 'TW_I')
  assert.equal(getSkpQuarter('2026-03-31').key, 'TW_I')
  assert.equal(getSkpQuarter('2026-04-01').key, 'TW_II')
  assert.equal(getSkpQuarter('2026-07-01').key, 'TW_III')
  assert.equal(getSkpQuarter('2026-10-01').key, 'TW_IV')
  assert.equal(getSkpQuarter('2026-12-31').key, 'TW_IV')
})

test('creates an empty quarter workbook with headers and no placeholder row', () => {
  const rows = readRows(createSkpWorkbookBuffer(2026, 'TW_I', []))

  assert.deepEqual(rows, [SKP_EXCEL_HEADERS])
})

test('creates one spreadsheet row per uploaded file with mapped fields', () => {
  const record: SkpFileRecord = {
    documentType: 'TL Surat Jawaban',
    documentNumber: 'ND.12/2026',
    documentDate: '2026-01-15',
    complaintNumber: 'ADU26000001',
    institutionName: 'KTH Harapan',
    scheme: 'Hutan Kemasyarakatan',
    complainant: 'Budi',
    regency: 'Bogor',
    province: 'Jawa Barat',
    status: 'proses',
    fileName: '20260115_TLSuratJawaban_A7K29Q.pdf',
    fileUrl: 'https://api.example.com/uploads/ADU26000001/20260115_TLSuratJawaban_A7K29Q.pdf',
  }

  const rows = readRows(createSkpWorkbookBuffer(2026, 'TW_I', [record]))

  assert.deepEqual(rows[0], SKP_EXCEL_HEADERS)
  assert.deepEqual(rows[1], [
    '1',
    'TW I',
    'TL Surat Jawaban',
    'ND.12/2026',
    '15/01/2026',
    'ADU26000001',
    'KTH Harapan',
    'Hutan Kemasyarakatan',
    'Budi',
    'Bogor',
    'Jawa Barat',
    'proses',
    '20260115_TLSuratJawaban_A7K29Q.pdf',
  ])
})

test('summary workbook lists every record with its own quarter label', () => {
  const base = {
    documentNumber: '-', complaintNumber: 'ADU', institutionName: 'KTH',
    scheme: 'HKm', complainant: 'Budi', regency: 'Bogor', province: 'Jabar',
    status: 'proses', fileUrl: 'x',
  }
  const records: SkpFileRecord[] = [
    { ...base, documentType: 'TL Surat Jawaban', documentDate: '2026-02-10', fileName: 'a.pdf' },
    { ...base, documentType: 'TL Nota Dinas', documentDate: '2026-08-05', fileName: 'b.pdf' },
  ]

  const rows = readRows(createSkpSummaryWorkbookBuffer(2026, records))

  assert.deepEqual(rows[0], SKP_EXCEL_HEADERS)
  assert.equal(rows.length, 3)
  assert.deepEqual([rows[1][0], rows[1][1], rows[1][12]], ['1', 'TW I', 'a.pdf'])
  assert.deepEqual([rows[2][0], rows[2][1], rows[2][12]], ['2', 'TW III', 'b.pdf'])
})

test('creates all four quarter workbooks for a year without data', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'skp-empty-'))
  const zipPath = path.join(directory, 'SKP_2026.zip')

  try {
    const archive = createSkpArchiveStream(2026, [])
    await pipeline(archive, createWriteStream(zipPath))

    const { stdout } = await execFileAsync('unzip', ['-Z1', zipPath])
    assert.deepEqual(stdout.trim().split('\n').sort(), [
      'SKP_2026.xlsx',
      'TW_I/SKP_2026_TW_I.xlsx',
      'TW_II/SKP_2026_TW_II.xlsx',
      'TW_III/SKP_2026_TW_III.xlsx',
      'TW_IV/SKP_2026_TW_IV.xlsx',
    ])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('places a document and its spreadsheet row in the same quarter folder', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'skp-record-'))
  const documentName = '20260410_TLNotulaRapat_Q9T1Z7.pdf'
  const documentPath = path.join(directory, documentName)
  const zipPath = path.join(directory, 'SKP_2026.zip')
  await writeFile(documentPath, 'document-content')

  const record: SkpFileRecord & { filePath: string } = {
    documentType: 'TL Notula Rapat',
    documentNumber: 'NOT.10/2026',
    documentDate: '2026-04-10',
    complaintNumber: 'ADU26000002',
    institutionName: 'KTH Harapan',
    scheme: 'Hutan Kemasyarakatan',
    complainant: 'Budi',
    regency: 'Bogor',
    province: 'Jawa Barat',
    status: 'proses',
    fileName: documentName,
    fileUrl: `https://api.example.com/uploads/ADU26000002/${documentName}`,
    filePath: documentPath,
  }

  try {
    await pipeline(createSkpArchiveStream(2026, [record]), createWriteStream(zipPath))

    const { stdout } = await execFileAsync('unzip', ['-Z1', zipPath])
    const entries = stdout.trim().split('\n')
    assert.ok(entries.includes(`TW_II/${documentName}`))
    assert.ok(entries.includes('TW_II/SKP_2026_TW_II.xlsx'))

    const { stdout: workbookBinary } = await execFileAsync(
      'unzip',
      ['-p', zipPath, 'TW_II/SKP_2026_TW_II.xlsx'],
      { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 }
    )
    const rows = readRows(workbookBinary)
    assert.equal(rows[1][12], documentName)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
