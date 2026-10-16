import React from "react";
import { X, Sparkles, Radio } from "lucide-react";

interface Props {
  countdown: number;
  onCancel: () => void;
}

export const CountdownOverlay: React.FC<Props> = ({ countdown, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative flex flex-col items-center justify-center max-w-sm w-full mx-4 p-8 rounded-3xl bg-zinc-900/90 border border-zinc-700/80 shadow-[0_0_50px_rgba(244,63,94,0.25)] text-center">
        {/* Close / Cancel Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          title="取消倒數"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Pulsing Target Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center animate-ping absolute inset-0" />
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 to-violet-600 flex items-center justify-center shadow-lg shadow-rose-500/30 relative">
            <Radio className="w-9 h-9 text-white animate-pulse" />
          </div>
        </div>

        <h3 className="text-sm font-semibold tracking-wide uppercase text-rose-400 mb-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> 即將開始側錄行為
        </h3>
        <p className="text-xs text-zinc-400 mb-8 max-w-xs">
          請握好實體手把、鍵盤或就位，倒數結束後將完整捕捉每一個按鍵與搖桿微操！
        </p>

        {/* Big Countdown Number */}
        <div className="relative flex items-center justify-center w-28 h-28 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-rose-500/20 animate-spin" />
          <span
            key={countdown}
            className="text-7xl font-black tracking-tight text-white font-mono drop-shadow-[0_0_25px_rgba(244,63,94,0.8)] animate-scale-up"
          >
            {countdown}
          </span>
        </div>

        <button
          onClick={onCancel}
          className="px-6 py-2 rounded-xl text-xs font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 hover:text-zinc-200 transition-colors cursor-pointer border border-zinc-700"
        >
          取消錄製 (Esc)
        </button>
      </div>
    </div>
  );
};
