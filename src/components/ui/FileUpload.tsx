import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, Trash2, FileText, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
}

export const FileUpload: React.FC<FileUploadProps> = ({
    onFileSelected,
    onFileRemoved,
    label = "Unggah Berkas",
    helperText = "Klik atau seret file ke sini",
    accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
    maxSizeMB = 10,
    initialFiles = [],
    isLoading = false,
    multiple = false,
    uploadProgress
}) => {
    const [files, setFiles] = useState<File[]>(initialFiles);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const incomingFiles = Array.from(e.target.files || []);
        if (incomingFiles.length === 0) return;

        // Size check for each file
        const invalidFile = incomingFiles.find(f => f.size > maxSizeMB * 1024 * 1024);
        if (invalidFile) {
            setError(`Ukuran file "${invalidFile.name}" melebihi ${maxSizeMB} MB.`);
            return;
        }

        setError(null);

        const newFiles = multiple ? [...files, ...incomingFiles] : [incomingFiles[0]];
        setFiles(newFiles);
        onFileSelected(newFiles);

        // Reset input so same file can be selected again if removed
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
                <label className="mb-2 block px-1 text-xs font-semibold uppercase tracking-wider text-foreground/80">
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
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                />

                {isLoading && (
                    <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="loading loading-spinner text-primary"></div>
                    </div>
                )}

                <div className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="h-10 w-10 rounded-xl border border-border bg-white text-muted-foreground shadow-sm transition-colors group-hover:text-primary">
                        {multiple && files.length > 0 ? <Plus size={20} /> : <Upload size={20} />}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground/80">{files.length > 0 && multiple ? "Tambah Berkas Lainnya" : helperText}</p>
                        <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
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
                            <motion.div
                                key={`${file.name}-${idx}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="relative flex items-center gap-3 rounded-xl border border-border bg-white p-3 shadow-sm group"
                            >
                                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                    <FileText size={16} />
                                </div>
                                <div className="flex-1 min-w-0 pr-8">
                                    <p className="truncate text-xs font-semibold text-foreground">{file.name}</p>
                                    <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-600">
                                        <CheckCircle2 size={10} />
                                        Terunggah
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => removeFile(idx, e)}
                                    disabled={isLoading}
                                    className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-red-50 hover:text-red-500"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </motion.div>
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
