import React, { useState, useEffect } from 'react';
import { ToolConnection } from '../../core/types/connections';
import { Link2, Power, Settings2, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { ConnectionConfigModal } from './ConnectionConfigModal';

const MOCK_CONNECTIONS: ToolConnection[] = [
  {
    id: 'mcp-local-fs',
    name: 'Local File System',
    description: 'Akses membaca dan menulis file lokal via MCP',
    type: 'MCP',
    status: 'INACTIVE',
  },
  {
    id: 'mcp-github',
    name: 'GitHub Integration',
    description: 'Akses repositori, issues, dan PR via MCP',
    type: 'MCP',
    status: 'INACTIVE',
  },
  {
    id: 'rest-openai',
    name: 'OpenAI API',
    description: 'Koneksi ke LLM eksternal untuk fallback',
    type: 'REST_API',
    status: 'INACTIVE',
  }
];

export function ConnectionManager() {
  const [connections, setConnections] = useState<ToolConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingConnection, setEditingConnection] = useState<ToolConnection | null>(null);

  useEffect(() => {
    // Muat konfigurasi dari storage
    chrome.storage.local.get(['vortexis_connections']).then((res) => {
      if (res.vortexis_connections) {
        setConnections(res.vortexis_connections as ToolConnection[]);
      } else {
        setConnections(MOCK_CONNECTIONS);
      }
      setIsLoading(false);
    });
  }, []);

  const toggleConnection = async (id: string) => {
    const updated = connections.map(c => {
      if (c.id === id) {
        return { ...c, status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } as ToolConnection;
      }
      return c;
    });
    setConnections(updated);
    await chrome.storage.local.set({ vortexis_connections: updated });
    
    // Kirim sinyal ke background untuk mengaktifkan/mematikan koneksi MCP terkait
    chrome.runtime.sendMessage({ type: 'UPDATE_CONNECTION', payload: { id, connections: updated } });
  };

  const saveConnectionConfig = async (id: string, newConfig: any) => {
    const updated = connections.map(c => {
      if (c.id === id) {
        return { ...c, config: newConfig } as ToolConnection;
      }
      return c;
    });
    setConnections(updated);
    await chrome.storage.local.set({ vortexis_connections: updated });
    
    // Update config to background script if connection is active
    const conn = updated.find(c => c.id === id);
    if (conn && conn.status === 'ACTIVE') {
      chrome.runtime.sendMessage({ type: 'UPDATE_CONNECTION', payload: { id, connections: updated } });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>;
  }

  return (
    <div className="flex flex-col gap-4 p-4 h-full bg-gray-900 overflow-y-auto relative">
      <div className="flex items-center gap-2 mb-2 pb-3 border-b border-gray-800">
        <Link2 className="w-5 h-5 text-purple-400" />
        <h2 className="text-sm font-semibold text-gray-200">Tools & Connections</h2>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {connections.map((conn) => (
          <div key={conn.id} className={`flex flex-col p-4 rounded-xl border transition-all duration-300 ${conn.status === 'ACTIVE' ? 'bg-gray-800/80 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'bg-gray-800/30 border-gray-700/50'}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {conn.status === 'ACTIVE' ? <ShieldCheck className="w-4 h-4 text-green-400" /> : <ShieldAlert className="w-4 h-4 text-gray-500" />}
                <h3 className="text-sm font-medium text-gray-200">{conn.name}</h3>
              </div>
              
              <button 
                onClick={() => toggleConnection(conn.id)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${conn.status === 'ACTIVE' ? 'bg-purple-500' : 'bg-gray-600'}`}
              >
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${conn.status === 'ACTIVE' ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
            
            <p className="text-xs text-gray-400 mb-3">{conn.description}</p>
            
            <div className="flex items-center justify-between mt-auto">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-gray-400 border border-gray-700/50">
                {conn.type}
              </span>
              <button 
                onClick={() => setEditingConnection(conn)}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingConnection && (
        <ConnectionConfigModal 
          connection={editingConnection}
          onSave={saveConnectionConfig}
          onClose={() => setEditingConnection(null)}
        />
      )}
    </div>
  );
}
