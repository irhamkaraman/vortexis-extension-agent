import React, { useState, useRef, useEffect } from 'react';
import { ArrowDown, Camera, FileText, Paperclip, Scan, Send, Square } from 'lucide-react';
import { FileAttachment, ToolName } from '../../core/types/agent';
import { FileUploadManager } from './FileUploadManager';

interface ChatInputProps {
  onSendMessage: (text: string, attachments: FileAttachment[]) => void;
  onTriggerQuickTool: (toolName: ToolName) => void;
  onStop: () => void;
  isThinking: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onTriggerQuickTool,
  onStop,
  isThinking,
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleFileChange = async (files: FileList | null) => {
    if (!files) return;

    const newAttachments: FileAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith('image/');

      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        if (isImage) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
        reader.onload = () => resolve(reader.result as string);
      });

      newAttachments.push({
        id: `file-${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        content,
        isImage,
      });
    }

    setAttachments((prev: FileAttachment[]) => [...prev, ...newAttachments]);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev: FileAttachment[]) => prev.filter((a: FileAttachment) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || attachments.length > 0) && !isThinking) {
      onSendMessage(input.trim(), attachments);
      setInput('');
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-black border-t border-neutral-800 p-3 flex flex-col gap-2 transition-colors ${
        isDragging ? 'bg-neutral-900 border-neutral-600' : ''
      }`}
    >
      {/* Universal Quick Action Chips (No Emojis) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] scrollbar-none font-mono">
        <button
          type="button"
          onClick={() => onTriggerQuickTool('capture_screen')}
          disabled={isThinking}
          className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-neutral-300 border border-neutral-800 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
        >
          <Camera className="w-3 h-3 text-neutral-400" strokeWidth={1.5} />
          <span>Screenshot</span>
        </button>

        <button
          type="button"
          onClick={() => onTriggerQuickTool('scan_dom_elements')}
          disabled={isThinking}
          className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-neutral-300 border border-neutral-800 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
        >
          <Scan className="w-3 h-3 text-neutral-400" strokeWidth={1.5} />
          <span>Scan DOM</span>
        </button>

        <button
          type="button"
          onClick={() => onTriggerQuickTool('scroll_page')}
          disabled={isThinking}
          className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-neutral-300 border border-neutral-800 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
        >
          <ArrowDown className="w-3 h-3 text-neutral-400" strokeWidth={1.5} />
          <span>Scroll Down</span>
        </button>

        <button
          type="button"
          onClick={() => onTriggerQuickTool('get_page_context')}
          disabled={isThinking}
          className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-neutral-300 border border-neutral-800 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
        >
          <FileText className="w-3 h-3 text-neutral-400" strokeWidth={1.5} />
          <span>Ingest Context</span>
        </button>
      </div>

      {/* Attachment Chips */}
      <FileUploadManager attachments={attachments} onRemoveAttachment={handleRemoveAttachment} />

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileChange(e.target.files)}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isThinking}
          className="absolute left-2.5 p-1 text-neutral-500 hover:text-neutral-200 transition-colors disabled:opacity-40 cursor-pointer"
          title="Attach files (Images, CSV, JSON, Code, PDF)"
        >
          <Paperclip className="w-4 h-4" strokeWidth={1.5} />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ketik instruksi atau seret file ke sini..."
          rows={1}
          disabled={isThinking}
          className="w-full bg-transparent border border-neutral-800 rounded-md py-2 pl-9 pr-9 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors resize-none disabled:opacity-50 font-sans"
        />

        {isThinking ? (
          <button
            type="button"
            onClick={onStop}
            className="absolute right-2 p-1 rounded bg-neutral-900 hover:bg-red-950 border border-red-800 text-red-400 transition-all cursor-pointer"
            title="Hentikan Eksekusi"
          >
            <Square className="w-3.5 h-3.5 fill-current" strokeWidth={1.5} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={(!input.trim() && attachments.length === 0) || isThinking}
            className="absolute right-2 p-1 rounded bg-white text-black hover:bg-neutral-200 disabled:opacity-30 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        )}
      </form>
    </div>
  );
};
