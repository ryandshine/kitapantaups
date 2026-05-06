import { api, API_URL, clearTokens, getAccessToken, refreshAccessToken } from './api';

export type UploadBatchProgress = {
    fileIndex: number;
    totalFiles: number;
    fileName: string;
    fileProgress: number;
    batchProgress: number;
    status: 'uploading' | 'success' | 'error';
    errorMessage?: string;
};

export type UploadedFileResult = {
    url: string;
    fileName: string;
};

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    return 'Terjadi kesalahan yang tidak diketahui';
};

const uploadToServer = async (
    file: File | Blob,
    category: string,
    aduanId: string,
    onProgress?: (percent: number) => void,
    allowRetry = true,
    tokenOverride?: string | null
): Promise<UploadedFileResult> => {
    if (!aduanId) throw new Error('aduanId wajib diisi untuk upload file');

    const token = tokenOverride ?? getAccessToken();
    const formData = new FormData();
    const fileName = file instanceof File ? file.name : `${category}-${Date.now()}.bin`;
    formData.append('file', file, fileName);
    formData.append('category', category);
    formData.append('aduan_id', aduanId);

    try {
        return await new Promise((resolve, reject) => {
            const rejectWithError = (message: string, status?: number) => {
                const error = new Error(message) as Error & { status?: number };
                error.status = status;
                reject(error);
            };

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_URL}/aduan/upload`);
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && onProgress) {
                    onProgress(Math.round((event.loaded / event.total) * 100));
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        if (!data?.url) rejectWithError('URL file upload tidak ditemukan', xhr.status);
                        else resolve({
                            url: data.url,
                            fileName: typeof data.fileName === 'string'
                                ? data.fileName
                                : typeof data.file_name === 'string'
                                    ? data.file_name
                                    : fileName,
                        });
                    } catch {
                        rejectWithError('Respons tidak valid dari server', xhr.status);
                    }
                } else {
                    try {
                        const err = JSON.parse(xhr.responseText);
                        rejectWithError(err.error || 'Gagal upload file', xhr.status);
                    } catch {
                        rejectWithError(`Gagal upload file: ${xhr.statusText}`, xhr.status);
                    }
                }
            };

            xhr.onerror = () => rejectWithError('Gagal terhubung ke server');
            xhr.send(formData);
        });
    } catch (error) {
        const uploadError = error as Error & { status?: number };
        if (uploadError.status === 401 && allowRetry) {
            const nextAccessToken = await refreshAccessToken();
            if (nextAccessToken) {
                return uploadToServer(file, category, aduanId, onProgress, false, nextAccessToken);
            }
            clearTokens();
            throw new Error('Sesi login habis. Silakan login ulang.');
        }
        throw uploadError;
    }
};

export const uploadAduanDocument = (file: File | Blob, aduanId: string, onProgress?: (percent: number) => void) =>
    uploadToServer(file, 'dokumen', aduanId, onProgress);

export const uploadAduanSuratMasuk = (file: File | Blob, aduanId: string, onProgress?: (percent: number) => void) =>
    uploadToServer(file, 'surat_masuk', aduanId, onProgress).then((result) => result.url);

export const uploadAduanTindakLanjut = (file: File | Blob, aduanId: string, onProgress?: (percent: number) => void) =>
    uploadToServer(file, 'tindak_lanjut', aduanId, onProgress).then((result) => result.url);

export const uploadAdditionalAduanDocuments = async (
    aduanId: string,
    files: File[],
    onProgress?: (progress: UploadBatchProgress) => void
): Promise<{ errors: string[] }> => {
    const errors: string[] = [];

    for (const [index, file] of files.entries()) {
        try {
            onProgress?.({
                fileIndex: index,
                totalFiles: files.length,
                fileName: file.name,
                fileProgress: 0,
                batchProgress: Math.round((index / files.length) * 100),
                status: 'uploading',
            });

            const uploadedFile = await uploadAduanDocument(file, aduanId, (percent) => {
                onProgress?.({
                    fileIndex: index,
                    totalFiles: files.length,
                    fileName: file.name,
                    fileProgress: percent,
                    batchProgress: Math.round((index / files.length) * 100 + (percent / files.length)),
                    status: 'uploading',
                });
            });

            await api.post(`/aduan/${aduanId}/documents`, {
                file_url: uploadedFile.url,
                file_name: uploadedFile.fileName,
                file_category: 'dokumen',
            });

            onProgress?.({
                fileIndex: index,
                totalFiles: files.length,
                fileName: file.name,
                fileProgress: 100,
                batchProgress: Math.round(((index + 1) / files.length) * 100),
                status: 'success',
            });
        } catch (error) {
            const message = getErrorMessage(error);
            errors.push(`${file.name}: ${message}`);
            onProgress?.({
                fileIndex: index,
                totalFiles: files.length,
                fileName: file.name,
                fileProgress: 0,
                batchProgress: Math.round(((index + 1) / files.length) * 100),
                status: 'error',
                errorMessage: message,
            });
        }
    }

    return { errors };
};
