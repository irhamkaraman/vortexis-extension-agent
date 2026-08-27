import React, { useState, useRef } from 'react';
import { BackgroundToolExecutor } from '../background';
import { ChatMessage, FileAttachment, ToolName, TradeDetails } from '../core/types/agent';
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

  const handleSendMessage = async (text: string, attachments: FileAttachment[]) => {
    stopSignalRef.current = false;
    setPendingTradeApproval(null);

    // Format prompt text to include attachment contents if any
    let fullPromptText = text;
    if (attachments.length > 0) {
      const fileSummary = attachments
        .map((a) => `[File Attached: ${a.name} (${a.type})]\n${a.isImage ? '[Base64 Image Attached]' : a.content}`)
        .join('\n\n');
      fullPromptText = `${text}\n\n${fileSummary}`;
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      attachments,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      await autonomousPlanner.runSuperAgentLoop(
        fullPromptText,
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
        content: `LOG_ERROR: ${err.message || String(err)}`,
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
      content: `EXECUTE_QUICK_TOOL: ${toolName}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const toolRes = await selfHealingDriver.executeWithSelfHealing(toolName, {});
      const aiMsg: ChatMessage = {
        id: `msg-res-${Date.now()}`,
        role: 'assistant',
        content: `Executed tool **${toolName}**.`,
        toolCall,
        toolResult: toolRes,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `TOOL_FAILED: ${toolName} - ${err.message || String(err)}`,
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
    <div className="w-full h-screen bg-black text-neutral-100 flex flex-col font-sans select-none overflow-hidden">
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
