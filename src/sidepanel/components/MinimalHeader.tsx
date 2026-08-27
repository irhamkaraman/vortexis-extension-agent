import React from 'react';
import { Shield, Trash2 } from 'lucide-react';

interface MinimalHeaderProps {
  isThinking: boolean;
  onClearChat: () => void;
  onEmergencyStop: () => void;
  onOpenPermissions: () => void;
}

export const MinimalHeader: React.FC<MinimalHeaderProps> = ({
  isThinking,
  onClearChat,
  onEmergencyStop,
  onOpenPermissions,
}) => {
  return (
    <header className="bg-black border-b border-neutral-800 px-3.5 py-2.5 text-neutral-200 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 bg-white rounded-none border border-neutral-700"></div>
        <span className="font-mono font-bold text-xs tracking-wider text-neutral-300 uppercase">
          VORTEXIS
        </span>
        <div className="flex items-center gap-1.5 ml-2 border-l border-neutral-800 pl-2.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isThinking ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'}`}></span>
          <span className="text-[10px] text-neutral-400 font-mono">
            {isThinking ? 'Executing...' : 'Ready'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenPermissions}
          className="p-1.5 rounded-md bg-transparent hover:bg-neutral-900 text-neutral-400 hover:text-neutral-100 border border-neutral-800 transition-colors"
          title="Site Permissions"
        >
          <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>

        <button
          type="button"
          onClick={onClearChat}
          className="p-1.5 rounded-md bg-transparent hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800 transition-colors"
          title="Clear Chat History"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
};
