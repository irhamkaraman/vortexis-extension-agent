import React, { useState, useRef, useEffect } from 'react';
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
const autonomousPlanner = new AutonomousPlanner(toolRegistry, selfHealingDriver, toolExecutor);

export const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isExecutingTool, setIsExecutingTool] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [activeToolName, setActiveToolName] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('Menyiapkan jawaban...');
  const [hasGreeted, setHasGreeted] = useState<boolean>(false);

  useEffect(() => {
    if (!isThinking) return;
    const phases = [
      'Menganalisis permintaan...',
      'Menerima respons AI...',
      'Menyusun konteks yang relevan...',
      'Menyiapkan jawaban...',
    ];
    let phaseIndex = phases.indexOf(statusText);
    if (phaseIndex < 0) phaseIndex = 0;
    const timer = window.setInterval(() => {
      phaseIndex = (phaseIndex + 1) % phases.length;
      setStatusText(phases[phaseIndex]);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [isThinking]);

  const [pendingTradeApproval, setPendingTradeApproval] = useState<{
    tradePlan: TradeDetails;
    onApprove: () => void;
    onReject: () => void;
  } | null>(null);

  const stopSignalRef = useRef<boolean>(false);
  const isBusyRef = useRef<boolean>(false);
  const runIdRef = useRef<number>(0);

  useEffect(() => {
    if (!hasGreeted) {
      setHasGreeted(true);
      const greetings = [
        'Hai! Aku VORTEXIS, asisten otomatis di browser kamu.',
        'Halo! Senang bertemu denganmu.',
        'Hai bos, aku siap kerja!',
      ];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      setMessages([{
        id: 'msg-greeting-0',
        role: 'assistant',
        content: `${greeting}\n\nMau aku bantu apa hari ini? Bisa otomasi browsing, analisis halaman, isi form, atau analisis chart trading — tinggal bilang aja!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
  }, []);

  const handleSendMessage = async (text: string, attachments: FileAttachment[]) => {
    if (isBusyRef.current) return;
    const runId = ++runIdRef.current;
    isBusyRef.current = true;
    setIsBusy(true);
    stopSignalRef.current = false;
    setPendingTradeApproval(null);

    let fullPromptText = text;
    const imageAttachments = attachments.filter((a) => a.isImage);
    const nonImageAttachments = attachments.filter((a) => !a.isImage);

    if (nonImageAttachments.length > 0) {
      const fileSummary = nonImageAttachments
        .map((a) => `[File Attached: ${a.name} (${a.type})]\n${a.content}`)
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
    setStatusText('Menganalisis permintaan...');

    try {
      await autonomousPlanner.runSuperAgentLoop(
        fullPromptText,
        [...messages, userMsg],
        (stepUpdateMsg: ChatMessage, extraState?: { isExecutingTool?: boolean; activeToolName?: string; statusText?: string; streamingComplete?: boolean }) => {
          if (runId !== runIdRef.current || stopSignalRef.current) return;

          if (extraState) {
            const exec = Boolean(extraState.isExecutingTool);
            setIsExecutingTool(exec);
            setActiveToolName(extraState.activeToolName || '');

            if (extraState.statusText) setStatusText(extraState.statusText);

            if (extraState.streamingComplete === true) {
              setIsThinking(false);
            } else {
              setIsThinking(true);
            }
          }

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
        (actionDesc, onApprove, onReject) => {
          setPendingTradeApproval({
            tradePlan: {
              pair: 'ACTION_CONFIRMATION',
              action_type: 'BUY',
              entry_price: actionDesc,
              stop_loss: 'N/A',
              take_profit: 'N/A',
            },
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
      if (runId === runIdRef.current) {
        isBusyRef.current = false;
        setIsBusy(false);
        setIsThinking(false);
        setIsExecutingTool(false);
        setActiveToolName('');
        setPendingTradeApproval(null);
      }
    }
  };

  const handleTriggerQuickTool = async (toolName: ToolName) => {
    if (isBusyRef.current) return;
    const runId = ++runIdRef.current;
    isBusyRef.current = true;
    setIsBusy(true);
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
    setStatusText('Menjalankan langkah berikutnya...');
    setIsExecutingTool(true);
    setActiveToolName(toolName);

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
      if (runId === runIdRef.current && !stopSignalRef.current) {
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `TOOL_FAILED: ${toolName} - ${err.message || String(err)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      if (runId === runIdRef.current) {
        isBusyRef.current = false;
        setIsBusy(false);
        setIsThinking(false);
        setIsExecutingTool(false);
        setActiveToolName('');
      }
    }
  };

  const handleClearChat = () => {
    runIdRef.current++;
    isBusyRef.current = false;
    stopSignalRef.current = true;
    setMessages([]);
    setIsThinking(false);
    setIsBusy(false);
    setIsExecutingTool(false);
    setActiveToolName('');
        setStatusText('Menyiapkan jawaban...');
    setPendingTradeApproval(null);
  };

  const handleStop = () => {
    runIdRef.current++;
    isBusyRef.current = false;
    stopSignalRef.current = true;
    setIsBusy(false);
    setIsThinking(false);
    setIsExecutingTool(false);
    setActiveToolName('');
    setStatusText('Menyiapkan jawaban...');
    setPendingTradeApproval(null);
  };

  return (
    <div className="vortexis-app w-full h-screen text-neutral-100 flex flex-col font-sans select-none overflow-hidden">
      <ChatPanelContainer
        messages={messages}
        isThinking={isThinking}
        isExecutingTool={isExecutingTool}
        activeToolName={activeToolName}
        statusText={statusText}
        onClearChat={handleClearChat}
        onEmergencyStop={handleStop}
        pendingTradeApproval={pendingTradeApproval}
      />
      <ChatInput
        onSendMessage={handleSendMessage}
        onStop={handleStop}
        isBusy={isBusy}
      />
    </div>
  );
};
