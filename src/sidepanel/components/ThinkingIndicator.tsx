import React from 'react';
import { Loader2, Terminal } from 'lucide-react';

interface ThinkingIndicatorProps {
  statusText?: string;
  thought?: string;
  isExecutingTool?: boolean;
  activeToolName?: string;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  statusText,
  thought,
  isExecutingTool,
  activeToolName,
}) => {
  return (
    <div className="flex flex-col my-2 items-start animate-in fade-in duration-200 w-full max-w-full">
      <div className="flex items-center gap-1.5 mb-1 font-mono text-[9px] text-neutral-500">
        <span className="uppercase font-semibold text-neutral-400">VORTEXIS</span>
        <span>•</span>
        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
          <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-400" strokeWidth={2} />
          <span>{isExecutingTool ? `EXECUTING [${activeToolName || 'TOOL'}]` : 'THINKING'}</span>
        </span>
      </div>

      <div className="w-full rounded-md p-3 text-xs bg-black border border-neutral-800 text-neutral-200 space-y-2 overflow-hidden">
        {/* Animated Status Header */}
        <div className="flex items-center gap-2 text-neutral-300 font-mono text-[11px]">
          <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" strokeWidth={2} />
          <span className="font-medium truncate">
            {statusText || (isExecutingTool ? `Menjalankan tool ${activeToolName}...` : 'Menganalisis instruksi dan memindai halaman...')}
          </span>
        </div>

        {/* Skeleton Loading Lines - Rendered only when tool is executing or before response */}
        {isExecutingTool && (
          <div className="space-y-1.5 pt-1">
            <div className="h-1.5 bg-neutral-900 rounded animate-pulse w-3/4"></div>
            <div className="h-1.5 bg-neutral-900/80 rounded animate-pulse w-full"></div>
          </div>
        )}

        {/* Thought Process Monospace Box */}
        {thought && (
          <div className="p-2 bg-neutral-950 rounded border border-neutral-900 font-mono text-[10px] text-neutral-400 space-y-1 overflow-hidden">
            <div className="flex items-center gap-1 text-neutral-500 font-bold">
              <Terminal className="w-3 h-3 text-neutral-400 shrink-0" strokeWidth={1.5} />
              <span>REASONING:</span>
            </div>
            <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap break-words">{thought}</p>
          </div>
        )}
      </div>
    </div>
  );
};
