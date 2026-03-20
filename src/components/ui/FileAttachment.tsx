'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Paperclip, X, FileText, Image as ImageIcon, FileSpreadsheet, Film, Music, Archive, Code, File } from 'lucide-react';
import { determineFileType } from '@/utils/fileTypeUtils';

// ─── Shared Utilities ────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(fileName: string) {
    const type = determineFileType(fileName);
    const cls = "w-4 h-4 text-[#999999]";
    switch (type) {
        case 'image': return <ImageIcon className={cls} />;
        case 'excel': case 'csv': return <FileSpreadsheet className={cls} />;
        case 'pdf': case 'docx': case 'text': return <FileText className={cls} />;
        case 'video': return <Film className={cls} />;
        case 'audio': return <Music className={cls} />;
        case 'archive': return <Archive className={cls} />;
        case 'code': return <Code className={cls} />;
        default: return <File className={cls} />;
    }
}

function isImageFile(file: File) {
    return file.type.startsWith('image/');
}

// ─── FileAttachmentInput ─────────────────────────────────────────────
// Compact attach bar with drag-and-drop. Used in forms/modals.

export interface FileAttachmentInputProps {
    files: File[];
    onChange: (files: File[]) => void;
    maxSizeMB?: number;
    /** 'total' = sum of all files, 'per-file' = each file individually */
    sizeMode?: 'total' | 'per-file';
    accept?: string;
    label?: string;
    hint?: string;
    onError?: (msg: string) => void;
    className?: string;
    disabled?: boolean;
}

