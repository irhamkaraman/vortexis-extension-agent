import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';

interface ConfirmationCardProps {
  warningMessage: string;
  onApprove: () => void;
  onReject: () => void;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  warningMessage,
  onApprove,
  onReject,
}) => {
  return (
    <div className="mx-3 my-2 bg-amber-950/90 border border-amber-500/50 rounded-xl p-3 shadow-xl text-xs animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 text-amber-300 font-bold mb-1.5">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <span>Konfirmasi Aksi Berisiko (Human-in-the-Loop)</span>
      </div>

      <p className="text-[11px] text-amber-200/90 bg-amber-950/60 p-2 rounded-lg border border-amber-800/60 mb-3 leading-relaxed">
        {warningMessage}
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={onApprove}
          className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Setujui & Lanjutkan
        </button>

        <button
          onClick={onReject}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
        >
          <XCircle className="w-3.5 h-3.5 text-rose-400" /> Tolak Aksi
        </button>
      </div>
    </div>
  );
};
