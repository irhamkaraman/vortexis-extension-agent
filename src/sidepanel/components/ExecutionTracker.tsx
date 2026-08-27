import React from 'react';
import { CheckCircle2, Circle, ListOrdered, Sparkles } from 'lucide-react';
import { PlanStatus, ThoughtProcess } from '../../core/types/agent';

interface ExecutionTrackerProps {
  planStatus?: PlanStatus;
  thoughtProcess?: ThoughtProcess;
  isThinking: boolean;
}

export const ExecutionTracker: React.FC<ExecutionTrackerProps> = ({
  planStatus,
  thoughtProcess,
  isThinking,
}) => {
  if (!planStatus && !thoughtProcess && !isThinking) return null;

  const currentStep = planStatus?.current_step || 1;
  const totalSteps = planStatus?.total_steps || 1;
  const progressPercent = Math.min(Math.round((currentStep / Math.max(totalSteps, 1)) * 100), 100);

  return (
    <div className="mx-3 my-2 bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3 shadow-lg shadow-cyan-500/10 text-xs animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <span className="flex items-center gap-1.5 font-bold text-xs bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" /> Autonomous Execution Progress
        </span>
        <span className="font-mono text-[10px] text-cyan-300 bg-cyan-950/80 border border-cyan-800/40 px-2 py-0.5 rounded-full font-semibold">
          Step {currentStep}/{totalSteps} ({progressPercent}%)
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800 mb-2.5">
        <div
          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {planStatus?.step_description && (
        <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 mb-2">
          <ListOrdered className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
          <span className="text-slate-200 font-medium text-[11px] leading-tight">
            {planStatus.step_description}
          </span>
        </div>
      )}

      {thoughtProcess && (
        <div className="font-mono text-[10px] text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-800/50 space-y-1">
          <div>
            <span className="text-slate-500">Observation: </span>
            <span className="text-slate-300">{thoughtProcess.current_observation}</span>
          </div>
          <div>
            <span className="text-slate-500">Evaluation: </span>
            <span className="text-emerald-400">{thoughtProcess.evaluation}</span>
          </div>
        </div>
      )}
    </div>
  );
};
