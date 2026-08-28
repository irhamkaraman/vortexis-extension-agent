import React, { useRef, useEffect, useState } from 'react';
import { Terminal } from 'lucide-react';
import { AgentActivityState, ChatMessage, TradeDetails } from '../core/types/agent';
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
  statusText?: string;
  onClearChat: () => void;
  onEmergencyStop: () => void;
  pendingTradeApproval?: {
    tradePlan: TradeDetails;
    onApprove: () => void;
    onReject: () => void;
  } | null;
  activity: AgentActivityState;
}

export const ChatPanelContainer: React.FC<ChatPanelProps> = ({
  messages,
  isThinking,
  isExecutingTool,
  activeToolName,
  statusText,
  onClearChat,
  onEmergencyStop,
  pendingTradeApproval,
  activity,
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


  return (
    <div className="vortexis-chat-panel flex-1 flex flex-col overflow-hidden text-neutral-200 w-full max-w-full">
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
            <div className="vortexis-welcome-mark"><Terminal className="w-5 h-5" strokeWidth={1.5} /></div>
            <div>
              <h3 className="vortexis-welcome-title">Halo, bos</h3>
              <p className="vortexis-welcome-subtitle">Apa yang ingin kita kerjakan hari ini?</p>
              <div className="vortexis-welcome-suggestions">
                <span>Ringkas halaman ini</span><span>Apa yang bisa kamu lakukan?</span><span>Bantu saya mengambil keputusan</span>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageItem key={msg.id} message={msg} isStreaming={isThinking && idx === messages.length - 1 && msg.role === 'assistant'} />
          ))
        )}

        {/* Real-time Thinking & Tool Skeleton Stream Indicator */}
        {isThinking && (
          <ThinkingIndicator
            activity={activity}
            statusText={statusText || (isExecutingTool ? 'Menjalankan langkah berikutnya...' : 'Menyiapkan jawaban...')}
            isExecutingTool={isExecutingTool}
            activeToolName={activeToolName}
          />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
