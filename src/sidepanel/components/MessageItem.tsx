import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../../core/types/agent';
import { StealthLogCard } from './StealthLogCard';

interface MessageItemProps {
  message: ChatMessage;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';

  // Do not render empty AI message container if it's currently streaming in ThinkingIndicator
  if (!isUser && !message.content && !message.toolCall && !message.thoughtProcess) {
    return null;
  }

  return (
    <div className={`flex flex-col my-2 w-full max-w-full ${isUser ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-1.5 mb-1 font-mono text-[9px] text-neutral-500">
        <span className="uppercase font-semibold text-neutral-400">{isUser ? 'USER' : 'VORTEXIS'}</span>
        <span>•</span>
        <span>{message.timestamp}</span>
      </div>

      <div
        className={`w-full max-w-[95%] rounded-md p-3 text-xs shadow-none border overflow-hidden ${
          isUser
            ? 'bg-neutral-900 border-neutral-800 text-neutral-100 self-end'
            : 'bg-black border-neutral-800 text-neutral-200 self-start'
        }`}
      >
        {/* Message Content */}
        {message.content ? (
          <div className="prose prose-invert prose-xs leading-relaxed max-w-none break-words font-sans overflow-wrap-anywhere">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        ) : null}

        {/* Attachments rendering */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 pt-2 border-t border-neutral-800 space-y-1.5">
            <span className="text-[10px] text-neutral-500 font-mono block">ATTACHED_FILES:</span>
            <div className="flex flex-wrap gap-1.5">
              {message.attachments.map((att) => (
                <div key={att.id} className="bg-neutral-950 border border-neutral-800 px-2 py-1 rounded text-[10px] font-mono text-neutral-300">
                  {att.name} ({(att.size / 1024).toFixed(1)} KB)
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Embedded Tool Execution Card */}
        {message.toolCall && (
          <StealthLogCard
            toolName={message.toolCall.name}
            parameters={message.toolCall.parameters}
            result={message.toolResult}
          />
        )}
      </div>
    </div>
  );
};
