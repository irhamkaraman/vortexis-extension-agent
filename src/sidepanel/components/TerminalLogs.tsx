import React from 'react';
import { AlertCircle, CheckCircle2, Info, Terminal } from 'lucide-react';
import { AgentExecutionLog } from '../../core/types/agent';

interface TerminalLogsProps {
  logs: AgentExecutionLog[];
}

export const TerminalLogs: React.FC<TerminalLogsProps> = ({ logs }) => {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogIcon = (level: AgentExecutionLog['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />;
      case 'warn':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="flex-1 bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex flex-col font-mono text-[11px] overflow-hidden shadow-inner">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 text-slate-400 font-sans text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-slate-300">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Live Agent Execution Logs
        </span>
        <span className="text-[10px] text-slate-500">{logs.length} entries</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 font-sans text-xs italic">
            Waiting for goal execution...
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-slate-500 text-[10px] shrink-0 font-sans">{log.timestamp}</span>
              {getLogIcon(log.level)}
              <span
                className={
                  log.level === 'error'
                    ? 'text-rose-300'
                    : log.level === 'success'
                    ? 'text-emerald-300 font-semibold'
                    : log.level === 'warn'
                    ? 'text-amber-300'
                    : 'text-slate-300'
                }
              >
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
