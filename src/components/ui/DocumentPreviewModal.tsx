import { Modal, Skeleton, Segmented } from 'antd';
import { X, Code, Eye } from 'lucide-react';
import { UserDocument } from '@/types/genericTypes';
import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';

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
      width={1100}
      centered
      className="rounded-[12px] overflow-hidden"
      closeIcon={<X className="w-5 h-5 text-[#666666]" />}
      styles={{
        body: {
          padding: 0,
        },
      }}
      destroyOnHidden
    >
      {document && (
        <DocumentPreviewContent document={document} />
      )}
    </Modal>
  );
}

function DocumentPreviewContent({ document }: { document: UserDocument }) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => {
    const textExtensions = ['.txt', '.log', '.json', '.js', '.ts', '.css', '.html', '.md'];
    const isActuallyText = ['text', 'csv'].includes(document.fileType) ||
      textExtensions.some(ext => document.fileName.toLowerCase().endsWith(ext));
    return !!(isActuallyText && document.fileUrl);
  });
  const [previewMode, setPreviewMode] = useState<PreviewMode>('rendered');

  const isHtmlMsg = useMemo(() => {
    const name = document.fileName.toLowerCase();
    return name.endsWith('.html') || (document.fileType === 'text' && name.endsWith('.html'));
  }, [document]);

  useEffect(() => {
    const textExtensions = ['.txt', '.log', '.json', '.js', '.ts', '.css', '.html', '.md'];
    const isActuallyText = ['text', 'csv'].includes(document.fileType) ||
      textExtensions.some(ext => document.fileName.toLowerCase().endsWith(ext));

    if (isActuallyText && document.fileUrl) {
      // setLoading(true); // Handled by initializer for initial mount
      fetch(document.fileUrl)
        .then(res => res.text())
        .then(text => {
          setTextContent(text);
          setLoading(false);
        })
        .catch(() => {
          setTextContent('Failed to load content.');
          setLoading(false);
        });
    }
  }, [document.fileUrl, document.fileName, document.fileType]);

  const renderPreview = () => {
    if (document.fileType === 'image') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#F9FAFB] rounded-lg overflow-hidden">
          <Image
            src={document.fileUrl}
            alt={document.fileName}
            width={800}
            height={600}
            className="max-w-full max-h-[82vh] object-contain"
          />
        </div>
      );
    }

    if (document.fileType === 'pdf') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#F9FAFB] rounded-lg overflow-hidden">
          <iframe
            src={document.fileUrl}
            className="w-full h-[82vh] border-0"
            title={document.fileName}
          />
        </div>
      );
    }

    if (loading) {
      return <Skeleton active paragraph={{ rows: 15 }} />;
    }

    if (textContent !== null) {
      if (isHtmlMsg && previewMode === 'rendered') {
        return (
          <div className="w-full h-full bg-white rounded-lg overflow-hidden border border-gray-200">
            <iframe
              srcDoc={textContent}
              className="w-full h-[82vh] border-0"
              title="HTML Preview"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        );
      }

      return (
        <div className="w-full h-full bg-[#F9FAFB] rounded-lg overflow-hidden border border-gray-200">
          <div className="max-h-[82vh] overflow-auto p-4 font-mono text-[12px] whitespace-pre-wrap selection:bg-blue-100">
            {textContent}
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#F9FAFB] rounded-lg p-8">
        <div className="text-center">
          <p className="text-[16px] font-['Manrope:SemiBold',sans-serif] text-[#111111] mb-2">
            {document.fileName}
          </p>
          <p className="text-[13px] text-[#666666] font-['Manrope:Regular',sans-serif] mb-4">
            Preview not available for this file type. Please download to view.
          </p>
          <a
            href={document.fileUrl}
            download={document.fileName}
            className="inline-block px-6 py-2 bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 text-white rounded-full text-[13px] font-['Manrope:SemiBold',sans-serif] transition-colors"
          >
            Download File
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-2 md:p-3">
      <div className="mb-2 px-2 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-[#111111] mb-0">
            {document.fileName}
          </h3>
          <p className="text-[11px] text-[#666666] font-medium uppercase tracking-wider">
            {document.documentTypeName}
          </p>
        </div>

        {isHtmlMsg && textContent !== null && (
          <Segmented<PreviewMode>
            options={[
              {
                label: (
                  <div className="flex items-center gap-2">
                    <Eye size={14} />
                    <span>Rendered</span>
                  </div>
                ),
                value: 'rendered',
              },
              {
                label: (
                  <div className="flex items-center gap-2">
                    <Code size={14} />
                    <span>Source</span>
                  </div>
                ),
                value: 'source',
              },
            ]}
            value={previewMode}
            onChange={(v) => setPreviewMode(v)}
            className="bg-[#F3F4F6]"
          />
        )}
      </div>
      {renderPreview()}
    </div>
  );
}
