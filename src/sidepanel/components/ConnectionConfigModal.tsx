import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { ToolConnection } from '../../core/types/connections';

interface ConnectionConfigModalProps {
  connection: ToolConnection;
  onSave: (id: string, newConfig: any) => void;
  onClose: () => void;
}

export function ConnectionConfigModal({ connection, onSave, onClose }: ConnectionConfigModalProps) {
  const [configStr, setConfigStr] = useState('');

  useEffect(() => {
    // If it's a new config or empty, give a generic JSON template
    if (connection.config) {
      setConfigStr(JSON.stringify(connection.config, null, 2));
    } else {
      if (connection.id === 'mcp-local-fs') {
        setConfigStr(JSON.stringify({ allowedDirectories: ['C:\\\\path\\\\to\\\\folder'] }, null, 2));
      } else if (connection.id === 'mcp-github') {
        setConfigStr(JSON.stringify({ personalAccessToken: '' }, null, 2));
      } else if (connection.id === 'rest-openai') {
        setConfigStr(JSON.stringify({ apiKey: '' }, null, 2));
      } else {
        setConfigStr('{\n  \n}');
      }
    }
  }, [connection]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(configStr);
      onSave(connection.id, parsed);
      onClose();
    } catch (e) {
      alert('Konfigurasi harus berupa JSON yang valid.');
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
          <h3 className="text-gray-200 font-semibold text-sm">Konfigurasi {connection.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <p className="text-xs text-gray-400">
            Edit konfigurasi dalam format JSON. Parameter ini akan diteruskan ke agent/MCP saat diaktifkan.
          </p>
          <textarea
            value={configStr}
            onChange={(e) => setConfigStr(e.target.value)}
            className="w-full h-40 bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-green-400 font-mono resize-none focus:outline-none focus:border-purple-500"
            spellCheck={false}
          />
        </div>

        <div className="p-4 border-t border-gray-800 flex justify-end gap-2 bg-gray-900/50">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-medium text-white transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Simpan
          </button>
        </div>
        
      </div>
    </div>
  );
}
