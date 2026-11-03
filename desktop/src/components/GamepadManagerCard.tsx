import React, { useState } from "react";
import { GamepadInfo } from "../types";
import { Gamepad2, RefreshCw, HelpCircle, Check } from "lucide-react";

interface Props {
  gamepads: GamepadInfo[];
  isMuted: boolean;
  onRefresh: () => void;
  onSelectGamepad: (id: number | null) => void;
  onToggleMute: () => void;
}

export const GamepadManagerCard: React.FC<Props> = ({
  gamepads,
  isMuted,
  onRefresh,
  onSelectGamepad,
  onToggleMute,
}) => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle">
        <div>
          <h3 className="font-semibold text-sm text-text-primary">控制器設定</h3>
          <p className="text-xs text-text-muted mt-0.5">
            已連線 <span className="font-mono text-text-primary font-medium">{gamepads.length}</span> 個輸入裝置
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onRefresh}
            title="重新掃描"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-input transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowGuide(!showGuide)}
            title="8BitDo Micro 配對說明"
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              showGuide ? "text-text-primary bg-surface-input" : "text-text-muted hover:text-text-primary hover:bg-surface-input"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Signal Transmission Toggle Row */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-surface-input border border-border-subtle">
        <div>
          <div className="text-xs font-medium text-text-primary">手把訊號監聽</div>
          <div className="text-[11px] text-text-muted">控制是否即時轉送動作至 ESP32</div>
        </div>

        <button
          onClick={onToggleMute}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 cursor-pointer ${
            isMuted
              ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
              : "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isMuted ? "bg-amber-500" : "bg-emerald-500"
            }`}
          />
          <span>{isMuted ? "已暫停" : "輸入啟用"}</span>
        </button>
      </div>

      {/* Connected Gamepads List */}
      <div className="space-y-2">
        <div className="text-[11px] font-medium text-text-muted tracking-wider">偵測到的裝置</div>

        {gamepads.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-xl bg-surface-input/50 border border-border-subtle">
            <Gamepad2 className="w-5 h-5 text-text-muted mx-auto mb-1.5" />
            <p className="text-xs text-text-primary">尚未偵測到手把</p>
            <p className="text-[11px] text-text-muted mt-0.5">請先於 Mac 藍牙設定完成配對</p>
          </div>
        ) : (
          gamepads.map((g) => (
            <div
              key={g.id}
              onClick={() => onSelectGamepad(g.id)}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                g.is_active
                  ? "bg-surface-card border-border-focus text-text-primary shadow-xs"
                  : "bg-surface-input/60 border-border-subtle text-text-muted hover:border-border-element hover:text-text-primary"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    g.is_connected ? "bg-emerald-500" : "bg-border-element"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-text-primary truncate">
                    {g.name || "標準手把"}
                  </div>
                  <div className="text-[10px] text-text-muted font-mono mt-0.5">
                    ID #{g.id}
                  </div>
                </div>
              </div>

              {g.is_active && (
                <span className="px-2 py-0.5 rounded-md bg-surface-input border border-border-subtle text-[10px] font-medium text-text-primary flex items-center gap-1 shrink-0">
                  <Check className="w-3 h-3 text-text-secondary" />
                  主控
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pairing Instructions Accordion */}
      {showGuide && (
        <div className="p-3.5 rounded-xl bg-surface-input border border-border-subtle text-xs space-y-2 text-text-secondary">
          <div className="font-medium text-text-primary">8BitDo Micro 配對步驟</div>
          <ol className="list-decimal list-inside space-y-1 text-text-muted text-[11px] leading-relaxed">
            <li>將底部撥鈕切換至 <strong>S 模式</strong>（或 D 模式）。</li>
            <li>長按頂部配對鈕 3 秒至指示燈流動閃爍。</li>
            <li>在 Mac <strong>「系統設定」➔「藍牙」</strong> 點擊連線。</li>
            <li>配對完成後此處將自動識別並連線。</li>
          </ol>
        </div>
      )}
    </div>
  );
};
