import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { ChatMessage } from '../../core/types/agent';

interface MessageItemProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, isStreaming }) => {
  const isUser = message.role === 'user';
  const isIntermediate = !isUser && !message.content && (message.toolCall || message.toolResult || message.thinkingContent);

  // Show thinking collapsible: initially expanded if streaming
  const [thinkingOpen, setThinkingOpen] = useState(true);

  // Do not render empty AI message container if it's currently streaming in ThinkingIndicator
  if (!isUser && !message.content && !message.toolCall && !message.thinkingContent && !message.toolResult) {
    return null;
  }

  // Hide raw tool calls that have no result yet (unless they have thinking/content)
  if (!isUser && message.toolCall && !message.toolResult && !message.content && !message.thinkingContent) return null;

  const markdownSchema = {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames || []), 'u', 'mark'],
    attributes: {
      ...defaultSchema.attributes,
      a: ['href', 'title', 'target', 'rel'],
      code: ['className'],
    },
    protocols: {
      ...defaultSchema.protocols,
      href: ['http', 'https', 'mailto'],
    },
  };

  // -------------------------------------------------------------
  // INTERMEDIATE STEP RENDERING (Trajectory / Chain of Thought)
  // -------------------------------------------------------------
  if (isIntermediate) {
    return (
      <div className="vortexis-message-row vortexis-message-row-agent !mt-0 !mb-0 opacity-90">
        <div className="w-full flex flex-col pl-4 border-l-2 border-zinc-800 ml-4 py-1" style={{ background: 'linear-gradient(to bottom, #111111, transparent)' }}>
          {message.thinkingContent && (
            <div className="vortexis-thinking-section !mb-0">
              <button type="button" className="vortexis-thinking-toggle-btn" onClick={() => setThinkingOpen((v) => !v)}>
                <Sparkles className="w-3.5 h-3.5 text-yellow-500" strokeWidth={1.5} />
                <span className="vortexis-thinking-toggle-label">{thinkingOpen ? 'Menyembunyikan proses berpikir' : 'Tampilkan proses berpikir'}</span>
                {thinkingOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
              </button>
              {thinkingOpen && (
                <div className="vortexis-thinking-content">
                  {message.thinkingContent.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i} className="vortexis-thinking-line">{line}</p>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {message.toolResult && (
            <div className="flex items-center gap-2 text-[12px] text-zinc-400 pl-2 py-1 mt-1">
               <ChevronRight className="w-3 h-3 text-yellow-600" />
               <span className="font-mono text-yellow-500/80">{message.toolCall?.name || 'Executed Tool'}</span>
               <span className="opacity-60">{message.toolResult.success ? 'berhasil diselesaikan' : `gagal: ${message.toolResult.error || message.toolResult.warningMessage}`}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FINAL OR USER MESSAGE RENDERING
  // -------------------------------------------------------------
  return (
      <div className={`vortexis-message-row ${isUser ? 'vortexis-message-row-user' : 'vortexis-message-row-agent'}`}>
      <div className="vortexis-message-meta">
        <span>{isUser ? 'You' : 'VORTEXIS'}</span>
        <span>{message.timestamp}</span>
      </div>

      <div
        className={`vortexis-message-content ${
          isUser
            ? 'vortexis-user-bubble text-neutral-100'
            : 'vortexis-agent-content text-neutral-200'
        }`}
      >
        {/* Thinking / Reasoning Section for Final Message (if any) */}
        {!isUser && message.thinkingContent && (
          <div className="vortexis-thinking-section">
            <button type="button" className="vortexis-thinking-toggle-btn" onClick={() => setThinkingOpen((v) => !v)}>
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" strokeWidth={1.5} />
              <span className="vortexis-thinking-toggle-label">{thinkingOpen ? 'Menyembunyikan proses berpikir' : 'Tampilkan proses berpikir'}</span>
              {thinkingOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
            </button>
            {thinkingOpen && (
              <div className="vortexis-thinking-content">
                {message.thinkingContent.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i} className="vortexis-thinking-line">{line}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message Content */}
        {message.content ? (
          <div className="prose prose-invert prose-xs leading-relaxed max-w-none break-words font-sans overflow-wrap-anywhere">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[[rehypeRaw], [rehypeSanitize, markdownSchema]]}
              components={{
                a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer noopener" />,
                u: ({ node: _node, ...props }) => <u {...props} />,
                table: ({ node: _node, ...props }) => <div className="vortexis-markdown-table"><table {...props} /></div>,
                pre: ({ node: _node, ...props }) => <pre className="vortexis-markdown-code" {...props} />,
              }}
            >{message.content}</ReactMarkdown>
          </div>
        ) : null}

        {/* Attachments rendering */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="vortexis-attachments">
            <div className="flex flex-wrap gap-1.5">
              {message.attachments.map((att) => (
                <div key={att.id} className="vortexis-attachment-chip">
                  {att.name} ({(att.size / 1024).toFixed(1)} KB)
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Embedded Tool Execution Card (Fallback for final message) */}
        {message.toolResult && (
          <div className="mt-3 p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/50 text-xs text-slate-300 backdrop-blur-sm shadow-sm">
            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
               <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
               <span>Aksi Browser Selesai</span>
            </div>
            <div className="mt-1.5 opacity-90 font-mono text-[10px] leading-relaxed break-all">
               {message.toolResult.success ? (
                 <span className="text-emerald-400">Berhasil dieksekusi.</span>
               ) : (
                 <span className="text-rose-400">Gagal: {message.toolResult.error || message.toolResult.warningMessage}</span>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
