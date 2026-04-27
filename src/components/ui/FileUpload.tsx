import React, { useEffect, useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, Trash2, FileText, Plus, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type FileUploadStatus = 'selected' | 'uploading' | 'success' | 'error';

export interface FileUploadItemState {
    fileName: string;
    status: FileUploadStatus;
    progress?: number;
    message?: string;
}

interface FileUploadProps {
    onFileSelected: (files: File[]) => void;
    onFileRemoved: (index: number) => void;
    label?: string;
    helperText?: string;
    accept?: string;
    maxSizeMB?: number;
    initialFiles?: File[];
    isLoading?: boolean;
    multiple?: boolean;
    uploadProgress?: number;
    fileStatuses?: FileUploadItemState[];
}

const EMPTY_FILES: File[] = [];

export const FileUpload: React.FC<FileUploadProps> = ({
    onFileSelected,
    onFileRemoved,
    label = "Unggah Berkas",
    helperText = "Klik atau seret file ke sini",
    accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
    maxSizeMB = 10,
    initialFiles,
    isLoading = false,
    multiple = false,
    uploadProgress,
    fileStatuses = []
}) => {
    const [files, setFiles] = useState<File[]>(() => initialFiles ?? EMPTY_FILES);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getDisplayStatus = (index: number): FileUploadItemState => {
        const file = files[index];
        const fallbackProgress = typeof uploadProgress === 'number' && uploadProgress > 0 && uploadProgress < 100
            ? uploadProgress
            : undefined;
        const explicitState = fileStatuses[index];

        if (explicitState) {
            return {
                fileName: explicitState.fileName || file?.name || `File ${index + 1}`,
                status: explicitState.status,
                progress: explicitState.progress,
                message: explicitState.message,
            };
        }

        if (fallbackProgress !== undefined) {
            return {
                fileName: file?.name || `File ${index + 1}`,
                status: 'uploading',
                progress: fallbackProgress,
            };
        }

        return {
            fileName: file?.name || `File ${index + 1}`,
            status: 'selected',
        };
    };

    const getStatusUi = (state: FileUploadItemState) => {
        switch (state.status) {
            case 'uploading':
                return {
                    label: state.progress && state.progress > 0 ? `Mengunggah ${state.progress}%` : 'Mengunggah',
                    className: 'text-primary',
                    icon: <Loader2 size={10} className="animate-spin" />,
                };
            case 'success':
                return {
                    label: 'Berhasil diunggah',
                    className: 'text-emerald-600',
                    icon: <CheckCircle2 size={10} />,
                };
            case 'error':
                return {
                    label: 'Gagal diunggah',
                    className: 'text-red-500',
                    icon: <AlertCircle size={10} />,
                };
            default:
                return {
                    label: 'Siap diunggah',
                    className: 'text-muted-foreground',
                    icon: <Upload size={10} />,
                };
        }
    };

    useEffect(() => {
        if (initialFiles !== undefined) {
            setFiles(initialFiles);
        }
    }, [initialFiles]);

    const applySelectedFiles = (incomingFiles: File[]) => {
        if (incomingFiles.length === 0) return;

        const invalidFile = incomingFiles.find(f => f.size > maxSizeMB * 1024 * 1024);
        if (invalidFile) {
            setError(`Ukuran file "${invalidFile.name}" melebihi ${maxSizeMB} MB.`);
            return;
        }

        setError(null);

        const newFiles = multiple ? [...files, ...incomingFiles] : [incomingFiles[0]];
        setFiles(newFiles);
        onFileSelected(newFiles);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const incomingFiles = Array.from(e.target.files || []);
        applySelectedFiles(incomingFiles);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const openFilePicker = () => {
        if (!isLoading) {
            fileInputRef.current?.click();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFilePicker();
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (isLoading) return;

        applySelectedFiles(Array.from(e.dataTransfer.files || []));

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeFile = (index: number, e: React.MouseEvent) => {
        if (isLoading) return;
        e.preventDefault();
        e.stopPropagation();

        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        onFileRemoved(index);

        if (newFiles.length === 0) {
            setError(null);
        }
    };

    return (
        <div className="w-full">
            {label && (
                <label className="mb-2 block px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
                    {label}
                </label>
            )}

            <div className={cn(
                "relative group transition-all duration-300 rounded-xl border-2 border-dashed overflow-hidden",
                error ? "border-red-200 bg-red-50/30" :
                    files.length > 0 ? "border-emerald-200 bg-emerald-50/20" :
                        "border-border hover:border-primary/40 bg-muted/30",
                isLoading && "opacity-75 cursor-not-allowed"
            )}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept={accept}
                    disabled={isLoading}
                    multiple={multiple}
                    className="sr-only"
                    tabIndex={-1}
                />

                {isLoading && (
                    <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="loading loading-spinner text-primary"></div>
                    </div>
                )}

                <div
                    role="button"
                    tabIndex={isLoading ? -1 : 0}
                    onClick={openFilePicker}
                    onKeyDown={handleKeyDown}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="flex cursor-pointer flex-col items-center justify-center space-y-2 p-5 text-center"
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-muted-foreground shadow-sm transition-colors group-hover:text-primary">
                        {multiple && files.length > 0 ? <Plus size={18} /> : <Upload size={18} />}
                    </div>
                    <div>
                        <p className="text-[0.92rem] font-semibold text-foreground/80">{files.length > 0 && multiple ? "Tambah Berkas Lainnya" : helperText}</p>
                        <p className="mt-0.5 text-[9px] font-medium text-muted-foreground">
                            Format: {accept.replace(/\./g, '').toUpperCase()} (Maks. {maxSizeMB}MB)
                        </p>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 space-y-2"
                    >
                        {files.map((file, idx) => (
                            (() => {
                                const state = getDisplayStatus(idx);
                                const statusUi = getStatusUi(state);

                                return (
                                    <motion.div
                                        key={`${file.name}-${idx}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="group relative rounded-xl border border-border bg-white p-3 shadow-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                                state.status === 'error' ? "bg-red-100 text-red-500" :
                                                    state.status === 'success' ? "bg-emerald-100 text-emerald-600" :
                                                        state.status === 'uploading' ? "bg-primary/10 text-primary" :
                                                            "bg-muted text-muted-foreground"
                                            )}>
                                                <FileText size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0 pr-8">
                                                <p className="truncate text-[11px] font-semibold text-foreground">{state.fileName}</p>
                                                <p className={cn("flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider", statusUi.className)}>
                                                    {statusUi.icon}
                                                    {statusUi.label}
                                                </p>
                                                {state.message && (
                                                    <p className={cn(
                                                        "mt-1 text-[10px] leading-relaxed",
                                                        state.status === 'error' ? "text-red-500" : "text-muted-foreground"
                                                    )}>
                                                        {state.message}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => removeFile(idx, e)}
                                                disabled={isLoading}
                                                className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-red-50 hover:text-red-500"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        {typeof state.progress === 'number' && state.progress > 0 && state.progress < 100 && (
                                            <div className="mt-2 space-y-1">
                                                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-300",
                                                            state.status === 'error' ? "bg-red-500" : "bg-primary"
                                                        )}
                                                        style={{ width: `${state.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })()
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Upload Progress Bar */}
            <AnimatePresence>
                {typeof uploadProgress === 'number' && uploadProgress > 0 && uploadProgress < 100 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 space-y-1"
                    >
                        <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                            <span>Mengunggah...</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-[10px] font-semibold text-red-500"
                    >
                        <AlertCircle size={14} />
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
