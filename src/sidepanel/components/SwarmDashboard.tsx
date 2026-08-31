import React, { useState, useEffect } from 'react';
import { SwarmTask, WorkerMessage } from '../../core/types/multiAgent';
import { Network, CheckCircle2, XCircle, Clock, Loader2, ListTree } from 'lucide-react';

interface SwarmDashboardProps {
  initialTasks: SwarmTask[];
}

export function SwarmDashboard({ initialTasks }: SwarmDashboardProps) {
  const [tasks, setTasks] = useState<SwarmTask[]>(initialTasks);

  useEffect(() => {
    const handleMessage = (msg: WorkerMessage, sender: chrome.runtime.MessageSender, sendResponse: (res?: any) => void) => {
      if (['WORKER_PROGRESS', 'WORKER_RESULT', 'WORKER_ERROR'].includes(msg.type)) {
        setTasks((prev) => prev.map((t) => {
          if (t.workerId === msg.workerId) {
            return {
              ...t,
              status: msg.status,
              progressMessage: msg.status === 'RUNNING' ? msg.data : t.progressMessage,
              result: msg.status === 'COMPLETED' ? msg.data : t.result,
              error: msg.error,
              completedAt: ['COMPLETED', 'FAILED', 'TIMEOUT'].includes(msg.status) ? Date.now() : t.completedAt
            };
          }
          return t;
        }));
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const getStatusIcon = (status: SwarmTask['status']) => {
    switch (status) {
      case 'QUEUED': return <Clock className="w-4 h-4 text-gray-400" />;
      case 'RUNNING': return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'COMPLETED': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'FAILED':
      case 'TIMEOUT': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <ListTree className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: SwarmTask['status']) => {
    switch (status) {
      case 'QUEUED': return 'border-gray-700 bg-gray-800/50';
      case 'RUNNING': return 'border-blue-700/50 bg-blue-900/20';
      case 'COMPLETED': return 'border-green-700/50 bg-green-900/20';
      case 'FAILED':
      case 'TIMEOUT': return 'border-red-700/50 bg-red-900/20';
      default: return 'border-gray-700 bg-gray-800/50';
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-900 rounded-xl border border-gray-800/60 shadow-xl w-full">
      <div className="flex items-center gap-2 mb-2 pb-3 border-b border-gray-800">
        <Network className="w-5 h-5 text-cyan-400" />
        <h2 className="text-sm font-semibold text-gray-200">Swarm Coordination Dashboard</h2>
        <div className="ml-auto flex gap-2 text-xs">
          <span className="text-gray-400">Total: {tasks.length}</span>
          <span className="text-blue-400">Run: {tasks.filter(t => t.status === 'RUNNING').length}</span>
          <span className="text-green-400">Done: {tasks.filter(t => t.status === 'COMPLETED').length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
        {tasks.map((task) => (
          <div key={task.id} className={`flex flex-col p-3 rounded-lg border ${getStatusColor(task.status)} transition-colors duration-300`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {getStatusIcon(task.status)}
                <span className="text-xs font-medium text-gray-300 uppercase truncate max-w-[120px]">
                  {task.domain}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">{task.workerId.slice(0, 8)}</span>
            </div>
            
            <p className="text-xs text-gray-400 line-clamp-1 mb-2" title={task.instruction}>
              {task.instruction}
            </p>

            <div className="bg-black/40 rounded p-2 min-h-[36px] flex flex-col justify-center">
              {task.status === 'RUNNING' && (
                <span className="text-xs text-blue-300 italic truncate">{task.progressMessage || 'Initializing...'}</span>
              )}
              {task.status === 'COMPLETED' && (
                <span className="text-xs text-green-300 line-clamp-2">{task.result?.substring(0, 80)}...</span>
              )}
              {(task.status === 'FAILED' || task.status === 'TIMEOUT') && (
                <span className="text-xs text-red-400 line-clamp-2">{task.error}</span>
              )}
              {task.status === 'QUEUED' && (
                <span className="text-xs text-gray-500 italic">Waiting in queue...</span>
              )}
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-xs">
            Tidak ada swarm worker yang aktif.
          </div>
        )}
      </div>
    </div>
  );
}
