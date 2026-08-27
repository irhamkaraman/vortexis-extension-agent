import React from 'react';
import { Play, RotateCcw, StopCircle } from 'lucide-react';
import { AgentStatus } from '../../core/types/agent';

interface ActionControlsProps {
  goal: string;
  onGoalChange: (goal: string) => void;
  onRunGoal: () => void;
  onReset: () => void;
  status: AgentStatus;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  goal,
  onGoalChange,
  onRunGoal,
  onReset,
  status,
}) => {
  const isRunning = status === 'analyzing' || status === 'planning' || status === 'executing';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (goal.trim() && !isRunning) {
      onRunGoal();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-md">
      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
        <span>Autonomous Goal Prompt</span>
        <span className="text-[10px] text-cyan-400 font-normal">SenseNova Agent Loop</span>
      </label>

      <textarea
        value={goal}
        onChange={(e) => onGoalChange(e.target.value)}
        placeholder="e.g. Find the search input, type 'VORTEXIS Chrome Extension', and click search button..."
        rows={3}
        disabled={isRunning}
        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none disabled:opacity-50"
      />

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!goal.trim() || isRunning}
          className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer"
        >
          {isRunning ? (
            <>
              <StopCircle className="w-3.5 h-3.5 animate-spin" />
              <span>{status.toUpperCase()}...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Execute Goal</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={isRunning}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all disabled:opacity-50"
          title="Reset Agent State"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
};
