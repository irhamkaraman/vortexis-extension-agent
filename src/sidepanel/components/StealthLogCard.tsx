import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Terminal, XCircle } from 'lucide-react';
import { ToolResult } from '../../core/types/agent';

interface StealthLogCardProps {
  toolName?: string;
  parameters?: Record<string, any>;
  result?: ToolResult;
}

export const StealthLogCard: React.FC<StealthLogCardProps> = ({ toolName, parameters, result }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [modalImage, setModalImage] = useState<string | null>(null);

  if (!toolName) return null;

  return (
    <div className="my-2 bg-black border border-neutral-800 rounded-md p-2.5 font-mono text-[11px] text-neutral-300">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        <span className="flex items-center gap-1.5 font-semibold text-neutral-200">
          <Terminal className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
          <span>TOOL EXECUTION: {toolName}</span>
        </span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} /> : <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />}
      </button>

      {isOpen && (
        <div className="mt-2 pt-2 border-t border-neutral-800 space-y-2">
          {parameters && Object.keys(parameters).length > 0 && (
            <div className="bg-neutral-950 p-2 rounded border border-neutral-900 overflow-x-auto text-[10px] text-neutral-400">
              <span className="text-neutral-500 font-bold block mb-0.5">INPUT_PARAMS:</span>
              <pre className="whitespace-pre-wrap font-mono">{JSON.stringify(parameters, null, 2)}</pre>
            </div>
          )}

          {result && (
            <div className="flex items-start gap-1.5 text-[10px]">
              {result.success ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" strokeWidth={1.5} />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" strokeWidth={1.5} />
              )}
              <span className={result.success ? 'text-neutral-300' : 'text-red-400'}>
                {result.error || (typeof result.data === 'string' ? result.data : JSON.stringify(result.data))}
              </span>
            </div>
          )}

          {result?.screenshotUrl && (
            <div className="mt-2">
              <span className="text-[10px] text-neutral-500 block mb-1 font-sans">VISUAL_INSPECTION_SNAPSHOT:</span>
              <img
                src={result.screenshotUrl}
                alt="Inspection Snapshot"
                onClick={() => setModalImage(result.screenshotUrl || null)}
                className="w-full max-h-40 object-cover rounded-md border border-neutral-800 cursor-pointer hover:border-neutral-600 transition-colors"
              />
            </div>
          )}
        </div>
      )}

      {/* Screenshot Zoom Modal */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img src={modalImage} alt="Enlarged Snapshot" className="max-w-full max-h-full rounded border border-neutral-800" />
        </div>
      )}
    </div>
  );
};
