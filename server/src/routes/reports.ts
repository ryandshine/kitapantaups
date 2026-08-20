import { Readable } from 'node:stream'
import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { ReportService, SkpExportError } from '../services/report.service.js'
import { SummaryService } from '../services/summary.service.js'

const reports = new Hono()
reports.use('*', requireAuth)

reports.get('/skp/years', async (c) => {
  const years = await ReportService.getSkpYears()
  return c.json({ years })
})

reports.get('/summary', async (c) => {
  const result = await SummaryService.getSummary()
  return c.json(result)
})

reports.get('/skp', async (c) => {
  const year = Number(c.req.query('year'))
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return c.json({ error: 'Tahun SKP tidak valid' }, 400)
  }

  try {
    const result = await ReportService.createSkpExport(year)
    return new Response(Readable.toWeb(result.stream) as ReadableStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-SKP-File-Count': String(result.totalFiles),
      },
    })
  } catch (error) {
    if (error instanceof SkpExportError) {
      return c.json({ error: error.message }, error.status as 400 | 409)
    }
    throw error
  }
})

export default reports
