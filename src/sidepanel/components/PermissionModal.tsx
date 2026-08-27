import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Shield, ShieldAlert, X } from 'lucide-react';
import { DomainPermissionSetting } from '../../core/types/agent';
import { PermissionManager } from '../../modules/security/PermissionManager';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDomain: string;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({ isOpen, onClose, currentDomain }) => {
  const [mode, setMode] = useState<'auto' | 'approval'>('approval');

  useEffect(() => {
    if (currentDomain) {
      PermissionManager.getDomainPermission(currentDomain).then((res) => {
        setMode(res);
      });
    }
  }, [currentDomain, isOpen]);

  if (!isOpen) return null;

  const handleToggle = async (newMode: 'auto' | 'approval') => {
    setMode(newMode);
    await PermissionManager.setDomainPermission(currentDomain, newMode);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-4 shadow-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="flex items-center gap-2 font-bold text-xs text-slate-200">
            <Shield className="w-4 h-4 text-cyan-400" /> Site Permission Matrix
          </span>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Domain</span>
          <p className="text-xs font-mono font-bold text-cyan-300">{currentDomain || 'Unknown Domain'}</p>
        </div>

        <div className="space-y-2 text-xs">
          <span className="text-slate-400 text-[11px]">Security Guardrail Mode:</span>

          <div
            onClick={() => handleToggle('auto')}
            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              mode === 'auto'
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-200 shadow-md shadow-cyan-500/10'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <div>
                <p className="font-semibold text-xs text-slate-200">Full Auto Mode</p>
                <p className="text-[10px] text-slate-400">Eksekusi semua aksi tanpa jeda konfirmasi.</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => handleToggle('approval')}
            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              mode === 'approval'
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-200 shadow-md shadow-amber-500/10'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <div>
                <p className="font-semibold text-xs text-slate-200">Human-in-the-Loop Mode</p>
                <p className="text-[10px] text-slate-400">Pause & minta konfirmasi untuk aksi berisiko (Hapus, Pay, Publish).</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
