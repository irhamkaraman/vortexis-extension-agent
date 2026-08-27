import React, { useState, useRef } from 'react';
import { BackgroundToolExecutor } from '../background';
import { ChatMessage, ToolName, TradeDetails } from '../core/types/agent';
import { AutonomousPlanner } from '../modules/agent/AutonomousPlanner';
import { SelfHealingDriver } from '../modules/agent/SelfHealingDriver';
import { ToolRegistry } from '../modules/agent/ToolRegistry';
import { BrowserRAGStore } from '../modules/rag/BrowserRAGStore';
import { ChatPanelContainer } from './ChatPanel';
import { ChatInput } from './components/ChatInput';

const toolExecutor = new BackgroundToolExecutor();
const ragStore = new BrowserRAGStore();
const toolRegistry = new ToolRegistry(toolExecutor, ragStore);
const selfHealingDriver = new SelfHealingDriver(toolRegistry, toolExecutor);
const autonomousPlanner = new AutonomousPlanner(toolRegistry, selfHealingDriver);

export const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [pendingTradeApproval, setPendingTradeApproval] = useState<{
    tradePlan: TradeDetails;
    onApprove: () => void;
    onReject: () => void;
  } | null>(null);

  const stopSignalRef = useRef<boolean>(false);

  const handleSendMessage = async (text: string) => {
    stopSignalRef.current = false;
    setPendingTradeApproval(null);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      await autonomousPlanner.runSuperAgentLoop(
        text,
        [...messages, userMsg],
        (stepUpdateMsg: ChatMessage) => {
          setMessages((prev) => {
            const existingIdx = prev.findIndex((m) => m.id === stepUpdateMsg.id);
            if (existingIdx !== -1) {
              const updated = [...prev];
              updated[existingIdx] = stepUpdateMsg;
              return updated;
            }
            return [...prev, stepUpdateMsg];
          });
        },
        () => stopSignalRef.current,
        (tradePlan, onApprove, onReject) => {
          setPendingTradeApproval({
            tradePlan,
            onApprove: () => {
              setPendingTradeApproval(null);
              onApprove();
            },
            onReject: () => {
              setPendingTradeApproval(null);
              onReject();
            },
          });
        },
        12
      );
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Kendala Sistem Trading Copilot: ${err.message || String(err)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
      setPendingTradeApproval(null);
    }
  };

  const handleTriggerQuickTool = async (toolName: ToolName) => {
    stopSignalRef.current = false;
    setPendingTradeApproval(null);

    const toolCall = { name: toolName, parameters: {} };
    const userMsg: ChatMessage = {
      id: `msg-quick-${Date.now()}`,
      role: 'user',
      content: `Picu skill cepat: ${toolName}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const toolRes = await selfHealingDriver.executeWithSelfHealing(toolName, {});
      const aiMsg: ChatMessage = {
        id: `msg-res-${Date.now()}`,
        role: 'assistant',
        content: `Berhasil mengeksekusi skill **${toolName}**.`,
        toolCall,
        toolResult: toolRes,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Gagal mengeksekusi skill ${toolName}: ${err.message || String(err)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleClearChat = () => {
    stopSignalRef.current = true;
    setMessages([]);
    setIsThinking(false);
    setPendingTradeApproval(null);
  };

  const handleStop = () => {
    stopSignalRef.current = true;
    setIsThinking(false);
    setPendingTradeApproval(null);
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      <ChatPanelContainer
        messages={messages}
        isThinking={isThinking}
        onClearChat={handleClearChat}
        onEmergencyStop={handleStop}
        pendingTradeApproval={pendingTradeApproval}
      />
      <ChatInput
        onSendMessage={handleSendMessage}
        onTriggerQuickTool={handleTriggerQuickTool}
        onStop={handleStop}
        isThinking={isThinking}
      />
    </div>
  );
};
