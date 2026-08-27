import React from 'react';
import { Database, FileText, Sparkles } from 'lucide-react';

interface RAGStatusBadgeProps {
  documentsCount: number;
  chunksCount: number;
  onIngestClick: () => void;
  isIngesting: boolean;
}

export const RAGStatusBadge: React.FC<RAGStatusBadgeProps> = ({
  documentsCount,
  chunksCount,
  onIngestClick,
  isIngesting,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
          <Database className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-200">In-Memory RAG Engine</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-slate-500" /> {documentsCount} Tabs
            </span>
            <span>•</span>
            <span>{chunksCount} Vector Chunks</span>
          </p>
        </div>
      </div>

      <button
        onClick={onIngestClick}
        disabled={isIngesting}
        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-[11px] font-medium text-cyan-300 hover:text-cyan-200 border border-cyan-500/20 transition-all flex items-center gap-1.5 shadow-sm"
      >
        <Sparkles className={`w-3 h-3 ${isIngesting ? 'animate-spin' : ''}`} />
        {isIngesting ? 'Indexing...' : 'Index Active Tab'}
      </button>
    </div>
  );
};
