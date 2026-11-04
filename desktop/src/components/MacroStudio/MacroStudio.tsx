import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MacroPlaybackConfig, MacroPlayerStatus, MacroScript } from '../../types/macro';
import { exportAllMacrosAsJson, exportMacroAsJson, importAllMacrosFromJson } from '../../utils/macroStorage';
import { useToast } from '../../context/ToastContext';
import { MacroEditor } from './MacroEditor';
import { MacroLibraryView } from './MacroLibraryView';
import { MacroPlayerBar } from './MacroPlayerBar';

interface Props {
  macros: MacroScript[];
  selectedScriptId: string | null;
  onSelectScript: (id: string) => void;
  onSaveScript: (script: MacroScript) => void;
  onDuplicateScript: (script: MacroScript) => void;
  onDeleteScript: (id: string) => void;
  onImportScripts: (scripts: MacroScript[]) => void;
  playerStatus: MacroPlayerStatus;
  playerConfig: MacroPlaybackConfig;
  onChangePlayerConfig: (updates: Partial<MacroPlaybackConfig>) => void;
  onPlay: (script: MacroScript) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export const MacroStudio: React.FC<Props> = ({
  macros,
  selectedScriptId,
  onSelectScript,
  onSaveScript,
  onDuplicateScript,
  onDeleteScript,
  onImportScripts,
  playerStatus,
  playerConfig,
  onChangePlayerConfig,
  onPlay,
  onPause,
  onResume,
  onStop,
}) => {
  const { t } = useTranslation('macro');
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');

  const handleExportSingle = async (script: MacroScript) => {
    const savedPath = await exportMacroAsJson(script);
    if (savedPath) {
      showToast({
        type: 'success',
        title: t('export_success_title', '檔案儲存成功'),
        message: savedPath,
      });
    }
  };

  const handleExportAll = async () => {
    const savedPath = await exportAllMacrosAsJson(macros);
    if (savedPath) {
      showToast({
        type: 'success',
        title: t('export_success_title', '檔案儲存成功'),
        message: savedPath,
      });
    }
  };

  const [liveScript, setLiveScript] = useState<MacroScript | null>(null);

  const activeScript = macros.find((m) => m.id === selectedScriptId) || macros[0] || null;
  const currentEditingScript = liveScript && activeScript && liveScript.id === activeScript.id ? liveScript : activeScript;

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const importedList = importAllMacrosFromJson(content);
      if (importedList && importedList.length > 0) {
        onImportScripts(importedList);
        showToast({
          type: 'success',
          title: t('import_success_title', '腳本匯入成功'),
          message: t('import_success_desc', { count: importedList.length, defaultValue: `成功匯入 ${importedList.length} 個巨集腳本` }),
        });
      } else {
        showToast({
          type: 'error',
          title: t('import_error_title', '匯入失敗'),
          message: t('invalid_json_alert', '無法識別此 JSON 格式，請確認是否為 Ghost-Pad 腳本檔案。'),
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSelectAndEdit = (id: string) => {
    onSelectScript(id);
    setLiveScript(null);
    setViewMode('edit');
  };

  return (
    <div className='flex-1 flex flex-col h-full overflow-hidden bg-window-base select-none'>
      {/* Hidden file input for import */}
      <input ref={fileInputRef} type='file' accept='.json' className='hidden' onChange={handleFileChange} />

      {/* Main Full-Width Stage: Switches cleanly between Library List and Editor */}
      <div className='flex-1 flex overflow-hidden'>
        {viewMode === 'list' ? (
          <MacroLibraryView
            scripts={macros}
            onSelectAndEdit={handleSelectAndEdit}
            onDuplicateScript={onDuplicateScript}
            onDeleteScript={onDeleteScript}
            onImportJson={handleTriggerFileInput}
            onExportAll={handleExportAll}
            onExportSingle={handleExportSingle}
          />
        ) : activeScript ? (
          <MacroEditor
            script={activeScript}
            activeActionIndex={playerStatus.isPlaying && playerStatus.currentScriptId === activeScript.id ? playerStatus.currentActionIndex : -1}
            playerStatus={playerStatus}
            onChangeScript={setLiveScript}
            onSaveScript={(updated) => {
              setLiveScript(updated);
              onSaveScript(updated);
            }}
            onDuplicateScript={onDuplicateScript}
            onDeleteScript={(id) => {
              onDeleteScript(id);
              setViewMode('list');
            }}
            onBackToList={() => setViewMode('list')}
          />
        ) : (
          <MacroLibraryView
            scripts={macros}
            onSelectAndEdit={handleSelectAndEdit}
            onDuplicateScript={onDuplicateScript}
            onDeleteScript={onDeleteScript}
            onImportJson={handleTriggerFileInput}
            onExportAll={handleExportAll}
            onExportSingle={handleExportSingle}
          />
        )}
      </div>

      {/* Bottom Sticky Playback Console Bar - Always plays latest actions in editor view */}
      {viewMode === 'edit' && currentEditingScript && (
        <MacroPlayerBar
          script={currentEditingScript}
          status={playerStatus}
          config={playerConfig}
          onChangeConfig={onChangePlayerConfig}
          onPlay={() => onPlay(currentEditingScript)}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
        />
      )}
    </div>
  );
};
