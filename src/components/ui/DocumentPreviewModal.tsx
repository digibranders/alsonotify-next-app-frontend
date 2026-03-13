import { Modal, Skeleton, Segmented } from 'antd';
import { X, Code, Eye, FileText, FileSpreadsheet, Download, FileWarning } from 'lucide-react';
import { UserDocument } from '@/types/domain';
import { useEffect, useState, useMemo } from 'react';
import { sanitizeUrl } from '@/utils/sanitizeUrl';
import { sanitizeEmailHtml } from '@/utils/sanitizeHtml';
import { determineFileType } from '@/utils/fileTypeUtils';

type PreviewMode = 'rendered' | 'source';

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  document: UserDocument | null;
}

export function DocumentPreviewModal({ open, onClose, document }: DocumentPreviewModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(1100px, 95vw)"
      centered
      className="rounded-[12px] overflow-hidden"
      closeIcon={<X className="w-5 h-5 text-[#666666]" />}
      styles={{
        body: {
          padding: 0,
        },
      }}
      destroyOnClose
    >
      {document && (
        <DocumentPreviewContent document={document} />
      )}
    </Modal>
  );
}

const textFileTypes = ['text', 'code', 'csv'];

function DocumentPreviewContent({ document }: { document: UserDocument }) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => {
    const fileType = determineFileType(document.fileName, document.fileType);
    return !!((fileType === 'text' || fileType === 'code' || fileType === 'csv') && document.fileUrl);
  });
  const [previewMode, setPreviewMode] = useState<PreviewMode>('rendered');

  const fileType = useMemo(() => 
    determineFileType(document.fileName, document.fileType), 
  [document]);

  const isHtmlMsg = useMemo(() => {
    const name = document.fileName.toLowerCase();
    return name.endsWith('.html') || (fileType === 'text' && name.endsWith('.html'));
  }, [document.fileName, fileType]);

  const [lastUrl, setLastUrl] = useState<string | null>(null);

  // Synchronously update loading state when document changes to avoid FOUC and lint errors
  if (document.fileUrl !== lastUrl) {
    setLastUrl(document.fileUrl);
    const isText = (fileType === 'text' || fileType === 'code' || fileType === 'csv');
    if (isText && document.fileUrl) {
      setLoading(true);
    } else {
      setLoading(false);
      setTextContent(null);
    }
  }

  useEffect(() => {
    if ((fileType === 'text' || fileType === 'code' || fileType === 'csv') && document.fileUrl) {
      fetch(document.fileUrl)
        .then(res => res.text())
        .then(text => {
          setTextContent(text);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load text content:', err);
          setTextContent('Failed to load content.');
          setLoading(false);
        });
    }
  }, [document.fileUrl, fileType]);

  const renderPreview = () => {
    if (fileType === 'image') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#F9FAFB] rounded-lg overflow-hidden">
          {/* Using <img> instead of next/image for blob URL stability */}
          <img
            src={sanitizeUrl(document.fileUrl) || ""}
            alt={document.fileName}
            className="max-w-full max-h-[82vh] object-contain shadow-sm"
          />
        </div>
      );
    }

    if (fileType === 'pdf') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#F9FAFB] rounded-lg overflow-hidden">
          <iframe
            src={sanitizeUrl(document.fileUrl) || ""}
            className="w-full h-[82vh] border-0"
            title={document.fileName}
          />
        </div>
      );
    }

    if (fileType === 'docx') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#F9FAFB] rounded-lg p-12 text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <FileText size={40} />
          </div>
          <h3 className="text-xl font-bold text-[#111111] mb-2">Word Document</h3>
          <p className="text-sm text-[#666666] max-w-sm mb-6">
            Preview is not supported for Word files in the browser. Please download to view the full content.
          </p>
          <a
            href={sanitizeUrl(document.fileUrl) || ""}
            download={document.fileName}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#111111] hover:bg-[#333333] text-white rounded-full text-sm font-bold transition-all shadow-md active:scale-95"
          >
            <Download size={18} />
            Download {document.fileName}
          </a>
        </div>
      );
    }

    if (fileType === 'excel') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#F9FAFB] rounded-lg p-12 text-center">
          <div className="w-20 h-20 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <FileSpreadsheet size={40} />
          </div>
          <h3 className="text-xl font-bold text-[#111111] mb-2">Excel Spreadsheet</h3>
          <p className="text-sm text-[#666666] max-w-sm mb-6">
            Preview is not supported for Excel files in the browser. Please download to view the full content.
          </p>
          <a
            href={sanitizeUrl(document.fileUrl) || ""}
            download={document.fileName}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#111111] hover:bg-[#333333] text-white rounded-full text-sm font-bold transition-all shadow-md active:scale-95"
          >
            <Download size={18} />
            Download {document.fileName}
          </a>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="p-8">
          <Skeleton active paragraph={{ rows: 12 }} />
        </div>
      );
    }

    if (textFileTypes.includes(fileType) && textContent !== null) {
      if (isHtmlMsg && previewMode === 'rendered') {
        return (
          <div className="w-full h-full bg-white rounded-lg overflow-hidden border border-gray-100 italic">
            <iframe
              srcDoc={sanitizeEmailHtml(textContent, true)}
              className="w-full h-[82vh] border-0"
              title="HTML Preview"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        );
      }

      return (
        <div className="w-full h-full bg-[#FAFAFA] rounded-lg overflow-hidden border border-gray-100">
          <div className="max-h-[82vh] overflow-auto p-6 font-mono text-xs leading-relaxed text-[#333333] whitespace-pre-wrap selection:bg-blue-100 selection:text-blue-900">
            {textContent}
          </div>
        </div>
      );
    }

    // Default Fallback
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#F9FAFB] rounded-lg p-12 text-center">
        <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <FileWarning size={40} />
        </div>
        <h3 className="text-xl font-bold text-[#111111] mb-2">{document.fileName}</h3>
        <p className="text-sm text-[#666666] max-w-sm mb-6">
          Preview is not available for this file type ({fileType}). Please download to view.
        </p>
        <a
          href={sanitizeUrl(document.fileUrl) || ""}
          download={document.fileName}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#111111] hover:bg-[#333333] text-white rounded-full text-sm font-bold transition-all shadow-md active:scale-95"
        >
          <Download size={18} />
          Download File
        </a>
      </div>
    );
  };

  return (
    <div className="bg-white">
      <div className="h-16 px-6 border-b border-[#EEEEEE] flex items-center justify-between">
        <div className="min-w-0 mr-4">
          <h3 className="text-base font-bold text-[#111111] truncate mb-0.5" title={document.fileName}>
            {document.fileName}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-2xs font-bold text-white bg-[#ff3b3b] px-1.5 py-0.5 rounded uppercase tracking-wider">
              {fileType}
            </span>
            <span className="text-xs text-[#999999] font-medium">
              {document.documentTypeName}
            </span>
          </div>
        </div>

        {isHtmlMsg && textContent !== null && (
          <Segmented<PreviewMode>
            options={[
              {
                label: (
                  <div className="flex items-center gap-2 px-1">
                    <Eye size={14} />
                    <span>Rendered</span>
                  </div>
                ),
                value: 'rendered',
              },
              {
                label: (
                  <div className="flex items-center gap-2 px-1">
                    <Code size={14} />
                    <span>Source</span>
                  </div>
                ),
                value: 'source',
              },
            ]}
            value={previewMode}
            onChange={(v) => setPreviewMode(v)}
            className="bg-[#F3F4F6] p-1 rounded-lg"
          />
        )}
      </div>
      <div className="p-4 md:p-6 bg-white overflow-hidden">
        {renderPreview()}
      </div>
    </div>
  );
}

