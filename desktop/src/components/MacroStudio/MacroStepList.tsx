import { ChevronDown, ChevronUp, Clock, Compass, Plus, Scissors, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { MacroAction, MacroButtonName } from '../../types/macro';
import { trimMacroActions } from '../../utils/macroStorage';

interface Props {
  actions: MacroAction[];
  activeActionIndex?: number;
  onChangeActions: (actions: MacroAction[]) => void;
}

interface NumberInputProps {
  value: number;
  min?: number;
  step?: number;
  onChange: (val: number) => void;
  className?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({ value, min = 0, step = 10, onChange, className }) => {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <input
      type='number'
      min={min}
      step={step}
      value={text}
      onChange={(e) => {
        const val = e.target.value;
        setText(val);
        if (val !== '' && !isNaN(Number(val))) {
          onChange(Math.max(min, Number(val)));
        }
      }}
      onBlur={() => {
        const num = Math.max(min, Number(text) || min);
        setText(String(num));
        onChange(num);
      }}
      className={className}
    />
  );
};

const AVAILABLE_BUTTONS: { value: MacroButtonName; label: string }[] = [
  { value: 'a', label: 'A 按鍵' },
  { value: 'b', label: 'B 按鍵' },
  { value: 'x', label: 'X 按鍵' },
  { value: 'y', label: 'Y 按鍵' },
  { value: 'l', label: 'L 肩鍵' },
  { value: 'r', label: 'R 肩鍵' },
  { value: 'zl', label: 'ZL 扳機' },
  { value: 'zr', label: 'ZR 扳機' },
  { value: 'minus', label: 'Minus (-)' },
  { value: 'plus', label: 'Plus (+)' },
  { value: 'home', label: 'Home (⌂)' },
  { value: 'capture', label: 'Capture (◉)' },
  { value: 'l_stick_click', label: 'L3 下壓' },
  { value: 'r_stick_click', label: 'R3 下壓' },
];

export const MacroStepList: React.FC<Props> = ({ actions, activeActionIndex = -1, onChangeActions }) => {
  const handleUpdateAction = (index: number, updates: Partial<MacroAction>) => {
    const next = [...actions];
    next[index] = { ...next[index], ...updates };
    onChangeActions(next);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...actions];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    onChangeActions(next);
  };

  const handleMoveDown = (index: number) => {
    if (index >= actions.length - 1) return;
    const next = [...actions];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    onChangeActions(next);
  };

  const handleDelete = (index: number) => {
    const next = actions.filter((_, i) => i !== index);
    onChangeActions(next);
  };

  const handleAddDefaultAction = (type: 'button' | 'stick' | 'wait') => {
    const id = `act-new-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nextStart = actions.length > 0 ? Math.max(...actions.map((a) => a.startTimeMs + a.durationMs)) : 0;
    let newAct: MacroAction;

    if (type === 'button') {
      newAct = {
        id,
        type: 'button',
        button: 'a',
        startTimeMs: nextStart,
        durationMs: 120,
      };
    } else if (type === 'stick') {
      newAct = {
        id,
        type: 'stick',
        stick: 'left',
        stickX: 128,
        stickY: 0,
        startTimeMs: nextStart,
        durationMs: 300,
      };
    } else {
      newAct = {
        id,
        type: 'wait',
        startTimeMs: nextStart,
        durationMs: 200,
      };
    }

    onChangeActions([...actions, newAct]);
  };

  const handleTrim = () => {
    const trimmed = trimMacroActions(actions);
    onChangeActions(trimmed);
  };

  return (
    <div className='flex flex-col gap-3'>
      {/* Top Bar */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='text-xs font-semibold text-text-primary'>動作時序清單 ({actions.length} 步驟)</span>
        </div>

        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={handleTrim}
            className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-card hover:bg-surface-input text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-element transition-colors cursor-pointer shadow-xs'
            title='自動移除無效等待或過長空檔'
          >
            <Scissors className='w-3.5 h-3.5 text-amber-600' />
            <span>修剪頭尾空白</span>
          </button>
        </div>
      </div>

      {/* Action Cards List */}
      <div className='space-y-2 select-none'>
        {actions.map((act, index) => {
          const isActive = activeActionIndex === index;

          return (
            <div
              key={act.id}
              className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                isActive ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-300 shadow-sm' : 'bg-surface-card border-border-subtle hover:border-border-element shadow-xs'
              }`}
            >
              {/* Left Section: Index & Type */}
              <div className='flex items-center gap-3'>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                    isActive ? 'bg-slate-900 text-white' : 'bg-surface-input text-text-muted border border-border-subtle'
                  }`}
                >
                  #{index + 1}
                </div>

                {/* Type Selection */}
                <select
                  value={act.type}
                  onChange={(e) =>
                    handleUpdateAction(index, {
                      type: e.target.value as any,
                      button: e.target.value === 'button' ? act.button || 'a' : undefined,
                      stick: e.target.value === 'stick' ? act.stick || 'left' : undefined,
                    })
                  }
                  className='px-2 py-1.5 rounded-lg bg-surface-input border border-border-element text-xs text-text-primary focus:outline-none focus:border-border-focus cursor-pointer font-medium'
                >
                  <option value='button'>按鍵動作</option>
                  <option value='stick'>搖桿位移</option>
                  <option value='dpad'>十字鍵</option>
                  <option value='wait'>等待時間</option>
                </select>

                {/* Sub-parameters based on Type */}
                {act.type === 'button' && (
                  <select
                    value={act.button || 'a'}
                    onChange={(e) =>
                      handleUpdateAction(index, {
                        button: e.target.value as MacroButtonName,
                      })
                    }
                    className='px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 focus:outline-none cursor-pointer'
                  >
                    {AVAILABLE_BUTTONS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                )}

                {act.type === 'stick' && (
                  <div className='flex items-center gap-1.5'>
                    <select
                      value={act.stick || 'left'}
                      onChange={(e) => handleUpdateAction(index, { stick: e.target.value as any })}
                      className='px-2 py-1.5 rounded-lg bg-cyan-50 border border-cyan-300 text-xs font-semibold text-cyan-900 cursor-pointer'
                    >
                      <option value='left'>左搖桿 (L)</option>
                      <option value='right'>右搖桿 (R)</option>
                    </select>

                    {/* Quick Stick Direction */}
                    <div className='flex items-center gap-1'>
                      <button
                        type='button'
                        onClick={() => handleUpdateAction(index, { stickX: 128, stickY: 0 })}
                        className={`px-1.5 py-1 text-[10px] rounded border cursor-pointer ${
                          act.stickX === 128 && act.stickY === 0
                            ? 'bg-cyan-600 text-white border-cyan-700 font-bold shadow-xs'
                            : 'bg-surface-card text-text-secondary border-border-subtle hover:bg-surface-input'
                        }`}
                        title='向上推到底'
                      >
                        ▲ 上
                      </button>
                      <button
                        type='button'
                        onClick={() => handleUpdateAction(index, { stickX: 128, stickY: 255 })}
                        className={`px-1.5 py-1 text-[10px] rounded border cursor-pointer ${
                          act.stickX === 128 && act.stickY === 255
                            ? 'bg-cyan-600 text-white border-cyan-700 font-bold shadow-xs'
                            : 'bg-surface-card text-text-secondary border-border-subtle hover:bg-surface-input'
                        }`}
                        title='向下推到底'
                      >
                        ▼ 下
                      </button>
                      <button
                        type='button'
                        onClick={() => handleUpdateAction(index, { stickX: 0, stickY: 128 })}
                        className={`px-1.5 py-1 text-[10px] rounded border cursor-pointer ${
                          act.stickX === 0 && act.stickY === 128
                            ? 'bg-cyan-600 text-white border-cyan-700 font-bold shadow-xs'
                            : 'bg-surface-card text-text-secondary border-border-subtle hover:bg-surface-input'
                        }`}
                        title='向左推到底'
                      >
                        ◀ 左
                      </button>
                      <button
                        type='button'
                        onClick={() => handleUpdateAction(index, { stickX: 255, stickY: 128 })}
                        className={`px-1.5 py-1 text-[10px] rounded border cursor-pointer ${
                          act.stickX === 255 && act.stickY === 128
                            ? 'bg-cyan-600 text-white border-cyan-700 font-bold shadow-xs'
                            : 'bg-surface-card text-text-secondary border-border-subtle hover:bg-surface-input'
                        }`}
                        title='向右推到底'
                      >
                        ▶ 右
                      </button>
                    </div>
                  </div>
                )}

                {act.type === 'dpad' && (
                  <select
                    value={act.dpad ?? 0}
                    onChange={(e) => handleUpdateAction(index, { dpad: Number(e.target.value) })}
                    className='px-2 py-1.5 rounded-lg bg-purple-50 border border-purple-300 text-xs font-semibold text-purple-900 cursor-pointer'
                  >
                    <option value={0}>▲ 上</option>
                    <option value={1}>↗ 右上</option>
                    <option value={2}>▶ 右</option>
                    <option value={3}>↘ 右下</option>
                    <option value={4}>▼ 下</option>
                    <option value={5}>↙ 左下</option>
                    <option value={6}>◀ 左</option>
                    <option value={7}>↖ 左上</option>
                  </select>
                )}
              </div>

              {/* Middle Section: Start Time & Hold Duration */}
              <div className='flex items-center gap-3 flex-wrap'>
                <div className='flex items-center gap-1.5'>
                  <span className='text-[10px] text-text-muted font-medium'>起點:</span>
                  <NumberInput
                    key={`step-start-${act.id}`}
                    min={0}
                    step={50}
                    value={act.startTimeMs}
                    onChange={(val) =>
                      handleUpdateAction(index, {
                        startTimeMs: val,
                      })
                    }
                    className='w-16 px-2 py-1 rounded bg-surface-card border border-border-element text-xs font-mono font-bold text-text-primary text-right focus:outline-none focus:border-border-focus shadow-xs'
                  />
                  <span className='text-[10px] text-text-muted font-mono'>ms</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <span className='text-[10px] text-text-muted font-medium'>{act.type === 'wait' ? '等待:' : '持續:'}</span>
                  <NumberInput
                    key={`step-dur-${act.id}`}
                    min={10}
                    step={10}
                    value={act.durationMs}
                    onChange={(val) =>
                      handleUpdateAction(index, {
                        durationMs: val,
                      })
                    }
                    className='w-16 px-2 py-1 rounded bg-surface-card border border-border-element text-xs font-mono font-bold text-text-primary text-right focus:outline-none focus:border-border-focus shadow-xs'
                  />
                  <span className='text-[10px] text-text-muted font-mono'>ms</span>
                </div>
              </div>

              {/* Right Section: Ordering & Deletion */}
              <div className='flex items-center gap-1 self-end md:self-auto'>
                <button
                  type='button'
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className='p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-input disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer transition-colors'
                  title='上移'
                >
                  <ChevronUp className='w-4 h-4' />
                </button>
                <button
                  type='button'
                  onClick={() => handleMoveDown(index)}
                  disabled={index === actions.length - 1}
                  className='p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-input disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer transition-colors'
                  title='下移'
                >
                  <ChevronDown className='w-4 h-4' />
                </button>
                <button
                  type='button'
                  onClick={() => handleDelete(index)}
                  className='p-1 rounded text-text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer'
                  title='刪除步驟'
                >
                  <Trash2 className='w-4 h-4' />
                </button>
              </div>
            </div>
          );
        })}

        {actions.length === 0 && (
          <div className='p-8 text-center text-text-muted border border-dashed border-border-element rounded-2xl bg-surface-card shadow-xs'>
            目前尚無動作步驟，可點擊下方按鈕新增步驟或從即時儀表板進行側錄！
          </div>
        )}
      </div>

      {/* Add Action Buttons Bar */}
      <div className='flex items-center gap-2 pt-2'>
        <button
          type='button'
          onClick={() => handleAddDefaultAction('button')}
          className='flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 text-xs font-semibold text-emerald-800 transition-colors cursor-pointer shadow-xs'
        >
          <Plus className='w-3.5 h-3.5' />
          <span>+ 新增按鍵動作</span>
        </button>
        <button
          type='button'
          onClick={() => handleAddDefaultAction('stick')}
          className='flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-cyan-300 hover:border-cyan-500 bg-cyan-50/50 hover:bg-cyan-50 text-xs font-semibold text-cyan-800 transition-colors cursor-pointer shadow-xs'
        >
          <Compass className='w-3.5 h-3.5' />
          <span>+ 新增搖桿位移</span>
        </button>
        <button
          type='button'
          onClick={() => handleAddDefaultAction('wait')}
          className='flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/50 hover:bg-amber-50 text-xs font-semibold text-amber-900 transition-colors cursor-pointer shadow-xs'
        >
          <Clock className='w-3.5 h-3.5' />
          <span>+ 新增等待暫停</span>
        </button>
      </div>
    </div>
  );
};
