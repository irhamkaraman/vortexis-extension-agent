import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowDownRight, ArrowUpRight, Bot, CheckCircle2, ChevronDown, ChevronRight, Eye, LineChart, MousePointerClick, User, Wrench, XCircle } from 'lucide-react';
import { ChatMessage } from '../../core/types/agent';
import { ChartVisionViewer } from './ChartVisionViewer';

interface MessageItemProps {
  message: ChatMessage;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const [showToolDetails, setShowToolDetails] = React.useState(true);
  const isUser = message.role === 'user';

  const getToolTitle = (name?: string) => {
    switch (name) {
      case 'switch_timeframe':
        return '⏱️ Mengubah Timeframe Chart...';
      case 'capture_chart_vision':
        return '📸 Menangkap Screenshot Chart Visual...';
      case 'draw_on_chart':
        return '🎨 Menggambar Level Teknikal / Trendline...';
      case 'fill_order_parameters':
        return '📝 Mengisi Parameter Order (Lot/SL/TP)...';
      case 'request_trade_confirmation':
        return '🛑 Menunggu Approval Order Manusia...';
      case 'execute_confirmed_order':
        return '🚀 Eksekusi Final Order ke Web Broker...';
      default:
        return '🛠️ Menjalankan Skill Trading...';
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
          {/* Trading Reasoning & Bias Badge */}
          {message.thoughtProcess && (
            <div className="mb-2 p-2 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1 font-mono text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Market Bias:</span>
                <span
                  className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                    message.thoughtProcess.market_bias === 'BULLISH'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : message.thoughtProcess.market_bias === 'BEARISH'
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {message.thoughtProcess.market_bias} ({message.thoughtProcess.timeframe_checked})
                </span>
              </div>
              <div className="text-slate-300">{message.thoughtProcess.technical_reasoning}</div>
            </div>
          )}

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
                  <LineChart className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{getToolTitle(message.toolCall.name)}</span>
                </span>
                {showToolDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>

              {showToolDetails && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-400 space-y-1.5">
                  <div className="bg-slate-900/90 rounded p-1.5 border border-slate-800/60 overflow-x-auto">
                    <span className="text-slate-500">Params: </span>
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
                        {message.toolResult.error || 'Eksekusi trading tool berhasil.'}
                      </span>
                    </div>
                  )}

                  {message.toolResult?.screenshotUrl && (
                    <ChartVisionViewer
                      imageUrl={message.toolResult.screenshotUrl}
                      timestamp={message.timestamp}
                    />
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
