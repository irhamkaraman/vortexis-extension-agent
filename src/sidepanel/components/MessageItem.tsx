import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { ChatMessage } from '../../core/types/agent';

interface MessageItemProps {
  message: ChatMessage;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  // Do not render empty AI message container if it's currently streaming in ThinkingIndicator
  if (!isUser && !message.content && !message.toolCall && !message.thoughtProcess) {
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
