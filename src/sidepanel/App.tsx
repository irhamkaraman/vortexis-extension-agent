import React, { useEffect, useState } from 'react';
import { BackgroundToolExecutor } from '../background';
import { ChatMessage, ToolName } from '../core/types/agent';
import { ToolRegistry } from '../modules/agent/ToolRegistry';
import { SenseNovaClient } from '../modules/ai/SenseNovaClient';
import { BrowserRAGStore } from '../modules/rag/BrowserRAGStore';
import { ChatContainer } from './components/ChatContainer';
import { ChatInput } from './components/ChatInput';
import { Header } from './components/Header';

// Initialize core monolithic components
const toolExecutor = new BackgroundToolExecutor();
const ragStore = new BrowserRAGStore();
const toolRegistry = new ToolRegistry(toolExecutor, ragStore);
const senseNovaClient = new SenseNovaClient();

export const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState<boolean>(false);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['sensenova_api_key'], (res: Record<string, any>) => {
        if (res && typeof res.sensenova_api_key === 'string') {
          setApiKey(res.sensenova_api_key);
          senseNovaClient.updateApiKey(res.sensenova_api_key);
        }
      });
    }
  }, []);

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    senseNovaClient.updateApiKey(key);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ sensenova_api_key: key });
    }
  };

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
        content: `⚠️ System Error: ${err.message || String(err)}`,
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
      content: m.content || (m.toolCall ? `Executed tool: ${m.toolCall.name}` : ''),
    }));

    const response = await senseNovaClient.generateChatTurn(historyPayload);

    if (response.tool_call) {
      const toolCall = response.tool_call;
      const aiToolMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content: response.reply || `Executing tool: ${toolCall.name}...`,
        thought: response.thought,
        toolCall,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiToolMsg]);

      // Execute tool otonomously
      const toolRes = await toolRegistry.executeTool(toolCall);

      aiToolMsg.toolResult = toolRes;
      setMessages((prev) => prev.map((m) => (m.id === aiToolMsg.id ? { ...m, toolResult: toolRes } : m)));

      // Next agent turn with tool result feedback
      const feedbackMsg: ChatMessage = {
        id: `msg-sys-${Date.now()}`,
        role: 'system',
        content: `Tool ${toolCall.name} execution result: ${JSON.stringify(toolRes.data || toolRes.error)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedHistory = [...chatHistory, aiToolMsg, feedbackMsg];
      const secondTurnRes = await senseNovaClient.generateChatTurn(
        updatedHistory.map((m) => ({ role: m.role, content: m.content }))
      );

      const finalAiMsg: ChatMessage = {
        id: `msg-final-${Date.now()}`,
        role: 'assistant',
        content: secondTurnRes.reply || 'Execution complete.',
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
      content: `Trigger quick action: ${toolName}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const toolRes = await toolRegistry.executeTool(toolCall);
      const aiMsg: ChatMessage = {
        id: `msg-res-${Date.now()}`,
        role: 'assistant',
        content: `Executed **${toolName}** successfully.`,
        toolCall,
        toolResult: toolRes,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Failed to execute tool ${toolName}: ${err.message || String(err)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleStop = () => {
    setIsThinking(false);
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      <Header apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <ChatContainer messages={messages} isThinking={isThinking} />
        <ChatInput
          onSendMessage={handleSendMessage}
          onTriggerQuickTool={handleTriggerQuickTool}
          onStop={handleStop}
          isThinking={isThinking}
        />
      </main>
    </div>
  );
};
