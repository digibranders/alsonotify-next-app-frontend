import { FileText, Image as ImageIcon, Sheet, File, ExternalLink } from 'lucide-react';
import { sanitizeUrl } from '@/utils/security/sanitizeUrl';
import type { TeamsChatMessageAttachment } from '@/services/teams';

interface TeamsAttachmentCardProps {
  attachment: TeamsChatMessageAttachment;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext)) return <FileText size={20} className="text-[#ff3b3b]" />;
  if (['doc', 'docx'].includes(ext)) return <FileText size={20} className="text-[#2F80ED]" />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <Sheet size={20} className="text-[#0F9D58]" />;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return <ImageIcon size={20} className="text-[#FFAB00]" />;
  return <File size={20} className="text-[#999999]" />;
}

function isLinkPreview(contentType: string): boolean {
  return (
    contentType.includes('reference') ||
    contentType.includes('thumbnail') ||
    contentType.includes('hero')
  );
}

interface LinkPreviewData {
  title?: string;
  text?: string;
  images?: Array<{ url: string }>;
}

function parseLinkPreview(content?: string): LinkPreviewData | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    return {
      title: parsed.title,
      text: parsed.text || parsed.subtitle,
      images: parsed.images,
    };
  } catch {
    return null;
  }
}

export function TeamsAttachmentCard({ attachment }: TeamsAttachmentCardProps) {
  const safeUrl = sanitizeUrl(attachment.contentUrl);

  if (isLinkPreview(attachment.contentType)) {
    const preview = parseLinkPreview(attachment.content);
    const title = preview?.title || attachment.name;
    const description = preview?.text;
    const imageUrl = preview?.images?.[0]?.url || attachment.thumbnailUrl;

    return (
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block border border-[#EEEEEE] rounded-xl overflow-hidden hover:bg-[#F7F7F7] transition-colors mt-2 max-w-sm no-underline"
      >
        {imageUrl && (
          <div className="w-full h-32 bg-[#F7F7F7] overflow-hidden">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-3">
          <p className="text-sm font-medium text-[#111111] truncate">{title}</p>
          {description && (
            <p className="text-xs text-[#666666] mt-1 line-clamp-2">{description}</p>
          )}
          <p className="text-xs text-[#999999] mt-1 truncate">{attachment.contentUrl}</p>
        </div>
      </a>
    );
  }

  // File attachment
  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 border border-[#EEEEEE] rounded-xl p-3 hover:bg-[#F7F7F7] transition-colors mt-2 max-w-sm no-underline"
    >
      <div className="w-10 h-10 rounded-lg bg-[#F7F7F7] flex items-center justify-center shrink-0">
        {getFileIcon(attachment.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#111111] truncate">{attachment.name}</p>
        <p className="text-xs text-[#999999]">
          {attachment.contentType.split('/').pop()?.toUpperCase() || 'File'}
        </p>
      </div>
      <ExternalLink size={14} className="text-[#999999] shrink-0" />
    </a>
  );
}
