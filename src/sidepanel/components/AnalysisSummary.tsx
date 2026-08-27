import React from 'react';
import { Bot, CheckCircle2, FileText, Sparkles } from 'lucide-react';
import { AgentGoalPlan } from '../../core/types/agent';

interface AnalysisSummaryProps {
  plan?: AgentGoalPlan;
  summaryText?: string;
}

export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({ plan, summaryText }) => {
  if (!plan && !summaryText) return null;

  return (
    <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3.5 flex flex-col gap-2 shadow-lg shadow-cyan-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="flex items-center gap-2 font-bold text-xs bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          <Bot className="w-4 h-4 text-cyan-400" /> VORTEXIS AI Analysis Summary
        </span>
        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40">
          <CheckCircle2 className="w-3 h-3" /> Analysis Complete
        </span>
      </div>

      {plan?.summary && (
        <div className="text-xs text-slate-200 leading-relaxed bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/80">
          <p className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Execution Strategy
          </p>
          {plan.summary}
        </div>
      )}

      {summaryText && (
        <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 rounded-lg p-2.5 border border-slate-800/50 space-y-1">
          <p className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3 text-blue-400" /> Extracted Insights
          </p>
          <div className="whitespace-pre-wrap font-sans text-slate-200">{summaryText}</div>
        </div>
      )}
    </div>
  );
};
