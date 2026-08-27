import React, { useRef, useEffect, useState } from 'react';
import { Terminal } from 'lucide-react';
import { ChatMessage, TradeDetails } from '../core/types/agent';
import { MessageItem } from './components/MessageItem';
import { MinimalHeader } from './components/MinimalHeader';
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
    <div className="flex-1 flex flex-col overflow-hidden bg-black text-neutral-200">
      {/* Minimal Header Bar */}
      <MinimalHeader
        isThinking={isThinking}
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
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin scrollbar-thumb-neutral-800">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 p-6 space-y-3 font-mono">
            <div className="w-10 h-10 rounded border border-neutral-800 bg-neutral-950 flex items-center justify-center text-neutral-400">
              <Terminal className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-200 text-xs tracking-wider uppercase">VORTEXIS COPILOT</h3>
              <p className="text-[11px] text-neutral-500 mt-1 max-w-xs leading-relaxed font-sans">
                Autonomous In-Browser AI Copilot & Universal Action Agent. Seret file atau beri instruksi untuk bantuan riset, otomasi, maupun analisis.
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
