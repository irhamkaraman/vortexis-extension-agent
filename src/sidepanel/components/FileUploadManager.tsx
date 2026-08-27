import React from 'react';
import { Code, FileText, Image as ImageIcon, X } from 'lucide-react';
import { FileAttachment } from '../../core/types/agent';

interface FileUploadManagerProps {
  attachments: FileAttachment[];
  onRemoveAttachment: (id: string) => void;
}

export const FileUploadManager: React.FC<FileUploadManagerProps> = ({ attachments, onRemoveAttachment }) => {
  if (attachments.length === 0) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (file: FileAttachment) => {
    if (file.isImage) return <ImageIcon className="w-3.5 h-3.5 text-neutral-300" strokeWidth={1.5} />;
    if (file.type.includes('json') || file.type.includes('javascript') || file.type.includes('typescript') || file.type.includes('code')) {
      return <Code className="w-3.5 h-3.5 text-neutral-300" strokeWidth={1.5} />;
    }
    return <FileText className="w-3.5 h-3.5 text-neutral-300" strokeWidth={1.5} />;
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-1 px-1 scrollbar-none border-b border-neutral-800/60 mb-1">
      {attachments.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-md text-[11px] font-mono text-neutral-300 shrink-0"
        >
          {getFileIcon(file)}
          <span className="max-w-[120px] truncate">{file.name}</span>
          <span className="text-[9px] text-neutral-500 font-sans">({formatFileSize(file.size)})</span>
          <button
            type="button"
            onClick={() => onRemoveAttachment(file.id)}
            className="p-0.5 text-neutral-500 hover:text-neutral-200 transition-colors"
          >
            <X className="w-3 h-3" strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  );
};
