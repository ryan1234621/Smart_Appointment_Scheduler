import React from 'react';
import { minutesToFormatted12h } from '../../engine/intervalMath';
import { Coffee, Sparkles } from 'lucide-react';

interface BreakCardProps {
  label: string;
  startMinute: number;
  endMinute: number;
  pixelsPerMinute: number;
  gridStartMinute: number;
}

export const BreakCard: React.FC<BreakCardProps> = ({
  label,
  startMinute,
  endMinute,
  pixelsPerMinute,
  gridStartMinute,
}) => {
  const top = (startMinute - gridStartMinute) * pixelsPerMinute;
  const height = (endMinute - startMinute) * pixelsPerMinute;

  return (
    <div
      className="absolute left-1 right-1 rounded border border-slate-300/80 bg-break-pattern flex flex-col items-center justify-center p-1 text-center select-none z-0 overflow-hidden"
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
      title={`${label} (${minutesToFormatted12h(startMinute)} - ${minutesToFormatted12h(endMinute)})`}
    >
      <div className="flex items-center gap-1.5 text-slate-600 bg-white/85 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-xs">
        <Coffee className="w-3 h-3 text-slate-500" />
        <span className="truncate max-w-[140px]">{label}</span>
      </div>
      <span className="text-[9px] text-slate-500 font-medium mt-0.5 bg-white/70 px-1.5 rounded">
        {minutesToFormatted12h(startMinute)} – {minutesToFormatted12h(endMinute)}
      </span>
    </div>
  );
};
