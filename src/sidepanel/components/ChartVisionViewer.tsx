import React from 'react';
import { Camera, Clock } from 'lucide-react';

interface ChartVisionViewerProps {
  imageUrl: string;
  timestamp: string;
}

export const ChartVisionViewer: React.FC<ChartVisionViewerProps> = ({ imageUrl, timestamp }) => {
  return (
    <div className="mx-3 my-2 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 shadow-lg text-xs">
      <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] mb-2">
        <span className="flex items-center gap-1 font-semibold text-cyan-400">
          <Camera className="w-3.5 h-3.5" /> Live Vision Chart Snapshot
        </span>
        <span className="flex items-center gap-1 text-slate-500">
          <Clock className="w-3 h-3" /> {timestamp}
        </span>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-slate-800 group">
        <img src={imageUrl} alt="Trading Vision Snapshot" className="w-full h-auto max-h-48 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
          <span className="text-[9px] text-cyan-300 font-mono">Analyzed by SenseNova 6.8 Vision Engine</span>
        </div>
      </div>
    </div>
  );
};
