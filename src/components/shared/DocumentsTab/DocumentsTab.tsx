'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Paperclip, FileText, Eye, Download, Loader2 } from 'lucide-react';
import { App } from 'antd';
import { DocumentPreviewModal } from '@/components/ui/DocumentPreviewModal';
import { UserDocument } from '@/types/domain';
import { fileService } from '@/services/file.service';
import { AttachmentObject } from '@/components/shared/ChatPanel';

export interface DocumentItem {
    name: string;
    uploadedBy: string;
    date: string;
    size: string;
    type: string;
    activityId: number;
    url: string;
    attachmentId: number; // Required for download
}

export interface ActivityItem {
    id: number;
    type: string;
    user: string;
    avatar: string;
    date: string;
    message: React.ReactNode;
    isSystem: boolean;
    attachments: (string | AttachmentObject)[];
    time?: string;
    category?: string;
    task?: string;
}

interface DocumentsTabProps {
    activityData: ActivityItem[];
}

export function DocumentsTab({ activityData }: DocumentsTabProps) {
    const { message } = App.useApp();
    const messageRef = useRef(message);

    useEffect(() => {
        messageRef.current = message;
    }, [message]);
    const [previewDoc, setPreviewDoc] = useState<UserDocument | null>(null);
    const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
    const [previewingIds, setPreviewingIds] = useState<Set<number>>(new Set());

    // File type detection utility - supports 100+ file formats
    const determineFileType = useCallback((
        fileName: string,
        contentType?: string
    ): UserDocument['fileType'] => {
        const ct = (contentType || '').toLowerCase();
        const name = fileName.toLowerCase();

        // Images (expanded to include WebP, AVIF, HEIC, RAW formats, etc.)
        if (ct.startsWith('image/') ||
            /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|tif|avif|heic|heif|jfif|pjpeg|pjp|apng|raw|cr2|nef|arw|dng)$/i.test(name)) {
            return 'image';
        }

        // PDFs
        if (ct === 'application/pdf' || name.endsWith('.pdf')) {
            return 'pdf';
        }

        // Word Documents
        if (ct.includes('word') || ct.includes('msword') || /\.(doc|docx|odt|rtf|pages)$/i.test(name)) {
            return 'docx';
        }

        // Excel Spreadsheets
        if (ct.includes('excel') || ct.includes('sheet') || /\.(xls|xlsx|ods|numbers)$/i.test(name)) {
            return 'excel';
        }

        // PowerPoint Presentations
        if (ct.includes('powerpoint') || ct.includes('presentation') || /\.(ppt|pptx|odp|key)$/i.test(name)) {
            return 'powerpoint';
        }

        // CSV
        if (ct.includes('csv') || name.endsWith('.csv')) {
            return 'csv';
        }

        // Code files (expanded)
        if (/\.(js|ts|tsx|jsx|py|java|c|cpp|h|hpp|cs|php|rb|go|rs|swift|kt|scala|r|m|sh|bash|sql|dart|lua|perl|pl|vue|svelte)$/i.test(name)) {
            return 'code';
        }

        // Markup/Config files (expanded)
        if (/\.(html|xml|json|yaml|yml|md|css|scss|sass|less|ini|cfg|conf)$/i.test(name)) {
            return 'text';
        }

        // Text files
        if (ct.includes('text') || /\.(txt|log)$/i.test(name)) {
            return 'text';
        }

        // Archives (expanded)
        if (/\.(zip|rar|7z|tar|gz|bz2|xz|tgz|tbz2|zipx)$/i.test(name)) {
            return 'archive';
        }

        // Audio (expanded)
        if (ct.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a|wma|opus|ape|alac)$/i.test(name)) {
            return 'audio';
        }

        // Video (expanded)
        if (ct.startsWith('video/') || /\.(mp4|webm|avi|mov|wmv|flv|mkv|m4v|mpg|mpeg|3gp|ogv)$/i.test(name)) {
            return 'video';
        }

        // 3D & CAD files
        if (/\.(obj|fbx|stl|dae|gltf|glb|blend|3ds|max|dwg|dxf|step|stp|iges|igs)$/i.test(name)) {
            return '3d';
        }

        // Fonts
        if (/\.(ttf|otf|woff|woff2|eot)$/i.test(name)) {
            return 'font';
        }

        // eBooks
        if (/\.(epub|mobi|azw|azw3)$/i.test(name)) {
            return 'ebook';
        }

        // Design files
        if (/\.(sketch|fig|xd|ai|psd|eps|indd)$/i.test(name)) {
            return 'design';
        }

        // Default fallback
        return 'text';
    }, []);

    // Aggregate all attachments from activity data
    const allDocuments: DocumentItem[] = activityData.flatMap(activity => {
        if (!activity.attachments || activity.attachments.length === 0) return [];

        return activity.attachments.map(file => {
            const isString = typeof file === 'string';

            if (isString) {
                // Legacy format - just a string filename
                return {
                    name: file,
                    uploadedBy: activity.user,
                    date: activity.date,
                    size: 'Unknown',
                    type: 'FILE',
                    activityId: activity.id,
                    url: '',
                    attachmentId: 0 // No ID available for legacy format
                };
            }

            // New format - full attachment object with proper typing
            const attachment = file as AttachmentObject;
            const sizeInKB = attachment.file_size ? (attachment.file_size / 1024).toFixed(1) : null;
            // Handle file_name potentially being undefined or null
            const fileName = attachment.file_name || 'Unknown';
            const fileExtension = fileName.includes('.') ? fileName.split('.').pop()?.toUpperCase() || 'FILE' : 'FILE';

            // Safely handle file_type
            const fileType = attachment.file_type
                ? (attachment.file_type.includes('/') ? attachment.file_type.split('/').pop()?.toUpperCase() || fileExtension : attachment.file_type.toUpperCase())
                : fileExtension;

            return {
                name: fileName,
                uploadedBy: activity.user,
                date: activity.date,
                size: sizeInKB ? `${sizeInKB} KB` : 'Unknown',
                type: fileType,
                activityId: activity.id,
                url: attachment.file_url || '',
                attachmentId: attachment.id
            };
        });
    });

    // Preview handler - uses backend service to fetch file
    const handlePreview = useCallback(async (doc: DocumentItem) => {
        if (!doc.attachmentId) {
            messageRef.current.warning('Preview not available for this file');
            return;
        }

        // Prevent duplicate previews
        if (previewingIds.has(doc.attachmentId)) {
            return;
        }

        // Set loading state
        setPreviewingIds(prev => new Set(prev).add(doc.attachmentId));

        try {
            // Get download URL from backend
            const downloadUrl = await fileService.getDownloadUrl(doc.attachmentId);

            if (!downloadUrl) {
                throw new Error('Download URL not received from server');
            }

            // Fetch the file as blob
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch file');
            }
            const blob = await response.blob();

            // Create object URL for preview
            const blobUrl = window.URL.createObjectURL(blob);

            // Determine file type
            const fileType = determineFileType(doc.name, doc.type);

            setPreviewDoc({
                id: String(doc.attachmentId),
                documentTypeId: 'requirement-attachment',
                documentTypeName: 'Requirement Attachment',
                fileName: doc.name,
                fileSize: parseInt(doc.size.replace(/[^\d]/g, '')) * 1024 || 0, // Convert KB back to bytes
                fileUrl: blobUrl, // Use blob URL instead of direct URL
                uploadedDate: new Date().toISOString(),
                fileType,
                isRequired: false,
            });
        } catch (error) {
            console.error('Preview error:', error);
            const errorMessage = error instanceof Error
                ? error.message
                : 'Failed to open preview';
            messageRef.current.error(errorMessage);
        } finally {
            // Clear loading state
            setPreviewingIds(prev => {
                const next = new Set(prev);
                next.delete(doc.attachmentId);
                return next;
            });
        }
    }, [determineFileType, previewingIds]);

    // Download handler with backend service
    const handleDownload = useCallback(async (doc: DocumentItem) => {
        if (!doc.attachmentId) {
            messageRef.current.error('Download not available - missing attachment ID');
            return;
        }

        // Prevent duplicate downloads
        if (downloadingIds.has(doc.attachmentId)) {
            return;
        }

        // Set loading state
        setDownloadingIds(prev => new Set(prev).add(doc.attachmentId));

        try {
            // Get signed download URL from backend
            const downloadUrl = await fileService.getDownloadUrl(doc.attachmentId);

            if (!downloadUrl) {
                throw new Error('Download URL not received from server');
            }

            // Create temporary anchor to trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = doc.name;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';

            document.body.appendChild(link);
            link.click();

            // Cleanup with slight delay to ensure download starts
            setTimeout(() => {
                document.body.removeChild(link);
            }, 100);

            messageRef.current.success(`Downloading ${doc.name}`);
        } catch (error) {
            console.error('Download error:', error);
            const errorMessage = error instanceof Error
                ? error.message
                : 'Failed to download file';
            messageRef.current.error(errorMessage);
        } finally {
            // Clear loading state
            setDownloadingIds(prev => {
                const next = new Set(prev);
                next.delete(doc.attachmentId);
                return next;
            });
        }
    }, [downloadingIds]);

    if (allDocuments.length === 0) {
        return (
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="bg-white rounded-[16px] p-8 border border-[#EEEEEE] shadow-sm">
                    <h3 className="text-base font-bold text-[#111111] mb-6 flex items-center gap-2">
                        <Paperclip className="w-5 h-5 text-[#ff3b3b]" />
                        Documents
                    </h3>
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-[#F7F7F7] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Paperclip className="w-8 h-8 text-[#999999]" />
                        </div>
                        <h4 className="text-base font-semibold text-[#111111] mb-2">No documents found</h4>
                        <p className="text-sm text-[#666666] font-normal max-w-sm mx-auto">
                            Files shared in the Activity & Chat section will automatically appear here.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="bg-white rounded-[16px] p-4 md:p-8 border border-[#EEEEEE] shadow-sm">
                    <h3 className="text-sm md:text-base font-bold text-[#111111] mb-4 md:mb-6 flex items-center gap-2">
                        <Paperclip className="w-4 h-4 md:w-5 md:h-5 text-[#ff3b3b]" />
                        Documents
                        <span className="text-[0.6875rem] md:text-xs font-normal text-[#999999] ml-1">
                            ({allDocuments.length})
                        </span>
                    </h3>

                    <div className="overflow-hidden rounded-[12px] border border-[#EEEEEE] bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-[#F7F7F7] border-b border-[#EEEEEE]">
                                        <th className="py-2 px-3 md:py-3 md:px-4 text-[0.625rem] md:text-xs font-bold text-[#666666] uppercase tracking-wider w-[40%] whitespace-nowrap">File Name</th>
                                        <th className="py-2 px-3 md:py-3 md:px-4 text-[0.625rem] md:text-xs font-bold text-[#666666] uppercase tracking-wider whitespace-nowrap">Sender</th>
                                        <th className="py-2 px-3 md:py-3 md:px-4 text-[0.625rem] md:text-xs font-bold text-[#666666] uppercase tracking-wider whitespace-nowrap">Size</th>
                                        <th className="py-2 px-3 md:py-3 md:px-4 text-[0.625rem] md:text-xs font-bold text-[#666666] uppercase tracking-wider whitespace-nowrap">Date</th>
                                        <th className="py-2 px-3 md:py-3 md:px-4 text-[0.625rem] md:text-xs font-bold text-[#666666] uppercase tracking-wider whitespace-nowrap">Type</th>
                                        <th className="py-2 px-3 md:py-3 md:px-4 text-[0.625rem] md:text-xs font-bold text-[#666666] uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allDocuments.map((doc, idx) => (
                                        <tr key={`${doc.activityId}-${idx}`} className="group hover:bg-[#FFF5F5]/50 transition-colors border-b border-[#EEEEEE] last:border-b-0">
                                            <td className="py-2 px-3 md:py-3 md:px-4">
                                                <div className="flex items-center gap-2 md:gap-3">
                                                    <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-[#FFF5F5] flex items-center justify-center text-[#ff3b3b] shrink-0">
                                                        <FileText className="w-3 h-3 md:w-4 md:h-4" />
                                                    </div>
                                                    <span className="text-[0.6875rem] md:text-[0.8125rem] font-semibold text-[#111111] truncate max-w-[150px] md:max-w-[200px]" title={doc.name}>
                                                        {doc.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-3 md:py-3 md:px-4">
                                                <span className="text-[0.6875rem] md:text-[0.8125rem] font-medium text-[#444444] whitespace-nowrap">{doc.uploadedBy}</span>
                                            </td>
                                            <td className="py-2 px-3 md:py-3 md:px-4">
                                                <span className="text-[0.6875rem] md:text-[0.8125rem] font-normal text-[#666666] whitespace-nowrap">{doc.size}</span>
                                            </td>
                                            <td className="py-2 px-3 md:py-3 md:px-4">
                                                <span className="text-[0.6875rem] md:text-[0.8125rem] font-normal text-[#666666] whitespace-nowrap">{doc.date}</span>
                                            </td>
                                            <td className="py-2 px-3 md:py-3 md:px-4">
                                                <span className="text-[0.5625rem] md:text-[0.6875rem] font-bold px-1.5 py-0.5 md:px-2 md:py-1 bg-[#F7F7F7] rounded text-[#666666] uppercase inline-block whitespace-nowrap">
                                                    {doc.type}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 md:py-3 md:px-4 text-right">
                                                <div className="flex items-center justify-end gap-1 md:gap-2">
                                                    <button
                                                        className="p-1 md:p-1.5 rounded hover:bg-[#F0F0F0] text-[#666666] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                        onClick={() => handlePreview(doc)}
                                                        disabled={!doc.attachmentId || previewingIds.has(doc.attachmentId)}
                                                        title={!doc.attachmentId ? "Preview not available" : previewingIds.has(doc.attachmentId) ? "Loading preview..." : "Preview"}
                                                        type="button"
                                                    >
                                                        {previewingIds.has(doc.attachmentId) ? (
                                                            <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                                                        ) : (
                                                            <Eye className="w-3 h-3 md:w-4 md:h-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        className="p-1 md:p-1.5 rounded hover:bg-[#FFF0F0] text-[#ff3b3b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                        onClick={() => handleDownload(doc)}
                                                        disabled={!doc.attachmentId || downloadingIds.has(doc.attachmentId)}
                                                        title={!doc.attachmentId ? "Download not available" : downloadingIds.has(doc.attachmentId) ? "Downloading..." : "Download"}
                                                        type="button"
                                                    >
                                                        {downloadingIds.has(doc.attachmentId) ? (
                                                            <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                                                        ) : (
                                                            <Download className="w-3 h-3 md:w-4 md:h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <DocumentPreviewModal
                open={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
                document={previewDoc}
            />
        </>
    );
}
