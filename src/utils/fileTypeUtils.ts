import { UserDocument } from '@/types/domain';

/**
 * Centrally determines the file type based on filename and content type.
 * Supports all types in the UserDocument['fileType'] union.
 */
export const determineFileType = (
    fileName: string,
    contentType?: string
): UserDocument['fileType'] => {
    const ct = (contentType || '').toLowerCase();
    const name = (fileName || '').toLowerCase();

    // Images
    if (ct.startsWith('image/') ||
        /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|tif|avif|heic|heif|jfif|pjpeg|pjp|apng)$/i.test(name)) {
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

    // Code files
    if (/\.(js|ts|tsx|jsx|py|java|c|cpp|h|hpp|cs|php|rb|go|rs|swift|kt|scala|r|m|sh|bash|sql|dart|lua|perl|pl|vue|svelte|json|xml|yaml|yml)$/i.test(name)) {
        return 'code';
    }

    // Markup/Config files (rendered as text)
    if (/\.(html|md|css|scss|sass|less|ini|cfg|conf|log|txt)$/i.test(name) || ct.includes('text/')) {
        return 'text';
    }

    // Archives
    if (/\.(zip|rar|7z|tar|gz|bz2|xz|tgz|tbz2|zipx)$/i.test(name) || 
        ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'].includes(ct)) {
        return 'archive';
    }

    // Audio
    if (ct.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a|wma|opus|ape|alac)$/i.test(name)) {
        return 'audio';
    }

    // Video
    if (ct.startsWith('video/') || /\.(mp4|webm|avi|mov|wmv|flv|mkv|m4v|mpg|mpeg|3gp|ogv)$/i.test(name)) {
        return 'video';
    }

    // 3D & CAD files
    if (/\.(obj|fbx|stl|dae|gltf|glb|blend|3ds|max|dwg|dxf|step|stp|iges|igs)$/i.test(name)) {
        return '3d';
    }

    // Fonts
    if (/\.(ttf|otf|woff|woff2|eot)$/i.test(name) || ct.includes('font/')) {
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
};

/**
 * Ensures a filename is safe for download by removing invalid characters.
 */
export const safeFilename = (name?: string): string => {
    if (!name) return 'attachment';
    // Replace characters that are invalid in most file systems
    return name.replace(/[<>:"/\\|?*]/g, '_');
};
