import React, { useState, useRef, useEffect } from 'react';
import { BackgroundToolExecutor } from '../background';
import { AgentActivityState, AgentActivityStep, ChatMessage, FileAttachment, ToolName, TradeDetails } from '../core/types/agent';
import { AutonomousPlanner } from '../modules/agent/AutonomousPlanner';
import { SelfHealingDriver } from '../modules/agent/SelfHealingDriver';
import { ToolRegistry } from '../modules/agent/ToolRegistry';
import { BrowserRAGStore } from '../modules/rag/BrowserRAGStore';
import { ChatPanelContainer } from './ChatPanel';
import { ChatInput } from './components/ChatInput';
import { AgentActivityTimeline } from './components/AgentActivityTimeline';
import { sanitizeToolParameters, summarizeToolResult } from '../modules/agent/ActivityUtils';
import { AVAILABLE_MODELS } from '../core/types/models';

import { ReasoningTree } from './components/ReasoningTree';
import { TaskPlan } from '../core/types/taskTree';

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
  const [statusText, setStatusText] = useState<string>('Thinking...');
  
  const [taskPlan, setTaskPlan] = useState<TaskPlan | null>(null);
  const [isDecomposing, setIsDecomposing] = useState(false);

  const [activity, setActivity] = useState<AgentActivityState>({ isActive: false, statusText: '', steps: [] });
  const [reasoningEffort, setReasoningEffort] = useState<'none' | 'low' | 'medium' | 'high'>('medium');
  const [selectedModelId, setSelectedModelId] = useState<string>('sensenova-6.8-flash-lite');

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    const targetModel = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (targetModel) {
      autonomousPlanner.setModelConfiguration(targetModel.id, targetModel.baseURL, targetModel.apiKey);
    }
  };

  // Keep a stable status indicator without rotating/distracting text
  useEffect(() => {
    if (isThinking && !isExecutingTool) {
      setStatusText('Thinking...');
    }
  }, [isThinking, isExecutingTool]);

  // Setup message listener inside useEffect
  useEffect(() => {
    const handleMessage = (msg: any) => {
      if (msg.type === 'UPDATE_TASK_STEP_STATUS' && taskPlan) {
        setTaskPlan(prev => {
          if (!prev) return prev;
          const newSteps = prev.steps.map(s => s.id === msg.payload.stepId ? { ...s, status: msg.payload.status } : s);
          return { ...prev, steps: newSteps };
        });
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [taskPlan]);

  const handleDecompose = async (instruction: string) => {
    setIsDecomposing(true);
    setStatusText('Memecah instruksi...');
    
    chrome.runtime.sendMessage({ type: 'DECOMPOSE_INSTRUCTION', payload: { instruction } }, (response) => {
      setIsDecomposing(false);
      if (response && response.plan) {
        setTaskPlan(response.plan);
        setStatusText('Menunggu persetujuan Anda.');
      } else {
        setStatusText('Gagal memecah instruksi.');
      }
    });
  };

  const handleExecutePlan = (plan: TaskPlan) => {
    setStatusText('Mengeksekusi rencana terstruktur...');
    chrome.runtime.sendMessage({ type: 'EXECUTE_PLAN', payload: { plan } });
  };

  const handleRevalidate = async (plan: TaskPlan) => {
    return new Promise<boolean>((resolve) => {
      chrome.runtime.sendMessage({ type: 'REVALIDATE_PLAN', payload: { plan } }, (response) => {
        resolve(response?.valid ?? true);
      });
    });
  };

  const [pendingTradeApproval, setPendingTradeApproval] = useState<{
    tradePlan: TradeDetails;
    onApprove: () => void;
    onReject: () => void;
  } | null>(null);

  const stopSignalRef = useRef<boolean>(false);
  const isBusyRef = useRef<boolean>(false);
  const runIdRef = useRef<number>(0);

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
    setActivity({ isActive: true, statusText: 'Menganalisis permintaan...', steps: [{ id: `thinking-${runId}`, kind: 'thinking', title: 'Menganalisis permintaan', summary: 'Menentukan konteks dan langkah yang diperlukan.', status: 'active', startedAt: Date.now() }] });

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
            if (extraState.statusText) setActivity((current) => ({ ...current, isActive: true, statusText: extraState.statusText || current.statusText }));

            if (extraState.streamingComplete === true) {
              setIsThinking(false);
            } else {
              setIsThinking(true);
            }
          }

          // A natural-language delta is the answer stream itself. Do not set
          // isThinking=false here — the tool loop may still be running.
          // Thinking will be cleared in the finally block when the run truly ends.
          if (stepUpdateMsg.content && !stepUpdateMsg.toolCall) {
            setIsExecutingTool(false);
            setActiveToolName('');
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
          setActivity((current) => {
            if (stepUpdateMsg.toolCall) {
              const existing = current.steps.find((step) => step.toolName === stepUpdateMsg.toolCall?.name);
              const result = stepUpdateMsg.toolResult;
              const step: AgentActivityStep = {
                id: `tool-${stepUpdateMsg.id}`,
                kind: 'tool',
                title: stepUpdateMsg.toolCall.name,
                summary: result ? summarizeToolResult(result) : 'Menjalankan tool sesuai kebutuhan.',
                status: result ? (result.success ? 'success' : 'error') : 'active',
                toolName: stepUpdateMsg.toolCall.name,
                parameters: sanitizeToolParameters(stepUpdateMsg.toolCall.name, stepUpdateMsg.toolCall.parameters),
                resultSummary: result ? summarizeToolResult(result) : undefined,
                startedAt: existing?.startedAt || Date.now(),
                completedAt: result ? Date.now() : undefined,
              };
              return { ...current, steps: [...current.steps.filter((item) => item.id !== step.id), step] };
            }
            return current;
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
         12,
         reasoningEffort
      );
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `**⚠️ Gagal Memproses Permintaan**\n\nTerjadi kendala saat menghubungi AI Provider atau mengeksekusi aksi. Detail:\n\`\`\`json\n${err.message || String(err)}\n\`\`\``,
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
        setActivity((current) => ({ ...current, isActive: false, statusText: 'Selesai', steps: current.steps.map((step) => step.status === 'active' ? { ...step, status: 'success', completedAt: Date.now() } : step) }));
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
    setActivity({ isActive: true, statusText: 'Menjalankan langkah berikutnya...', steps: [{ id: `quick-${runId}`, kind: 'tool', title: toolName, summary: 'Menjalankan tool yang dipilih.', status: 'active', toolName, parameters: {}, startedAt: Date.now() }] });

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
        setActivity((current) => ({ ...current, isActive: false, statusText: 'Selesai', steps: current.steps.map((step) => ({ ...step, status: 'success', completedAt: Date.now() })) }));
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
    setStatusText('Thinking...');
    setPendingTradeApproval(null);
    setActivity({ isActive: false, statusText: '', steps: [] });
    toolExecutor.destroyOverlay().catch(() => {});
  };

  const handleStop = () => {
    runIdRef.current++;
    isBusyRef.current = false;
    stopSignalRef.current = true;
    setIsBusy(false);
    setIsThinking(false);
    setIsExecutingTool(false);
    setActiveToolName('');
    setStatusText('Thinking...');
    setPendingTradeApproval(null);
    setActivity({ isActive: false, statusText: '', steps: [] });
    toolExecutor.destroyOverlay().catch(() => {});
  };

  return (
    <div className="vortexis-app w-full h-screen text-neutral-100 flex flex-col font-sans select-none overflow-hidden relative">
      {taskPlan ? (
        <div className="absolute inset-0 z-50 bg-gray-900 overflow-y-auto">
          <ReasoningTree plan={taskPlan} onExecute={handleExecutePlan} onRevalidate={handleRevalidate} />
          <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setTaskPlan(null)}>Tutup</button>
        </div>
      ) : null}
      
      <ChatPanelContainer
        messages={messages}
        isThinking={isThinking}
        isExecutingTool={isExecutingTool}
        activeToolName={activeToolName}
        statusText={statusText}
        onClearChat={handleClearChat}
        onEmergencyStop={handleStop}
        pendingTradeApproval={pendingTradeApproval}
        activity={activity}
      />
      <div className="relative px-3 w-full">
        {/* Activity Timeline (Attached to ChatInput, NOT floating) */}
        <div className="w-full relative z-10 px-1">
          <AgentActivityTimeline
            activity={activity}
            isExecutingTool={isExecutingTool}
            activeToolName={activeToolName}
            statusText={statusText}
            isThinking={isThinking}
          />
        </div>
        <ChatInput
          onSendMessage={handleSendMessage}
          onStop={handleStop}
          isBusy={isBusy}
          reasoningEffort={reasoningEffort}
          onReasoningEffortChange={setReasoningEffort}
          selectedModelId={selectedModelId}
          onModelChange={handleModelChange}
        />
      </div>
    </div>
  );
};
