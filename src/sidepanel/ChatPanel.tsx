import React, { useRef, useEffect, useState } from 'react';
import { Bot, LineChart, Shield, Trash2, Zap } from 'lucide-react';
import { ChatMessage, TradeDetails, TradingThoughtProcess } from '../core/types/agent';
import { MessageItem } from './components/MessageItem';
import { PermissionModal } from './components/PermissionModal';
import { TradeApprovalCard } from './components/TradeApprovalCard';

interface ChatPanelProps {
  messages: ChatMessage[];
  isThinking: boolean;
  onClearChat: () => void;
  onEmergencyStop: () => void;
  pendingTradeApproval?: {
    tradePlan: TradeDetails;
    onApprove: () => void;
    onReject: () => void;
  } | null;
}

export const ChatPanelContainer: React.FC<ChatPanelProps> = ({
  messages,
  isThinking,
  onClearChat,
  onEmergencyStop,
  pendingTradeApproval,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [currentDomain, setCurrentDomain] = useState('active domain');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, pendingTradeApproval]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          try {
            const url = new URL(tabs[0].url);
            setCurrentDomain(url.hostname);
          } catch {
            setCurrentDomain('domain');
          }
        }
      });
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* Minimalist Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-3 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
            <LineChart className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-xs tracking-wider bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
              VORTEXIS Trading Copilot
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${isThinking ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`}></span>
              <span className="text-[9px] text-slate-400 font-medium">
                {isThinking ? 'Analyzing Chart & Order...' : 'SenseNova 6.8 Vision Ready'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPermissionModal(true)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-all border border-slate-700/50"
            title="Site Security Permissions"
          >
            <Shield className="w-3.5 h-3.5" />
          </button>

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

      <PermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        currentDomain={currentDomain}
      />

      {/* Mandatory Trade Approval Gate Panel */}
      {pendingTradeApproval && (
        <TradeApprovalCard
          tradePlan={pendingTradeApproval.tradePlan}
          onApprove={pendingTradeApproval.onApprove}
          onReject={pendingTradeApproval.onReject}
        />
      )}

      {/* Messages Timeline */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <LineChart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200 text-sm">VORTEXIS Autonomous Web-Trading Copilot</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                Multi-Timeframe Vision Scanning (TradingView/Exchanges), Drawing Plotter, & Mandatory Trade Approval Gate.
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