export function FileAttachmentInput({
    files,
    onChange,
    maxSizeMB = 50,
    sizeMode = 'per-file',
    accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.jpeg,.jpg,.png',
    label = 'Attachments',
    hint,
    onError,
    className = '',
    disabled = false,
}: FileAttachmentInputProps) {
    const [isDragging, setIsDragging] = useState(false);
    const dragCountRef = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const defaultHint = useMemo(() => {
        if (hint) return hint;
        const exts = accept.split(',').map(e => e.replace('.', '')).filter(Boolean);
        const grouped = exts.length > 5
            ? exts.slice(0, 4).join(', ') + '...'
            : exts.join(', ');
        return `${grouped} \u00B7 ${maxSizeMB}MB max`;
    }, [hint, accept, maxSizeMB]);

    const validateAndAdd = useCallback((incoming: File[]) => {
        const maxBytes = maxSizeMB * 1024 * 1024;

        if (sizeMode === 'total') {
            const currentSize = files.reduce((a, f) => a + f.size, 0);
            const newSize = incoming.reduce((a, f) => a + f.size, 0);
            if (currentSize + newSize > maxBytes) {
                onError?.(`Total attachment size cannot exceed ${maxSizeMB}MB.`);
                return;
            }
        } else {
            const oversized = incoming.filter(f => f.size > maxBytes);
            if (oversized.length > 0) {
                onError?.(`File size must be less than ${maxSizeMB}MB. ${oversized.length} file(s) exceeded the limit.`);
                incoming = incoming.filter(f => f.size <= maxBytes);
                if (incoming.length === 0) return;
            }
        }

        const existingNames = new Set(files.map(f => f.name));
        const deduped = incoming.filter(f => !existingNames.has(f.name));
        if (deduped.length > 0) {
            onChange([...files, ...deduped]);
        }
    }, [files, onChange, maxSizeMB, sizeMode, onError]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            validateAndAdd(Array.from(e.target.files));
            e.target.value = '';
        }
    }, [validateAndAdd]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCountRef.current++;
        if (dragCountRef.current === 1) setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCountRef.current--;
        if (dragCountRef.current === 0) setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCountRef.current = 0;
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
            validateAndAdd(Array.from(e.dataTransfer.files));
        }
    }, [validateAndAdd]);

    const removeFile = useCallback((index: number) => {
        onChange(files.filter((_, i) => i !== index));
    }, [files, onChange]);

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#111111]">{label}</span>
                    {files.length > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#111111] text-white text-[10px] font-bold leading-none">
                            {files.length}
                        </span>
                    )}
                </div>
            )}

            {/* Attach bar with drag-and-drop */}
            <label
                className={`
                    border rounded-lg px-3 py-2 flex items-center gap-2 transition-all cursor-pointer bg-white group
                    ${isDragging
                        ? 'border-[#ff3b3b] bg-[#FFF5F5] border-solid shadow-[0_0_0_1px_rgba(255,59,59,0.2)]'
                        : 'border-dashed border-[#DDDDDD] hover:border-[#ff3b3b]/40 hover:bg-[#FFFAFA]'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onDragEnter={disabled ? undefined : handleDragEnter}
                onDragLeave={disabled ? undefined : handleDragLeave}
                onDragOver={disabled ? undefined : handleDragOver}
                onDrop={disabled ? undefined : handleDrop}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleInputChange}
                    accept={accept}
                    disabled={disabled}
                />
                <Paperclip className={`w-3.5 h-3.5 transition-colors ${isDragging ? 'text-[#ff3b3b]' : 'text-[#999999] group-hover:text-[#ff3b3b]'}`} />
                <span className={`text-xs font-medium transition-colors ${isDragging ? 'text-[#ff3b3b]' : 'text-[#666666] group-hover:text-[#111111]'}`}>
                    {isDragging ? 'Drop files here' : 'Attach files'}
                </span>
                <span className="text-xs text-[#BBBBBB] ml-auto">{defaultHint}</span>
            </label>

            {/* File preview grid */}
            {files.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {files.map((file, index) => (
                        <div
                            key={`${file.name}-${index}`}
                            className="border border-[#EEEEEE] rounded-lg p-2 bg-white flex items-center gap-2.5 group/file hover:border-[#DDDDDD] transition-colors"
                        >
                            {isImageFile(file) ? (
                                <ImagePreview file={file} />
                            ) : (
                                <div className="w-10 h-10 rounded bg-[#F7F7F7] flex items-center justify-center flex-shrink-0">
                                    {getFileIcon(file.name)}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-[#111111] truncate leading-tight">{file.name}</p>
                                <p className="text-xs text-[#999999] leading-tight mt-0.5">{formatFileSize(file.size)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover/file:opacity-100 hover:bg-[#FEE] transition-all flex-shrink-0"
                                title="Remove file"
                            >
                                <X className="w-3.5 h-3.5 text-[#999999] hover:text-[#ff3b3b]" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── FileChipList ────────────────────────────────────────────────────
// Compact inline chips for chat/email contexts.

export interface FileChipListProps {
    files: File[];
    onRemove: (index: number) => void;
    className?: string;
}

export function FileChipList({ files, onRemove, className = '' }: FileChipListProps) {
    if (files.length === 0) return null;

    return (
        <div className={`flex flex-wrap gap-1.5 ${className}`}>
            {files.map((file, i) => (
                <div
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-1.5 bg-white border border-[#EEEEEE] rounded-lg px-2 py-1 text-xs group/chip hover:border-[#DDDDDD] transition-colors"
                >
                    {isImageFile(file) ? (
                        <ImageChipPreview file={file} />
                    ) : (
                        <span className="flex-shrink-0">{getFileIcon(file.name)}</span>
                    )}
                    <span className="truncate max-w-[120px] text-[#333333] font-medium">{file.name}</span>
                    <span className="text-[#BBBBBB] text-[10px]">{formatFileSize(file.size)}</span>
                    <button
                        type="button"
                        onClick={() => onRemove(i)}
                        className="text-[#CCCCCC] hover:text-[#ff3b3b] transition-colors ml-0.5 flex-shrink-0"
                        title="Remove"
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ─── ChatFileAttachmentList ──────────────────────────────────────────
// Vertical list for chat panel contexts. Styled to match chat UI.

export interface ChatFileAttachmentListProps {
    files: File[];
    onRemove: (index: number) => void;
    className?: string;
}

export function ChatFileAttachmentList({ files, onRemove, className = '' }: ChatFileAttachmentListProps) {
    if (files.length === 0) return null;

    return (
        <div className={`space-y-1 ${className}`}>
            {files.map((file, index) => (
                <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#EEEEEE] group/file hover:border-[#DDDDDD] transition-colors"
                >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isImageFile(file) ? (
                            <ImageChipPreview file={file} size={24} />
                        ) : (
                            <span className="flex-shrink-0">{getFileIcon(file.name)}</span>
                        )}
                        <span className="text-xs text-[#333333] font-medium truncate">{file.name}</span>
                        <span className="text-[10px] text-[#BBBBBB] flex-shrink-0">{formatFileSize(file.size)}</span>
                    </div>
                    <button
                        onClick={() => onRemove(index)}
                        className="p-1 rounded-full hover:bg-[#FEE] transition-colors shrink-0 opacity-0 group-hover/file:opacity-100"
                        aria-label="Remove attachment"
                    >
                        <X className="w-3.5 h-3.5 text-[#999999] hover:text-[#ff3b3b]" />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ─── Internal: Image Previews ────────────────────────────────────────

function ImagePreview({ file }: { file: File }) {
    const [src, setSrc] = useState<string | null>(null);

    React.useEffect(() => {
        const url = URL.createObjectURL(file);
        setSrc(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    if (!src) return <div className="w-10 h-10 rounded bg-[#F7F7F7] flex-shrink-0" />;

    return (
        <img
            src={src}
            alt={file.name}
            className="w-10 h-10 rounded object-cover flex-shrink-0 bg-[#F7F7F7]"
        />
    );
}

function ImageChipPreview({ file, size = 16 }: { file: File; size?: number }) {
    const [src, setSrc] = useState<string | null>(null);

    React.useEffect(() => {
        const url = URL.createObjectURL(file);
        setSrc(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    if (!src) return <ImageIcon className="w-4 h-4 text-[#999999]" />;

    return (
        <img
            src={src}
            alt={file.name}
            className="rounded object-cover flex-shrink-0"
            style={{ width: size, height: size }}
        />
    );
}
