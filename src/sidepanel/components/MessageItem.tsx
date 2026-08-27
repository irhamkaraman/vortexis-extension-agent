import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, CheckCircle2, ChevronDown, ChevronRight, MousePointerClick, ScanLine, User, Wrench, XCircle } from 'lucide-react';
import { ChatMessage } from '../../core/types/agent';

interface MessageItemProps {
  message: ChatMessage;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const [showToolDetails, setShowToolDetails] = React.useState(true);
  const isUser = message.role === 'user';

  const getToolTitle = (name?: string) => {
    switch (name) {
      case 'scan_dom_coordinates':
        return '📍 Memindai elemen interaktif...';
      case 'execute_click_coordinate':
        return '🖱️ Mengklik koordinat...';
      case 'execute_type_coordinate':
        return '⌨️ Mengetik input teks...';
      case 'scroll_page':
        return '📜 Menggeser halaman...';
      case 'capture_screen':
        return '📸 Menangkap screenshot layar...';
      case 'get_page_context':
        return '🔍 Membaca konteks halaman...';
      default:
        return '🛠️ Menjalankan skill...';
    }
  };

  const getToolIcon = (name?: string) => {
    switch (name) {
      case 'scan_dom_coordinates':
        return <ScanLine className="w-3.5 h-3.5 text-cyan-400" />;
      case 'execute_click_coordinate':
      case 'execute_type_coordinate':
        return <MousePointerClick className="w-3.5 h-3.5 text-pink-400" />;
      default:
        return <Wrench className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <div className={`flex gap-2.5 my-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-md ${
          isUser
            ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white'
            : 'bg-slate-800 border border-slate-700 text-cyan-400'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className={`max-w-[85%] flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-md ${
            isUser
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
              : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
          }`}
        >
          {message.content ? (
            <div className="prose prose-invert prose-xs leading-relaxed max-w-none break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          ) : null}

          {/* Embedded Skill/Tool Activity Card */}
          {message.toolCall && (
            <div className="mt-2 bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 text-[11px] shadow-sm">
              <button
                onClick={() => setShowToolDetails(!showToolDetails)}
                className="w-full flex items-center justify-between font-mono text-[10px] text-cyan-300 hover:text-cyan-200 transition-colors"
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  {getToolIcon(message.toolCall.name)}
                  <span>{getToolTitle(message.toolCall.name)}</span>
                </span>
                {showToolDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>

              {showToolDetails && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-400 space-y-1.5">
                  <div className="bg-slate-900/90 rounded p-1.5 border border-slate-800/60 overflow-x-auto">
                    <span className="text-slate-500">Parameters: </span>
                    <span className="text-slate-300">{JSON.stringify(message.toolCall.parameters)}</span>
                  </div>

                  {message.toolResult && (
                    <div className="flex items-start gap-1.5 mt-1">
                      {message.toolResult.success ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span className={message.toolResult.success ? 'text-emerald-300' : 'text-rose-300'}>
                        {message.toolResult.error || 'Eksekusi skill berhasil.'}
                      </span>
                    </div>
                  )}

                  {message.toolResult?.screenshotUrl && (
                    <div className="mt-2">
                      <span className="text-[10px] text-slate-400 block mb-1 font-sans">Screenshot Tab Preview:</span>
                      <img
                        src={message.toolResult.screenshotUrl}
                        alt="Screenshot Preview"
                        className="rounded-lg border border-slate-700 shadow-md max-h-48 object-cover w-full"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <span className="text-[9px] text-slate-500 font-mono px-1">{message.timestamp}</span>
      </div>
    </div>
  );
};
