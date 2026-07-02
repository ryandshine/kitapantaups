import { api, authorizedFetch } from './api'

type SkpYearsResponse = {
    years?: number[]
}

const getResponseError = async (response: Response) => {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    return payload?.error || 'Gagal membuat export SKP.'
}

const getDownloadFileName = (response: Response, year: number) => {
    const disposition = response.headers.get('content-disposition') || ''
    const matched = disposition.match(/filename="?([^";]+)"?/i)
    return matched?.[1] || `SKP_${year}.zip`
}

export const SkpReportService = {
    async getYears() {
        const response = await api.get<SkpYearsResponse>('/reports/skp/years')
        return (response.years || []).filter((year) => Number.isInteger(year))
    },

    async download(year: number) {
        const response = await authorizedFetch(`/reports/skp?year=${encodeURIComponent(year)}`)
        if (!response.ok) throw new Error(await getResponseError(response))

        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = getDownloadFileName(response, year)
        link.rel = 'noopener'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)

        return {
            fileName: link.download,
            totalFiles: Number(response.headers.get('x-skp-file-count') || 0),
        }
    },
}

