import React, { useRef, useEffect } from 'react';
import { Bot, Trash2, Zap } from 'lucide-react';
import { ChatMessage, PlanStatus, ThoughtProcess } from '../core/types/agent';
import { ExecutionTracker } from './components/ExecutionTracker';
import { MessageItem } from './components/MessageItem';

interface ChatPanelProps {
  messages: ChatMessage[];
  isThinking: boolean;
  onClearChat: () => void;
  onEmergencyStop: () => void;
}

export const ChatPanelContainer: React.FC<ChatPanelProps> = ({
  messages,
  isThinking,
  onClearChat,
  onEmergencyStop,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Extract latest ReAct thought & plan status from history
  const latestMessageWithPlan = [...messages].reverse().find((m) => m.planStatus || m.thoughtProcess);
  const planStatus: PlanStatus | undefined = latestMessageWithPlan?.planStatus;
  const thoughtProcess: ThoughtProcess | undefined = latestMessageWithPlan?.thoughtProcess;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* Minimalist Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-3 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-xs tracking-wider bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
              VORTEXIS Super-Agent
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${isThinking ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`}></span>
              <span className="text-[9px] text-slate-400 font-medium">
                {isThinking ? 'Executing Agent Loop...' : 'SenseNova 6.8 Ready'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isThinking && (
            <button
              onClick={onEmergencyStop}
              className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-rose-200 text-[10px] font-bold transition-all animate-pulse"
              title="Hentikan Agen Instan"
            >
              Emergency Stop
            </button>
          )}

          <button
            onClick={onClearChat}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-all border border-slate-700/50"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Dynamic Multi-Step Execution Progress Tracker */}
      <ExecutionTracker planStatus={planStatus} thoughtProcess={thoughtProcess} isThinking={isThinking} />

      {/* Messages Timeline */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200 text-sm">VORTEXIS Super-Agent Autonomous Dashboard</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                Berikan tugas abstrak (contoh: "Carikan laptop harga 10-15 juta di halaman ini, bandingkan 3 teratas, lalu klik yang paling worth it").
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
