import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, Square } from 'lucide-react';
import { FileAttachment, ToolName } from '../../core/types/agent';
import { FileUploadManager } from './FileUploadManager';

interface ChatInputProps {
  onSendMessage: (text: string, attachments: FileAttachment[]) => void;
  onTriggerQuickTool: (toolName: ToolName) => void;
  onStop: () => void;
  isBusy: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onTriggerQuickTool,
  onStop,
  isBusy,
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

  const readFiles = async (files: File[]) => {
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

  const handleFileChange = async (files: FileList | null) => {
    if (!files) return;
    await readFiles(Array.from(files));
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isBusy) return;
    const pastedFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (pastedFiles.length === 0) return;
    e.preventDefault();
    await readFiles(pastedFiles.map((file, index) => file.name
      ? file
      : new File([file], `pasted-file-${Date.now()}-${index}`, { type: file.type })));
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev: FileAttachment[]) => prev.filter((a: FileAttachment) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || attachments.length > 0) && !isBusy) {
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
      className={`vortexis-input-shell p-3 flex flex-col gap-2 transition-colors ${
        isDragging ? 'is-dragging' : ''
      }`}
    >
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
          disabled={isBusy}
          className="absolute left-2.5 p-1 text-neutral-500 hover:text-neutral-200 transition-colors disabled:opacity-40 cursor-pointer"
          title="Attach files (Images, CSV, JSON, Code, PDF)"
        >
          <Paperclip className="w-4 h-4" strokeWidth={1.5} />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder="Ketik instruksi atau seret file ke sini..."
          rows={1}
          disabled={isBusy}
          className="vortexis-command-input w-full rounded-xl py-2.5 pl-10 pr-12 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none transition-colors resize-none disabled:opacity-50 font-sans"
        />

        {isBusy ? (
          <button
            type="button"
            onClick={onStop}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-red-950/90 hover:bg-red-900 border border-red-700 text-red-400 transition-all cursor-pointer flex items-center gap-1"
            title="Hentikan Eksekusi"
          >
            <Square className="w-3.5 h-3.5 fill-current" strokeWidth={1.5} />
            <span className="text-[10px] font-mono">STOP</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim() && attachments.length === 0}
            className="absolute right-2 p-1.5 rounded-lg bg-neutral-100 text-neutral-950 hover:bg-white disabled:opacity-30 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        )}
      </form>
    </div>
  );
};
