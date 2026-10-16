export type MacroButtonName =
  | "a"
  | "b"
  | "x"
  | "y"
  | "l"
  | "r"
  | "zl"
  | "zr"
  | "minus"
  | "plus"
  | "home"
  | "capture"
  | "l_stick_click"
  | "r_stick_click";

export type MacroActionType = "button" | "stick" | "dpad" | "wait";

export interface MacroAction {
  id: string;
  type: MacroActionType;
  // For button action
  button?: MacroButtonName;
  // For stick action
  stick?: "left" | "right";
  stickX?: number; // 0..255 (128 center)
  stickY?: number; // 0..255 (128 center)
  // For dpad action
  dpad?: number; // 0..8
  // Timing parameters
  durationMs: number; // how long to hold this state (ms)
  delayAfterMs: number; // pause after releasing before next action (ms)
  // Optional note for this step
  note?: string;
}

export interface MacroScript {
  id: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  actions: MacroAction[];
  isPreset?: boolean;
}

export type MacroLoopMode = "once" | "count" | "infinite";

export interface MacroPlaybackConfig {
  loopMode: MacroLoopMode;
  loopCount: number; // e.g., 3, 5, 10
  loopDelayMs: number; // delay between loops (ms)
  speedMultiplier: number; // 0.5, 1, 1.5, 2
}

export interface MacroPlayerStatus {
  isPlaying: boolean;
  isPaused: boolean;
  currentScriptId: string | null;
  currentActionIndex: number;
  currentLoop: number;
  totalLoops: number;
  progressPercent: number;
  elapsedMs: number;
}

export type RecordingPhase = "idle" | "countdown" | "recording";
