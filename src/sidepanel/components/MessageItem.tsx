import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { ChatMessage } from '../../core/types/agent';
import { StealthLogCard } from './StealthLogCard';

interface MessageItemProps {
  message: ChatMessage;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Do not render empty AI message container if it's currently streaming in ThinkingIndicator
  if (!isUser && !message.content && !message.toolCall && !message.thoughtProcess) {
    return null;
  }

  if (!isUser && message.toolCall) {
    const result = message.toolResult;
    const completed = Boolean(result);
    const succeeded = result?.success;
    const thought = message.thoughtProcess?.thought || message.thoughtProcess?.current_observation;

    return (
      <div className="vortexis-agent-step my-1 w-full max-w-full">
        <button type="button" onClick={() => setDetailsOpen((open) => !open)} className="vortexis-step-toggle">
          <span className="flex items-center gap-2 min-w-0">
            {completed ? (succeeded ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />) : <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />}
            <span className="truncate">{message.toolCall.name.replaceAll('_', ' ')}</span>
          </span>
          {detailsOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
        </button>
        {detailsOpen && (
          <div className="vortexis-step-details">
            {thought && thought !== 'Direct response' && <p>{thought}</p>}
            {result?.error && <p className="text-red-400">{result.error}</p>}
            {result?.data && <pre>{typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}</pre>}
          </div>
        )}
      </div>
    );
  }

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
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
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
