import { Modal, Skeleton, Segmented } from 'antd';
import { X, Code, Eye } from 'lucide-react';
import { UserDocument } from '@/types/domain';
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

    // Code files - dark theme with syntax highlighting ready
    if (document.fileType === 'code') {
      if (loading) {
        return <Skeleton active paragraph={{ rows: 15 }} />;
      }
      return (
        <div className="w-full h-full bg-[#1E1E1E] rounded-lg overflow-hidden">
          <div className="max-h-[82vh] overflow-auto p-6">
            <pre className="text-sm font-mono text-[#D4D4D4] whitespace-pre-wrap selection:bg-blue-600/30">
              <code>{textContent || 'Loading...'}</code>
            </pre>
          </div>
        </div>
      );
    }

    // Audio files
    if (document.fileType === 'audio') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#F9FAFB] rounded-lg p-8">
          <div className="max-w-2xl w-full">
            <div className="flex items-center gap-4 mb-6 justify-center">
              <div className="w-16 h-16 bg-[#ff3b3b]/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[#ff3b3b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-[#111111]">{document.fileName}</h3>
                <p className="text-sm text-[#666666]">Audio File</p>
              </div>
            </div>
            <audio controls className="w-full">
              <source src={document.fileUrl} />
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      );
    }

    // Video files
    if (document.fileType === 'video') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black rounded-lg p-4">
          <div className="max-w-4xl w-full">
            <video controls className="w-full rounded-lg">
              <source src={document.fileUrl} />
              Your browser does not support the video element.
            </video>
          </div>
        </div>
      );
    }

    // PowerPoint presentations
    if (document.fileType === 'powerpoint') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#F9FAFB] rounded-lg p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-[#D04A02]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#D04A02]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-[#111111]">PowerPoint Presentation</h3>
            <p className="text-sm text-[#666666] mb-4">Preview not available for PowerPoint files</p>
            <a
              href={document.fileUrl}
              download={document.fileName}
              className="inline-block px-6 py-2 bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 text-white rounded-full text-[13px] font-semibold transition-colors"
            >
              Download File
            </a>
          </div>
        </div>
      );
    }

    // Archive files
    if (document.fileType === 'archive') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#F9FAFB] rounded-lg p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-[#666666]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-[#111111]">Archive File</h3>
            <p className="text-sm text-[#666666] mb-4">Preview not available for archive files (.zip, .rar, .7z, etc.)</p>
            <a
              href={document.fileUrl}
              download={document.fileName}
              className="inline-block px-6 py-2 bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 text-white rounded-full text-[13px] font-semibold transition-colors"
            >
              Download File
            </a>
          </div>
        </div>
      );
    }

    // 3D & CAD files
    if (document.fileType === '3d') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#F9FAFB] rounded-lg p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-[#4A90E2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#4A90E2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-[#111111]">3D/CAD File</h3>
            <p className="text-sm text-[#666666] mb-4">Preview not available for 3D models and CAD files</p>
            <a
              href={document.fileUrl}
              download={document.fileName}
              className="inline-block px-6 py-2 bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 text-white rounded-full text-[13px] font-semibold transition-colors"
            >
              Download File
            </a>
          </div>
        </div>
      );
    }

    // Font files
    if (document.fileType === 'font') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#F9FAFB] rounded-lg p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-[#666666]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-[#111111]">Font File</h3>
            <p className="text-sm text-[#666666] mb-4">Preview not available for font files</p>
            <a
              href={document.fileUrl}
              download={document.fileName}
              className="inline-block px-6 py-2 bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 text-white rounded-full text-[13px] font-semibold transition-colors"
            >
              Download File
            </a>
          </div>
        </div>
      );
    }

    // eBook files
    if (document.fileType === 'ebook') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#F9FAFB] rounded-lg p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-[#8B4513]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#8B4513]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-[#111111]">eBook File</h3>
            <p className="text-sm text-[#666666] mb-4">Preview not available for eBook files (.epub, .mobi, etc.)</p>
            <a
              href={document.fileUrl}
              download={document.fileName}
              className="inline-block px-6 py-2 bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 text-white rounded-full text-[13px] font-semibold transition-colors"
            >
              Download File
            </a>
          </div>
        </div>
      );
    }

    // Design files
    if (document.fileType === 'design') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#F9FAFB] rounded-lg p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-[#FF6B6B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#FF6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-[#111111]">Design File</h3>
            <p className="text-sm text-[#666666] mb-4">Preview not available for design files (.sketch, .fig, .psd, etc.)</p>
            <a
              href={document.fileUrl}
              download={document.fileName}
              className="inline-block px-6 py-2 bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 text-white rounded-full text-[13px] font-semibold transition-colors"
            >
              Download File
            </a>
          </div>
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
