import { ArrowLeft, Check, Copy, Download, Save, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MacroAction, MacroPlayerStatus, MacroScript } from '../../types/macro';
import { exportMacroAsJson } from '../../utils/macroStorage';
import { useToast } from '../../context/ToastContext';
import { MacroScoreSheet } from './MacroScoreSheet';

interface Props {
  script: MacroScript;
  activeActionIndex?: number;
  playerStatus?: MacroPlayerStatus;
  onChangeScript: (script: MacroScript) => void;
  onSaveScript: (script: MacroScript) => void;
  onDuplicateScript: (script: MacroScript) => void;
  onDeleteScript: (id: string) => void;
  onBackToList?: () => void;
}

export const MacroEditor: React.FC<Props> = ({ script, activeActionIndex = -1, playerStatus, onChangeScript, onSaveScript, onDuplicateScript, onDeleteScript, onBackToList }) => {
  const { t } = useTranslation('macro');
  const { showToast } = useToast();
  const [name, setName] = useState(script.name);
  const [description, setDescription] = useState(script.description || '');
  const [actions, setActions] = useState<MacroAction[]>(script.actions);
  const [hasSaved, setHasSaved] = useState(false);
  const [hasExported, setHasExported] = useState(false);

  const handleExport = async () => {
    const savedPath = await exportMacroAsJson({ ...script, name, description, actions });
    if (savedPath) {
      setHasExported(true);
      setTimeout(() => setHasExported(false), 2000);
      showToast({
        type: 'success',
        title: t('export_success_title', '檔案儲存成功'),
        message: savedPath,
      });
    }
  };

  // Sync state when incoming script ID changes
  useEffect(() => {
    setName(script.name);
    setDescription(script.description || '');
    setActions(script.actions);
  }, [script.id]);

  const handleActionsChange = (newActions: MacroAction[]) => {
    setActions(newActions);
    onChangeScript({
      ...script,
      name,
      description,
      actions: newActions,
      updatedAt: Date.now(),
    });
  };

  const handleSave = () => {
    const updated: MacroScript = {
      ...script,
      name: name.trim() || t('untitled_macro', '未命名巨集'),
      description: description.trim(),
      actions,
      updatedAt: Date.now(),
    };
    onSaveScript(updated);
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
  };

  return (
    <div className='flex-1 flex flex-col h-full overflow-hidden bg-window-base select-none relative'>
      {/* 1. Unified Top Header */}
      <div className='h-16 px-6 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface-card/80 backdrop-blur-sm z-30 gap-4'>
        {/* Left: Navigation Back & Editable Title / Description */}
        <div className='flex items-center gap-3 min-w-0 flex-1'>
          {onBackToList && (
            <>
              <button
                type='button'
                onClick={onBackToList}
                className='flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium bg-surface-card hover:bg-interactive-hover text-text-primary transition-colors cursor-pointer border border-border-subtle hover:border-border-element shrink-0 shadow-xs whitespace-nowrap'
              >
                <ArrowLeft className='w-3.5 h-3.5 text-text-muted shrink-0' />
                <span className='whitespace-nowrap'>{t('back_to_list', '返回清單')}</span>
              </button>
              <div className='w-px h-5 bg-border-subtle shrink-0' />
            </>
          )}

          <div className='min-w-0 flex-1 space-y-0.5'>
            <div className='flex items-center gap-2'>
              <input
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className='text-sm font-semibold tracking-tight text-text-primary bg-transparent border-b border-transparent hover:border-border-element focus:border-border-focus focus:outline-none max-w-xs sm:max-w-md px-1 py-0.5 rounded transition-colors'
                placeholder={t('title_placeholder', '腳本標題...')}
              />
            </div>
            <input
              type='text'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className='w-full text-xs text-text-muted bg-transparent border-b border-transparent hover:border-border-subtle focus:border-border-focus focus:outline-none px-1 py-0.5 transition-colors truncate'
              placeholder={t('note_placeholder', '填寫腳本備註說明或使用場合...')}
            />
          </div>
        </div>

        {/* Right: Actions (Clean toolbar with icon buttons & primary Save CTA) */}
        <div className='flex items-center gap-2 shrink-0'>
          <button
            type='button'
            onClick={handleExport}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer shadow-xs shrink-0 ${
              hasExported
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-300'
                : 'bg-surface-card hover:bg-interactive-hover text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-element'
            }`}
            title={hasExported ? t('export_success_title', '檔案儲存成功') : t('export_json_tooltip', '匯出單一 JSON 腳本檔案')}
            aria-label={t('export_single_btn', '匯出')}
          >
            {hasExported ? <Check className='w-3.5 h-3.5 shrink-0' /> : <Download className='w-3.5 h-3.5 shrink-0' />}
          </button>

          <button
            type='button'
            onClick={() => onDuplicateScript({ ...script, name, description, actions })}
            className='w-8 h-8 rounded-md flex items-center justify-center bg-surface-card hover:bg-interactive-hover text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-element transition-colors cursor-pointer shadow-xs shrink-0'
            title={t('duplicate_tooltip', '複製一份新腳本')}
            aria-label={t('duplicate_btn', '複製')}
          >
            <Copy className='w-3.5 h-3.5 shrink-0' />
          </button>

          <button
            type='button'
            onClick={() => onDeleteScript(script.id)}
            className='w-8 h-8 rounded-md flex items-center justify-center bg-surface-card hover:bg-rose-50 text-text-muted hover:text-rose-600 border border-border-subtle hover:border-rose-200 transition-colors cursor-pointer shadow-xs shrink-0'
            title={t('delete_tooltip', '刪除此腳本')}
            aria-label={t('delete_tooltip', '刪除此腳本')}
          >
            <Trash2 className='w-3.5 h-3.5 shrink-0' />
          </button>

          <div className='w-px h-4 bg-border-subtle mx-0.5 shrink-0' />

          <button
            type='button'
            onClick={handleSave}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
              hasSaved ? 'bg-feedback-success-bg border border-feedback-success-border text-feedback-success-text' : 'bg-accent hover:bg-accent/90 text-accent-foreground shadow-xs'
            }`}
          >
            {hasSaved ? <Check className='w-3.5 h-3.5 shrink-0' /> : <Save className='w-3.5 h-3.5 shrink-0' />}
            <span className='whitespace-nowrap'>{hasSaved ? t('saved', '已儲存') : t('save_changes', '儲存變更')}</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Body */}
      <div className='flex-1 overflow-y-auto px-6 py-5 w-full max-w-6xl mx-auto space-y-5 min-h-0'>
        <MacroScoreSheet script={{ ...script, actions }} activeActionIndex={activeActionIndex} playerStatus={playerStatus} onChangeActions={handleActionsChange} />
      </div>
    </div>
  );
};
