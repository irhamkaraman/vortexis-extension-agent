import React from 'react';
import { Cpu, Settings, ShieldCheck, Zap } from 'lucide-react';

interface HeaderProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ apiKey, onApiKeyChange }) => {
  const [showSettings, setShowSettings] = React.useState(false);

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-3.5 text-white flex flex-col gap-2 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
            <Zap className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
              VORTEXIS
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-tight">Autonomous In-Browser AI Agent</p>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/50"
          title="SenseNova API Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {showSettings && (
        <div className="mt-2 p-3 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Cpu className="w-3.5 h-3.5" /> SenseNova LLM API
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
              sensenova-6.8-flash-lite
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">SenseNova API Key</label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder="Enter SenseNova API Key..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors pr-7"
              />
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 absolute right-2.5 top-2.5" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
