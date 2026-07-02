export const getZipEntryName = (fileName: string) => {
    const normalized = fileName.replace(/\\/g, '/')
    return normalized.split('/').pop() || 'Dokumen'
}
