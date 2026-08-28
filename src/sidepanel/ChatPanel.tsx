import React, { useRef, useEffect, useState } from 'react';
import { Terminal } from 'lucide-react';
import { ChatMessage, TradeDetails } from '../core/types/agent';
import { MessageItem } from './components/MessageItem';
import { MinimalHeader } from './components/MinimalHeader';
import { PermissionModal } from './components/PermissionModal';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { TradeApprovalCard } from './components/TradeApprovalCard';

interface ChatPanelProps {
  messages: ChatMessage[];
  isThinking: boolean;
  isExecutingTool?: boolean;
  activeToolName?: string;
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
  isExecutingTool,
  activeToolName,
  onClearChat,
  onEmergencyStop,
  pendingTradeApproval,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [currentDomain, setCurrentDomain] = useState('active domain');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, isExecutingTool, pendingTradeApproval]);

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

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const latestThought = lastAssistantMsg?.thoughtProcess?.thought || lastAssistantMsg?.thoughtProcess?.current_observation;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black text-neutral-200 w-full max-w-full">
      {/* Minimal Header Bar */}
      <MinimalHeader
        onClearChat={onClearChat}
        onEmergencyStop={onEmergencyStop}
        onOpenPermissions={() => setShowPermissionModal(true)}
      />

      <PermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        currentDomain={currentDomain}
      />

      {/* Human Safety Gate Confirmation Panel */}
      {pendingTradeApproval && (
        <TradeApprovalCard
          tradePlan={pendingTradeApproval.tradePlan}
          onApprove={pendingTradeApproval.onApprove}
          onReject={pendingTradeApproval.onReject}
        />
      )}

      {/* Messages Stream Timeline */}
      <div className="vortexis-message-stream flex-1 overflow-y-auto px-3 py-3 space-y-2 w-full max-w-full overflow-x-hidden">
        {messages.length === 0 && !isThinking ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 p-6 space-y-4 font-mono">
            <div className="w-12 h-12 rounded-xl border border-neutral-800 bg-neutral-950 flex items-center justify-center text-neutral-400 shadow-lg shadow-emerald-500/5">
              <Terminal className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-200 text-xs tracking-wider uppercase mb-1">VORTEXIS COPILOT</h3>
              <p className="text-[11px] text-neutral-400 mt-1 max-w-xs leading-relaxed font-sans">
                Hai! Aku siap membantu. Mau otomasi browsing, isi form, analisis chart, atau cari data?
              </p>
              <p className="text-[10px] text-neutral-600 mt-2 max-w-xs leading-relaxed font-sans">
                Cukup ketik instruksi atau seret file ke sini — aku akan melakukan yang terbaik.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
        )}

        {/* Real-time Thinking & Tool Skeleton Stream Indicator */}
        {isThinking && (
          <ThinkingIndicator
            statusText={isExecutingTool ? `Menjalankan ${activeToolName}...` : 'Menyiapkan jawaban...'}
            thought={latestThought}
            isExecutingTool={isExecutingTool}
            activeToolName={activeToolName}
          />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
