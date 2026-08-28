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

  // Show thinking collapsible: expanded during streaming, collapsed after
  const [thinkingOpen, setThinkingOpen] = useState(Boolean(isStreaming));
  useEffect(() => {
    // Auto-collapse when streaming finishes
    if (!isStreaming && message.thinkingContent) {
      setThinkingOpen(false);
    }
  }, [isStreaming, message.thinkingContent]);

  // Do not render empty AI message container if it's currently streaming in ThinkingIndicator
  if (!isUser && !message.content && !message.toolCall && !message.thinkingContent) {
    return null;
  }

  // Tool calls and internal reasoning are intentionally never rendered.
  if (!isUser && message.toolCall) return null;

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
        {/* Thinking / Reasoning Section (Gemini-style collapsible) */}
        {!isUser && message.thinkingContent && (
          <div className="vortexis-thinking-section">
            <button type="button" className="vortexis-thinking-toggle-btn" onClick={() => setThinkingOpen((v) => !v)}>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" strokeWidth={1.5} />
              <span className="vortexis-thinking-toggle-label">{thinkingOpen ? 'Menyembunyikan proses berpikir' : 'Tampilkan proses berpikir'}</span>
              {thinkingOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
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

        {/* Embedded Tool Execution Card */}
      </div>
    </div>
  );
};
