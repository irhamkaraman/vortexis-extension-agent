import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '../../core/types/agent';
import { ChatMessageItem } from './ChatMessage';

interface ChatContainerProps {
  messages: ChatMessage[];
  isThinking: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ messages, isThinking }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <span className="text-xl font-bold">V</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-200 text-sm">VORTEXIS Conversational AI Copilot</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
              Tanyakan sesuatu tentang halaman web ini, atau minta AI melakukan aksi otomatis (Scan, Click, Type, Capture Screenshot).
            </p>
          </div>
        </div>
      ) : (
        messages.map((msg) => <ChatMessageItem key={msg.id} message={msg} />)
      )}

      {isThinking && (
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl p-3 w-fit animate-pulse">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></span>
          </div>
          <span className="font-mono text-[11px] text-cyan-300">VORTEXIS reasoning & executing skills...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
