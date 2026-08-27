import React, { useEffect, useState } from 'react';
import { ExtensionDOMExecutor } from '../background';
import { AgentExecutionLog, AgentStatus } from '../core/types/agent';
import { BrowserAgent } from '../modules/agent/BrowserAgent';
import { SenseNovaClient } from '../modules/ai/SenseNovaClient';
import { BrowserRAGStore } from '../modules/rag/BrowserRAGStore';
import { ActionControls } from './components/ActionControls';
import { AnalysisSummary } from './components/AnalysisSummary';
import { Header } from './components/Header';
import { RAGStatusBadge } from './components/RAGStatusBadge';
import { TerminalLogs } from './components/TerminalLogs';

// Initialize core monolithic agent components
const domExecutor = new ExtensionDOMExecutor();
const ragStore = new BrowserRAGStore();
const senseNovaClient = new SenseNovaClient();
const agent = new BrowserAgent(senseNovaClient, ragStore, domExecutor);

export const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [goal, setGoal] = useState<string>('');
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [logs, setLogs] = useState<AgentExecutionLog[]>([]);
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [docsCount, setDocsCount] = useState<number>(0);
  const [chunksCount, setChunksCount] = useState<number>(0);
  const [summaryText, setSummaryText] = useState<string>('');

  useEffect(() => {
    // Load stored settings if available
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['sensenova_api_key'], (res: Record<string, any>) => {
        if (res && typeof res.sensenova_api_key === 'string') {
          setApiKey(res.sensenova_api_key);
          senseNovaClient.updateApiKey(res.sensenova_api_key);
        }
      });
    }

    agent.setOnStateChange((newStatus, log) => {
      setStatus(newStatus);
      setLogs((prev) => [...prev, log]);
      setSummaryText(agent.getSummaryResult());
    });
  }, []);

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    senseNovaClient.updateApiKey(key);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ sensenova_api_key: key });
    }
  };

  const handleIngestActiveTab = async () => {
    setIsIngesting(true);
    try {
      const domData = await domExecutor.scrapeDOM();
      await ragStore.ingestDocument({
        url: domData.url,
        title: domData.title,
        text: domData.cleanText,
      });

      setDocsCount(ragStore.getDocumentsCount());
      setChunksCount(ragStore.getTotalChunksCount());
      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `Indexed tab: "${domData.title.substring(0, 30)}..." into RAG vector store.`,
        },
      ]);
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Tab RAG indexing failed: ${err.message || String(err)}`,
        },
      ]);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleRunGoal = async () => {
    if (!goal.trim()) return;
    setSummaryText('');
    await agent.runGoal(goal);
  };

  const handleReset = () => {
    setLogs([]);
    setStatus('idle');
    setSummaryText('');
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      <Header apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />

      <main className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        <RAGStatusBadge
          documentsCount={docsCount}
          chunksCount={chunksCount}
          onIngestClick={handleIngestActiveTab}
          isIngesting={isIngesting}
        />

        <ActionControls
          goal={goal}
          onGoalChange={setGoal}
          onRunGoal={handleRunGoal}
          onReset={handleReset}
          status={status}
        />

        <AnalysisSummary plan={agent.getCurrentPlan()} summaryText={summaryText} />

        <TerminalLogs logs={logs} />
      </main>
    </div>
  );
};
