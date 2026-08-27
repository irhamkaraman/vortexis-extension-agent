import React, { useState } from 'react';
import { BackgroundToolExecutor } from '../background';
import { ChatMessage, ToolName } from '../core/types/agent';
import { AgentEngine } from '../modules/agent/AgentEngine';
import { ToolRegistry } from '../modules/agent/ToolRegistry';
import { BrowserRAGStore } from '../modules/rag/BrowserRAGStore';
import { ChatPanelContainer } from './ChatPanel';
import { ChatInput } from './components/ChatInput';

const toolExecutor = new BackgroundToolExecutor();
const ragStore = new BrowserRAGStore();
const toolRegistry = new ToolRegistry(toolExecutor, ragStore);
const agentEngine = new AgentEngine();

export const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState<boolean>(false);

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      await runAgentTurn([...messages, userMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Kendala Sistem: ${err.message || String(err)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const runAgentTurn = async (chatHistory: ChatMessage[]) => {
    const historyPayload = chatHistory.map((m) => ({
      role: m.role,
      content: m.content || (m.toolCall ? `Menjalankan skill: ${m.toolCall.name}` : ''),
    }));

    const response = await agentEngine.runChatTurn(historyPayload);

    if (response.tool_call) {
      const toolCall = response.tool_call;
      const aiToolMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content: response.reply || `Memicu skill agent: ${toolCall.name}...`,
        thought: response.thought,
        toolCall,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiToolMsg]);

      // Execute skill otonomous
      const toolRes = await toolRegistry.executeTool(toolCall);

      aiToolMsg.toolResult = toolRes;
      setMessages((prev) => prev.map((m) => (m.id === aiToolMsg.id ? { ...m, toolResult: toolRes } : m)));

      // Feedback turn to agent engine
      const feedbackMsg: ChatMessage = {
        id: `msg-sys-${Date.now()}`,
        role: 'system',
        content: `Hasil eksekusi skill ${toolCall.name}: ${JSON.stringify(toolRes.data || toolRes.error)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedHistory = [...chatHistory, aiToolMsg, feedbackMsg];
      const secondTurnRes = await agentEngine.runChatTurn(
        updatedHistory.map((m) => ({ role: m.role, content: m.content }))
      );

      const finalAiMsg: ChatMessage = {
        id: `msg-final-${Date.now()}`,
        role: 'assistant',
        content: secondTurnRes.reply || 'Eksekusi selesai.',
        thought: secondTurnRes.thought,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, finalAiMsg]);
    } else {
      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content: response.reply || 'Halo! Ada yang bisa saya bantu?',
        thought: response.thought,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }
  };

  const handleTriggerQuickTool = async (toolName: ToolName) => {
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
      const toolRes = await toolRegistry.executeTool(toolCall);
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
    setMessages([]);
    setIsThinking(false);
  };

  const handleStop = () => {
    setIsThinking(false);
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      <ChatPanelContainer messages={messages} isThinking={isThinking} onClearChat={handleClearChat} />
      <ChatInput
        onSendMessage={handleSendMessage}
        onTriggerQuickTool={handleTriggerQuickTool}
        onStop={handleStop}
        isThinking={isThinking}
      />
    </div>
  );
};
