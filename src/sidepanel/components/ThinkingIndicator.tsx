import React from 'react';
import { Loader2, Terminal } from 'lucide-react';

interface ThinkingIndicatorProps {
  statusText?: string;
  thought?: string;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ statusText, thought }) => {
  return (
    <div className="flex flex-col my-2 items-start animate-in fade-in duration-200">
      <div className="flex items-center gap-1.5 mb-1 font-mono text-[9px] text-neutral-500">
        <span className="uppercase font-semibold text-neutral-400">VORTEXIS</span>
        <span>•</span>
        <span className="flex items-center gap-1 text-emerald-400">
          <Loader2 className="w-2.5 h-2.5 animate-spin" strokeWidth={2} />
          <span>THINKING</span>
        </span>
      </div>

      <div className="max-w-[92%] rounded-md p-3 text-xs bg-black border border-neutral-800 text-neutral-200 shadow-none space-y-2">
        <div className="flex items-center gap-2 text-neutral-400 font-mono text-[11px]">
          <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin" strokeWidth={1.5} />
          <span className="text-neutral-300 font-medium">{statusText || 'Analyzing request and scanning DOM...'}</span>
        </div>

        {thought && (
          <div className="p-2 bg-neutral-950 rounded border border-neutral-900 font-mono text-[10px] text-neutral-400 space-y-1">
            <div className="flex items-center gap-1 text-neutral-500 font-bold">
              <Terminal className="w-3 h-3 text-neutral-400" strokeWidth={1.5} />
              <span>THOUGHT_PROCESS:</span>
            </div>
            <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">{thought}</p>
          </div>
        )}
      </div>
    </div>
  );
};
