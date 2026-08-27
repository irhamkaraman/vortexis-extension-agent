import React from 'react';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import { TradeDetails } from '../../core/types/agent';

interface TradeApprovalCardProps {
  tradePlan: TradeDetails;
  onApprove: () => void;
  onReject: () => void;
}

export const TradeApprovalCard: React.FC<TradeApprovalCardProps> = ({
  tradePlan,
  onApprove,
  onReject,
}) => {
  const isBuy = tradePlan.action_type === 'BUY';

  return (
    <div
      className={`mx-3 my-2 border rounded-xl p-3 shadow-2xl text-xs animate-in fade-in slide-in-from-top-2 duration-300 ${
        isBuy ? 'bg-emerald-950/90 border-emerald-500/60' : 'bg-rose-950/90 border-rose-500/60'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
        <span className="flex items-center gap-1.5 font-bold text-xs text-white">
          <ShieldAlert className="w-4 h-4 text-amber-400" /> MANDATORY TRADE APPROVAL
        </span>
        <span
          className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase flex items-center gap-1 ${
            isBuy ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
          }`}
        >
          {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {tradePlan.action_type} {tradePlan.pair}
        </span>
      </div>

      {/* Scannable Grid Details */}
      <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/60 font-mono text-[11px] mb-3">
        <div>
          <span className="text-[9px] text-slate-400 block uppercase">Entry Price</span>
          <span className="font-bold text-slate-100">{tradePlan.entry_price}</span>
        </div>
        <div>
          <span className="text-[9px] text-rose-400 block uppercase">Stop Loss (SL)</span>
          <span className="font-bold text-rose-300">{tradePlan.stop_loss}</span>
        </div>
        <div>
          <span className="text-[9px] text-emerald-400 block uppercase">Take Profit (TP)</span>
          <span className="font-bold text-emerald-300">{tradePlan.take_profit}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-300 px-1 mb-3">
        <span>Estimasi Risk: <strong className="text-amber-300">{tradePlan.risk_percentage || '1%'}</strong></span>
        <span>Rasio RRR: <strong className="text-cyan-300">Min 1:2.5</strong></span>
      </div>

      {/* Action Approval Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onApprove}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 fill-current" /> APPROVE & SUBMIT ORDER
        </button>

        <button
          onClick={onReject}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
        >
          <XCircle className="w-4 h-4 text-rose-400" /> REJECT
        </button>
      </div>
    </div>
  );
};
