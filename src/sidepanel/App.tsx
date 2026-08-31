import React, { useState, useRef, useEffect } from 'react';
import { Settings, Maximize2, X, Trash2, Cpu, Activity, MessageSquare } from 'lucide-react';
import { BackgroundToolExecutor } from '../background';
import { AgentActivityState, AgentActivityStep, ChatMessage, FileAttachment, ToolName, TradeDetails } from '../core/types/agent';
import { AutonomousPlanner } from '../modules/agent/AutonomousPlanner';
import { SelfHealingDriver } from '../modules/agent/SelfHealingDriver';
import { ToolRegistry } from '../modules/agent/ToolRegistry';
import { BrowserRAGStore } from '../modules/rag/BrowserRAGStore';
import { ChatPanelContainer } from './ChatPanel';
import { ChatInput } from './components/ChatInput';
import { AgentActivityTimeline } from './components/AgentActivityTimeline';
import { StealthLogCard } from './components/StealthLogCard';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { ReasoningTree } from './components/ReasoningTree';
import { SwarmDashboard } from './components/SwarmDashboard';
import { ConnectionManager } from './components/ConnectionManager';
import { SwarmTask } from '../core/types/multiAgent';
import { TaskPlan } from '../core/types/taskTree';
import { sanitizeToolParameters, summarizeToolResult } from '../modules/agent/ActivityUtils';
import { AVAILABLE_MODELS } from '../core/types/models';

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
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id);
  const [taskPlan, setTaskPlan] = useState<TaskPlan | null>(null);
  const [swarmTasks, setSwarmTasks] = useState<SwarmTask[]>([]);
  const [showSwarm, setShowSwarm] = useState(false);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [activeTab, setActiveTab] = useState<'CHAT' | 'TOOLS' | 'ACTIVITY'>('CHAT');

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

  // Setup connection to background service worker
  useEffect(() => {
    const port = chrome.runtime.connect({ name: 'vortexis-panel' });
    port.onMessage.addListener((msg) => {
      // Handle persistent messages if needed
    });

    const handleMessage = (msg: any, sender: chrome.runtime.MessageSender, sendResponse: (res?: any) => void) => {
      if (msg.type === 'UPDATE_TASK_STEP_STATUS') {
        setTaskPlan(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            steps: prev.steps.map(s => 
              s.id === msg.payload.stepId ? { ...s, status: msg.payload.status } : s
            )
          };
        });
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    
    // Also listen to worker progress to show swarm dashboard button if tasks exist
    const handleSwarmUpdate = (msg: any) => {
      if (['WORKER_PROGRESS', 'WORKER_RESULT', 'WORKER_ERROR'].includes(msg.type)) {
         setSwarmTasks(prev => {
            const idx = prev.findIndex(t => t.workerId === msg.workerId);
            if (idx >= 0) return prev; // handled inside SwarmDashboard component
            
            // Just a placeholder if we receive message but task not in local state yet
            return [...prev, {
              id: `sw-${Date.now()}`,
              workerId: msg.workerId,
              domain: 'worker',
              url: '',
              instruction: 'Sub-task',
              status: msg.status,
              createdAt: Date.now()
            }];
         });
         setShowSwarm(true);
      }
    };
    chrome.runtime.onMessage.addListener(handleSwarmUpdate);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      chrome.runtime.onMessage.removeListener(handleSwarmUpdate);
    };
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
         25,
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
    <div className="vortexis-app w-full h-screen text-neutral-100 flex font-sans select-none overflow-hidden relative bg-gray-950">

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeTab === 'CHAT' && (
          <>
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
            {taskPlan && (
              <div className="px-2">
                <ReasoningTree plan={taskPlan} onExecute={handleExecutePlan} onRevalidate={handleRevalidate} onCancel={() => setTaskPlan(null)} />
              </div>
            )}
            {isThinking && (messages.length === 0 || messages[messages.length - 1].role === 'user' || (messages[messages.length - 1].role === 'assistant' && !messages[messages.length - 1].content && !messages[messages.length - 1].thinkingContent && !messages[messages.length - 1].toolCall)) && (
              <div className="px-3 pb-1 -mt-2">
                <ThinkingIndicator statusText={statusText || 'Berpikir...'} activity={activity} />
              </div>
            )}
            <div className="p-2 pb-3 bg-transparent">
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
          </>
        )}

        {activeTab === 'TOOLS' && (
          <div className="flex-1 overflow-hidden">
            <ConnectionManager />
          </div>
        )}

        {activeTab === 'ACTIVITY' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-200 mb-4">Activity Log</h2>
            {activity.steps.length === 0 ? (
              <div className="text-gray-500 text-xs text-center py-8">Tidak ada aktivitas.</div>
            ) : (
              <AgentActivityTimeline
                activity={activity}
                isExecutingTool={isExecutingTool}
                activeToolName={activeToolName}
                statusText={statusText}
                isThinking={isThinking}
              />
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar Navigation */}
      <div className="w-14 border-l border-gray-800/50 bg-gray-900/20 flex flex-col items-center py-4 gap-6 shrink-0 z-10">
        <button
          onClick={() => setActiveTab('CHAT')}
          title="Chat"
          className={`p-2 rounded-xl transition-all duration-300 group relative ${activeTab === 'CHAT' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">Chat</span>
        </button>
        
        <button
          onClick={() => setActiveTab('TOOLS')}
          title="Tools"
          className={`p-2 rounded-xl transition-all duration-300 group relative ${activeTab === 'TOOLS' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
        >
          <Cpu className="w-5 h-5" />
          <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">Tools</span>
        </button>

        <button
          onClick={() => setActiveTab('ACTIVITY')}
          title="Activity"
          className={`p-2 rounded-xl transition-all duration-300 group relative ${activeTab === 'ACTIVITY' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
        >
          <Activity className="w-5 h-5" />
          <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">Activity</span>
        </button>
      </div>
    </div>
  );
};
