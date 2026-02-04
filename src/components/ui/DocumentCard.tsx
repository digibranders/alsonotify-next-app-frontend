import { useState } from 'react';
import { Eye, Download, Upload as UploadIcon, FileText, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';
import { UserDocument } from '@/types/genericTypes';

interface DocumentCardProps {
  document: UserDocument;
  onPreview: (document: UserDocument) => void;
  onDownload: (document: UserDocument) => void;
  showUpload?: boolean;
  onUpload?: (documentTypeId: string) => void;
}

export function DocumentCard({ document, onPreview, onDownload, showUpload, onUpload }: DocumentCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    const mb = (bytes / (1024 * 1024)).toFixed(1);
    return mb.replace(/\.0$/, '') + ' MB';
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return dateString;
    }
  };

  const getFileIcon = () => {
    const iconClass = "w-4 h-4 text-[#ff3b3b]";
    switch (document.fileType) {
      case 'image':
        return <ImageIcon className={iconClass} />;
      case 'csv':
      case 'excel':
        return <FileSpreadsheet className={iconClass} />;
      case 'pdf':
      case 'docx':
      case 'text':
      default:
        return <FileText className={iconClass} />;
    }
  };

  if (!document.fileUrl && showUpload && onUpload) {
    // Placeholder for missing document
    return (
      <div
        className="border border-[#EEEEEE] border-dashed rounded-lg p-3 bg-[#FAFAFA] hover:shadow-sm transition-all relative group cursor-pointer"
        onClick={() => onUpload(document.documentTypeId)}
      >
        <div className="flex items-center gap-3 pr-12">

          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-['Manrope:Medium',sans-serif] text-[#666666] leading-tight">
              Click to upload
            </p>
          </div>
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 right-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpload(document.documentTypeId);
            }}
            className="w-7 h-7 rounded-full bg-[#ff3b3b]/5 hover:bg-[#ff3b3b]/10 flex items-center justify-center transition-colors border border-[#ff3b3b]/40"
            title="Upload"
          >
            <UploadIcon className="w-3.5 h-3.5 text-[#ff3b3b]" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="border border-[#EEEEEE] rounded-lg p-3 bg-white hover:shadow-sm transition-all relative group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3 pr-16">
        <div className="flex-shrink-0 mt-0.5">
          {getFileIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-['Manrope:SemiBold',sans-serif] text-[#111111] mb-0.5 truncate leading-tight">
            {document.fileName}
          </p>
          <p className="text-[11px] text-[#666666] font-['Manrope:Regular',sans-serif] leading-tight">
            {formatFileSize(document.fileSize)} • {formatDate(document.uploadedDate)}
          </p>
        </div>
      </div>

      {/* Preview and Download buttons on hover */}
      {isHovered && (
        <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview(document);
            }}
            className="w-7 h-7 rounded-full bg-white hover:bg-[#F7F7F7] flex items-center justify-center transition-colors border border-[#EEEEEE] shadow-sm hover:border-[#DDDDDD]"
            title="Preview"
          >
            <Eye className="w-3.5 h-3.5 text-[#666666]" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(document);
            }}
            className="w-7 h-7 rounded-full bg-white hover:bg-[#F7F7F7] flex items-center justify-center transition-colors border border-[#EEEEEE] shadow-sm hover:border-[#DDDDDD]"
            title="Download"
          >
            <Download className="w-3 h-3 text-[#666666]" />
          </button>
        </div>
      )}
    </div>
  );
}


