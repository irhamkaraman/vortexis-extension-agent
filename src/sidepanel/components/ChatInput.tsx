import React, { useState, useRef, useEffect } from 'react';
import { Camera, FileText, MoveVertical, Scan, Send, Square } from 'lucide-react';
import { ToolName } from '../../core/types/agent';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isThinking) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-slate-900/90 border-t border-slate-800 p-3 flex flex-col gap-2 shadow-2xl">
      {/* Quick Skill Action Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
        <button
          onClick={() => onTriggerQuickTool('capture_screen')}
          disabled={isThinking}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-pink-300 border border-slate-700/60 flex items-center gap-1 shrink-0 transition-colors"
        >
          <Camera className="w-3 h-3 text-pink-400" />
          <span>📸 Screenshot Tab</span>
        </button>

        <button
          onClick={() => onTriggerQuickTool('scan_dom_coordinates')}
          disabled={isThinking}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-cyan-300 border border-slate-700/60 flex items-center gap-1 shrink-0 transition-colors"
        >
          <Scan className="w-3 h-3 text-cyan-400" />
          <span>🔍 Analisis Elemen</span>
        </button>

        <button
          onClick={() => onTriggerQuickTool('scroll_page')}
          disabled={isThinking}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-emerald-300 border border-slate-700/60 flex items-center gap-1 shrink-0 transition-colors"
        >
          <MoveVertical className="w-3 h-3 text-emerald-400" />
          <span>📜 Scroll Down</span>
        </button>

        <button
          onClick={() => onTriggerQuickTool('get_page_context')}
          disabled={isThinking}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-blue-300 border border-slate-700/60 flex items-center gap-1 shrink-0 transition-colors"
        >
          <FileText className="w-3 h-3 text-blue-400" />
          <span>📖 Ingest Context</span>
        </button>
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ketik instruksi bebas atau pertanyaan..."
          rows={1}
          disabled={isThinking}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-3 pr-10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none disabled:opacity-50"
        />

        {isThinking ? (
          <button
            type="button"
            onClick={onStop}
            className="absolute right-2 p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md"
            title="Hentikan Eksekusi"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white transition-all shadow-md cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
      </form>
    </div>
  );
};
