export interface TourPin {
  id: string;
  number: string;
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  title: string;
  detail: string;
}

export interface TourTab {
  id: "dashboard" | "macro" | "macro-edit" | "hardware";
  label: string;
  caption: string;
  image: string;
  alt: string;
  pins: TourPin[];
}

export interface KeyMappingItem {
  key: string;
  code: string;
  switchLabel: string;
  group: "stick" | "action" | "dpad" | "shoulder" | "system";
  hint: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface TrackItem {
  id: "action" | "dpad" | "stick" | "shoulder" | "system";
  label: string;
  color: string;
}

export interface SiteContent {
  meta: {
    locale: string;
    brand: string;
    pageTitle: string;
    skipToContent: string;
    githubUrl: string;
    releasesUrl: string;
  };
  nav: {
    items: Array<{ id: string; label: string }>;
    downloadCta: string;
    openMenu: string;
    closeMenu: string;
    languageLabel: string;
  };
  hero: {
    title: string;
    lead: string;
    secondaryCta: string;
    mascotBubble: string;
    diagram: {
      title: string;
      note: string;
      nodes: Array<{ id: string; title: string; sub: string }>;
      links: {
        usb: string;
        bt: string;
      };
    };
  };
  quickStart: {
    heading: string;
    subheading: string;
    steps: Array<{
      step: number;
      title: string;
      summary: string;
      tip: string;
    }>;
    hardwarePhoto: {
      badge: string;
      title: string;
      caption: string;
      alt: string;
      image: string;
    };
    macosGatekeeper: {
      title: string;
      why: string;
      toggleLabel: string;
      methodA: {
        title: string;
        steps: string[];
      };
      methodB: {
        title: string;
        desc: string;
        command: string;
        copyLabel: string;
        copiedLabel: string;
      };
    };
  };
  controls: {
    heading: string;
    subheading: string;
    simulationBadge: string;
    simulationBanner: string;
    tryHint: string;
    muteToggle: {
      activeLabel: string;
      mutedLabel: string;
    };
    statusMuted: string;
    statusIdle: string;
    timelineTitle: string;
    timelineSubtitle: string;
    timelineTracksHeader: string;
    timelineNowLabel: string;
    timelineOpCountLabel: string;
    timelineDurationLabel: string;
    timelineClearLabel: string;
    tracks: readonly TrackItem[];
    cheatSheetTitle: string;
    keyGroups: Array<{
      title: string;
      keys: Array<{ label: string; desc: string }>;
    }>;
    handyTips: Array<{
      title: string;
      body: string;
      note: string;
    }>;
  };
  macro: {
    heading: string;
    subheading: string;
    steps: Array<{
      id: "record" | "edit" | "loop";
      step: string;
      title: string;
      desc: string;
    }>;
    workbench: {
      tablistAriaLabel: string;
      record: {
        recordingBadge: string;
        countdownPrefix: string;
        replayButton: string;
        capturedTitle: string;
        highlights: string[];
      };
      edit: {
        previewTitle: string;
        totalLengthLabel: string;
        rowScaleAriaLabel: string;
        secPerRowUnit: string;
        resetButton: string;
        systemWaitTrackLabel: string;
        selectedBlockLabel: string;
        deleteButton: string;
        selectBlockHint: string;
        addActionButton: string;
        addWaitButton: string;
        rowCapHint5s: string;
        rowCapHint10s: string;
      };
      loop: {
        panelTitle: string;
        jsonBadge: string;
        modeOnce: string;
        modeCount: string;
        modeInfinite: string;
        countLabel: string;
        decreaseAriaLabel: string;
        increaseAriaLabel: string;
        onceDesc: string;
        infiniteDesc: string;
        runningLabel: string;
        counterOnce: string;
        counterUnit: string;
        counterInfinite: string;
      };
    };
    emergencyNote: string;
    showcase: {
      title: string;
      subtitle: string;
      description: string;
      syncBadge: string;
      syncLinkLabel: string;
      syncStatusReady: string;
      syncStatusBuffering: string;
      syncStatusWaiting: string;
      syncStandbyHint: string;
      pauseSyncAriaLabel: string;
      playSyncAriaLabel: string;
      restartSyncAriaLabel: string;
      scrubberAriaLabel: string;
      speedGroupAriaLabel: string;
      appScreenLabel: string;
      switchScreenLabel: string;
      switchVideoReady: boolean;
      switchVideoSrc: string;
      switchVideoCaption: string;
      switchVideoPlaceholderTitle: string;
      switchVideoPlaceholderHint: string;
      appVideoReady: boolean;
      appVideoSrc: string;
      appVideoCaption: string;
      appVideoPlaceholderTitle: string;
      appVideoPlaceholderHint: string;
      scriptReady: boolean;
      scriptSrc: string;
      scriptReadyLabel: string;
      scriptPlaceholderLabel: string;
      scriptHint: string;
    };
  };
  tour: {
    heading: string;
    subheading: string;
    tablistAriaLabel: string;
    pinListAriaLabel: string;
    tabs: TourTab[];
  };
  faq: {
    heading: string;
    subheading: string;
    mascotBubble: string;
    items: FaqItem[];
  };
  footer: {
    ctaTitle: string;
    ctaBody: string;
    downloadButton: string;
    docsButton: string;
    releasesLinkLabel: string;
    copyright: string;
  };
}

export const zhTWContent: SiteContent = {
  meta: {
    locale: "zh-TW",
    brand: "Ghost-Pad",
    pageTitle: "Ghost-Pad｜把電腦變成 Nintendo Switch 的可愛遙控中心",
    skipToContent: "跳至主要內容",
    githubUrl: "https://github.com/HuskyHsu/ghost-pad",
    releasesUrl: "https://github.com/HuskyHsu/ghost-pad/releases",
  },
  nav: {
    items: [
      { id: "tour", label: "畫面導覽" },
      { id: "controls", label: "邊按邊學" },
      { id: "macro", label: "巨集自動玩" },
      { id: "quickstart", label: "3 步驟連線" },
      { id: "faq", label: "常見問題" },
    ],
    downloadCta: "Download macOS",
    openMenu: "開啟導覽選單",
    closeMenu: "關閉導覽選單",
    languageLabel: "切換語言",
  },
  hero: {
    title: "用電腦直接控制 Nintendo Switch",
    lead: "用鍵盤、滑鼠或手邊的實體手把，透過一塊小小的 ESP32 開發板，就能以 60Hz 穩定無線操控 Switch，還能錄製巨集幫你重複刷關。",
    secondaryCta: "前往下載 macOS 版",
    mascotBubble: "哈囉！我會把你的電腦操作翻譯成原廠 Pro 手把訊號送給 Switch 喔！",
    diagram: {
      title: "10 秒看懂 Ghost-Pad 怎麼運作",
      note: "不需要改機，Switch 會把它認作一支普通的原廠 Pro 手把",
      nodes: [
        { id: "pc", title: "電腦端 Ghost-Pad", sub: "鍵盤 / 手把 / 巨集" },
        { id: "esp32", title: "ESP32 開發板", sub: "USB 供電 + 藍牙模擬" },
        { id: "switch", title: "Nintendo Switch", sub: "1P Pro 手把連線" },
      ],
      links: {
        usb: "USB 60Hz 傳送",
        bt: "Bluetooth Classic 無線",
      },
    },
  },
  quickStart: {
    heading: "三步驟完成安裝與連線",
    subheading: "照著順序做，不用寫任何程式，幾分鐘就能看到 Switch 亮起 1P 燈號。",
    steps: [
      {
        step: 1,
        title: "下載 Ghost-Pad 並打開 App",
        summary: "從 GitHub Releases 下載最新的 universal.dmg（同時支援 Apple Silicon 與 Intel Mac），把 Ghost-Pad 拖進「應用程式」資料夾。",
        tip: "首次打開時 macOS 可能會跳出安全性提醒，看下方手繪小紙條就能 10 秒解除！",
      },
      {
        step: 2,
        title: "插上 ESP32，點一下燒錄韌體",
        summary: "用 USB 傳輸線把 ESP32 接到電腦，打開 Ghost-Pad 的「ESP32 與韌體」分頁，軟體會自動找到序列埠，點「一鍵燒錄」就完成。",
        tip: "記得選購支援 Bluetooth Classic (BR/EDR) 的標準 ESP32 開發板喔！",
      },
      {
        step: 3,
        title: "Switch 藍牙配對，立刻開玩",
        summary: "在 Switch 主畫面進入「控制器 → 更改握法／順序」，回到 Ghost-Pad 點擊「首次配對（送出 L+R）」，等畫面跳出 1P 圖示就成功了。",
        tip: "配對成功後，下次只要點「手動喚醒重連」就能秒速接回來。",
      },
    ],
    hardwarePhoto: {
      badge: "實機連線參考",
      title: "實際硬體只需要這樣接",
      caption: "Mac 透過一條 USB 線接上標準 ESP32-WROOM-32 開發板，無需麵包板或杜邦線，即可透過藍牙連線 Nintendo Switch。",
      alt: "Mac 透過 USB 連接 ESP32 開發板並與 Nintendo Switch 配對的桌面實拍示意圖",
      image: "./hardware-setup.jpg",
    },
    macosGatekeeper: {
      title: "macOS 跳出「無法驗證開發者」或「已損毀」怎麼辦？",
      why: "Ghost-Pad 是免費開源軟體，尚未付費申請 Apple 公證，首次開啟可能被系統擋下。點此查看 10 秒解除方式。",
      toggleLabel: "展開或收合 macOS 安全性提醒解決方法",
      methodA: {
        title: "方法 A｜從系統設定點一下（最推薦新手）",
        steps: [
          "先雙擊 Ghost-Pad，看到警告視窗時點「完成」或「好」。",
          "打開 Mac 的「系統設定 → 隱私權與安全性」。",
          "往下滑找到「已阻擋使用 Ghost-Pad」，點擊旁邊的「強制打開」並輸入密碼即可。",
        ],
      },
      methodB: {
        title: "方法 B｜如果顯示「已損毀，無法打開」",
        desc: "打開 Mac 的「終端機（Terminal）」，貼上並執行這行指令，這只會移除 macOS 的下載隔離標記，不會動到系統其他設定：",
        command: "xattr -cr /Applications/Ghost-Pad.app",
        copyLabel: "複製指令",
        copiedLabel: "已複製",
      },
    },
  },
  controls: {
    heading: "即時操作試玩",
    subheading: "支援實體手把、鍵盤與滑鼠同時輸入。現在就可以敲敲鍵盤或點下方按鍵，看看畫面與時序流怎麼反應。",
    simulationBadge: "模擬預覽",
    simulationBanner: "網頁互動模擬畫面，不會實際傳送訊號至 Switch",
    tryHint: "試著按鍵盤 W A S D 移動搖桿，或按 I J K L 觸發 X Y B A",
    muteToggle: {
      activeLabel: "輸入轉發中（點擊暫停）",
      mutedLabel: "已暫停轉發（靜音中）",
    },
    statusMuted: "已靜音 (MUTED)",
    statusIdle: "待機中 · 60Hz",
    timelineTitle: "即時操作時序流",
    timelineSubtitle: "每個按鍵按多久都會化成一條長按光帶，從左側 NOW 往右流動（30 秒視窗），方便看清連招節奏。",
    timelineTracksHeader: "軌道",
    timelineNowLabel: "NOW",
    timelineOpCountLabel: "操作次數",
    timelineDurationLabel: "總長度 30s",
    timelineClearLabel: "清除時序紀錄",
    tracks: [
      { id: "action", label: "ABXY", color: "#38bdf8" },
      { id: "dpad", label: "十字鍵", color: "#a855f7" },
      { id: "stick", label: "搖桿", color: "#06b6d4" },
      { id: "shoulder", label: "肩鍵", color: "#f43f5e" },
      { id: "system", label: "系統", color: "#94a3b8" },
    ] as const,
    cheatSheetTitle: "常用鍵盤對照表",
    keyGroups: [
      {
        title: "左搖桿（支援斜向）",
        keys: [
          { label: "W / A / S / D", desc: "上 / 左 / 下 / 右" },
          { label: "F / G", desc: "按下左搖桿 L3 / 右搖桿 R3" },
        ],
      },
      {
        title: "右側動作鍵",
        keys: [
          { label: "L", desc: "A 鍵（確認）" },
          { label: "K", desc: "B 鍵（取消）" },
          { label: "I", desc: "X 鍵（選單）" },
          { label: "J", desc: "Y 鍵（功能）" },
        ],
      },
      {
        title: "十字鍵與肩鍵",
        keys: [
          { label: "↑ ↓ ← →", desc: "十字方向鍵" },
          { label: "Q / E", desc: "ZL / L 左肩鍵" },
          { label: "U / O", desc: "R / ZR 右肩鍵" },
        ],
      },
      {
        title: "系統功能鍵",
        keys: [
          { label: "M (-) / P (=)", desc: "Minus (-) / Plus (+)" },
          { label: "H / N", desc: "Home 主畫面 / 截圖鍵" },
        ],
      },
    ],
    handyTips: [
      {
        title: "暫停輸入轉發（靜音模式）",
        body: "不是把電腦喇叭關靜音，而是暫時把按鍵訊號停下來。ESP32 還是穩穩連著 Switch 1P 不會斷線，讓你切回電腦回訊息或查攻略時，完全不怕誤觸遊戲角色。",
        note: "再點一下立刻恢復操作",
      },
      {
        title: "手把、鍵盤、滑鼠三路無縫並存",
        body: "不用切換輸入模式！你可以平常拿實體手把玩，臨時用鍵盤補按快捷鍵，或直接用滑鼠點畫面按鈕，所有輸入會即時自動合併送給 Switch。",
        note: "支援 8BitDo、Pro 手把與 Joy-Con",
      },
    ],
  },
  macro: {
    heading: "巨集錄製與自動循環",
    subheading: "遇到需要重複刷關或農素材的場景，只要錄一次操作、在時間軸微調好節奏，就能交給程式自動循環執行。",
    steps: [
      {
        id: "record",
        step: "1",
        title: "3-2-1 倒數，毫秒級精準錄製",
        desc: "按下錄製會倒數 3 秒讓你準備，接著用實體手把或鍵盤正常玩一遍，每個按鍵的按住時間與搖桿方向都會完整記下來。",
      },
      {
        id: "edit",
        step: "2",
        title: "5 軌時間軸視覺微調",
        desc: "錄完後會攤開成 5 軌時間軸，可切換每列顯示秒數（5s–30s）與復原／重做；在任一動作方塊按右鍵就能修改按住毫秒、換鍵或刪除，也能手動新增手把動作與空白等待 (Wait)。",
      },
      {
        id: "loop",
        step: "3",
        title: "選好循環模式，放手自動跑",
        desc: "支援「單次 / 指定次數 (2–999) / 無限循環 ∞」三種執行模式，還能匯出 JSON 備份或直接拖曳匯入朋友分享的腳本。",
      },
    ],
    workbench: {
      tablistAriaLabel: "巨集工作坊三步驟示範",
      record: {
        recordingBadge: "錄製中 REC",
        countdownPrefix: "倒數準備",
        replayButton: "重播 3-2-1 倒數",
        capturedTitle: "已擷取操作序列",
        highlights: [
          "免寫腳本，正常玩一遍就錄好",
          "60Hz 同步擷取按壓毫秒與搖桿",
          "實體手把／鍵盤／滑鼠皆可錄製",
        ],
      },
      edit: {
        previewTitle: "5 軌時間軸預覽",
        totalLengthLabel: "總長度",
        rowScaleAriaLabel: "每行時間尺度",
        secPerRowUnit: "秒 / 行",
        resetButton: "復原",
        systemWaitTrackLabel: "系統/等待",
        selectedBlockLabel: "已選取方塊",
        deleteButton: "刪除",
        selectBlockHint: "點擊上方任一動作方塊，即可試玩調整按住毫秒或刪除（桌面版支援右鍵選單）。",
        addActionButton: "新增動作",
        addWaitButton: "新增等待 (Wait)",
        rowCapHint5s: "示範區上限為單行長度，可切換 10 秒 / 行 或在 App 中自動換行",
        rowCapHint10s: "示範區上限為單行長度，在實際 App 中會自動換行",
      },
      loop: {
        panelTitle: "循環模式（單次 / 指定次數 / 無限）",
        jsonBadge: "JSON 匯出／拖曳匯入",
        modeOnce: "單次",
        modeCount: "指定次數",
        modeInfinite: "無限",
        countLabel: "次數設定（2–999 次）",
        decreaseAriaLabel: "減少次數",
        increaseAriaLabel: "增加次數",
        onceDesc: "完整執行 1 輪操作後自動停止，適合先測試腳本節奏。",
        infiniteDesc: "持續循環執行，直到手動停止。",
        runningLabel: "自動執行中",
        counterOnce: "1 / 1 次",
        counterUnit: "次",
        counterInfinite: "∞ 持續循環",
      },
    },
    emergencyNote: "安全煞車提醒：巨集執行中隨時按鍵盤 Esc 鍵，就會立刻強制中止並放開所有按鍵！",
    showcase: {
      title: "實戰範例：《寶可夢 火紅／葉綠》金珠橋自動刷金珠",
      subtitle: "第二道館（華藍市北方）重複自爆打火箭隊刷金珠自動化腳本",
      description:
        "透過 Ghost-Pad 錄製完整的對話、推進與自爆循環流程，設定無限循環即可在 Switch 上穩定自動刷取金珠。",
      // Flip switchVideoReady / appVideoReady / scriptReady to true once files are added under website/public/demos/
      syncBadge: "雙畫面同步播放",
      syncLinkLabel: "App ⇄ Switch",
      syncStatusReady: "16:9 × 2 同步就緒",
      syncStatusBuffering: "緩衝同步中…",
      syncStatusWaiting: "16:9 × 2 待放入影片",
      syncStandbyHint: "待錄影檔與 JSON 腳本補齊後，即可於此同步對照觀看、拖曳進度並下載匯入使用。",
      pauseSyncAriaLabel: "暫停同步播放",
      playSyncAriaLabel: "開始同步播放",
      restartSyncAriaLabel: "從頭重播",
      scrubberAriaLabel: "雙畫面同步進度條",
      speedGroupAriaLabel: "同步播放倍速",
      appScreenLabel: "Ghost-Pad 應用程式端",
      switchScreenLabel: "Nintendo Switch 遊戲端",
      switchVideoReady: true,
      switchVideoSrc: "./demos/Geodude_Self-Destruct_Nugget_switch.mp4",
      switchVideoCaption: "實際自動推進對話與自爆刷金珠流程",
      switchVideoPlaceholderTitle: "Switch 遊戲端實機錄影（預留位置）",
      switchVideoPlaceholderHint: "放入 website/public/demos/Geodude_Self-Destruct_Nugget_switch.mp4 後開啟顯示",
      appVideoReady: true,
      appVideoSrc: "./demos/Geodude_Self-Destruct_Nugget_app.mp4",
      appVideoCaption: "同步顯示巨集循環與 5 軌輸入時序流",
      appVideoPlaceholderTitle: "Ghost-Pad 應用程式端錄影（預留位置）",
      appVideoPlaceholderHint: "放入 website/public/demos/Geodude_Self-Destruct_Nugget_app.mp4 後開啟顯示",
      scriptReady: true,
      scriptSrc: "./demos/Geodude_Self-Destruct_Nugget.json",
      scriptReadyLabel: "下載 Geodude_Self-Destruct_Nugget.json",
      scriptPlaceholderLabel: "Geodude_Self-Destruct_Nugget.json 準備中",
      scriptHint: "下載後直接拖進 Ghost-Pad「巨集工作坊」即可匯入執行",
    },
  },
  tour: {
    heading: "軟體介面導覽",
    subheading: "點選分頁切換畫面，點擊圖上的編號可查看對應功能。",
    tablistAriaLabel: "軟體介面導覽分頁",
    pinListAriaLabel: "畫面標註清單",
    tabs: [
      {
        id: "dashboard",
        label: "即時儀表板",
        caption: "平常玩遊戲最常停留在這一頁：看手把動態、切換暫停轉發、檢查連線狀態。",
        image: "./screenshots/zh-TW/dashboard.png",
        alt: "Ghost-Pad 即時視覺化儀表板與時序流畫面",
        pins: [
          {
            id: "d1",
            number: "1",
            x: 11,
            y: 24,
            title: "左側導覽與硬體狀態",
            detail: "在這裡切換「即時儀表板 / 巨集腳本庫 / ESP32 與韌體」，並即時看到手把 → 電腦 → ESP32 → Switch 的連線燈號。",
          },
          {
            id: "d2",
            number: "2",
            x: 19,
            y: 59,
            title: "輸入轉發開關（靜音）",
            detail: "臨時要在電腦打字時，關掉輸入轉發就能維持 Switch 1P 連線不中斷，同時不怕誤觸遊戲按鍵。",
          },
          {
            id: "d3",
            number: "3",
            x: 56,
            y: 42,
            title: "互動式幽靈 2D 手把",
            detail: "即時同步你的實體手把與鍵盤輸入；你也可以直接用滑鼠點擊按鍵或拖曳雙搖桿。",
          },
          {
            id: "d4",
            number: "4",
            x: 56,
            y: 78,
            title: "5 軌即時輸入時序流",
            detail: "把按鍵記錄成 5 軌光帶，可切換 10s～60s 捲動速度，練習節奏或除錯超清楚。",
          },
          {
            id: "d5",
            number: "5",
            x: 47,
            y: 95,
            title: "底部巨集快速播放列",
            detail: "不用切換分頁就能直接選擇腳本、點綠色「播放」開始執行，並設定單次／循環次數／無限循環；執行中按 Esc 可立即停止，手動操作手把也會自動暫停讓你接手。",
          },
        ],
      },
      {
        id: "macro",
        label: "巨集腳本庫",
        caption: "錄製、剪輯與循環播放自動化腳本的地方，支援拖曳排序與 JSON 備份。",
        image: "./screenshots/zh-TW/macro-studio.png",
        alt: "Ghost-Pad 巨集工作坊與循環播放引擎畫面",
        pins: [
          {
            id: "m1",
            number: "1",
            x: 84,
            y: 6,
            title: "巨集腳本清單與匯入匯出",
            detail: "管理所有錄好的腳本，支援單一腳本 JSON 匯出分享、整庫備份，或直接把 .json 拖進來匯入。",
          },
          {
            id: "m2",
            number: "2",
            x: 47,
            y: 95,
            title: "底部播放與循環控制列",
            detail: "一鍵啟動 3-2-1 倒數錄製，並設定單次／指定次數／無限循環播放。",
          },
          {
            id: "m3",
            number: "3",
            x: 56,
            y: 34,
            title: "5 軌時間軸視覺編輯器",
            detail: "像剪輯音樂一樣檢視每個按鍵的起始時間與毫秒長度，支援直接拖拉移動位置或拉曳邊緣調整時長（含 10ms 智慧吸附），也能點擊開啟詳細動作編輯視窗。",
          },
        ],
      },
      {
        id: "macro-edit",
        label: "按鍵編輯與拖拉",
        caption: "點擊時間軸上的任意方塊即可開啟動作編輯視窗，搭配拖拉移動與邊緣縮放，毫秒微調超直覺。",
        image: "./screenshots/zh-TW/macro-edit.png",
        alt: "Ghost-Pad 巨集按鍵編輯與時間軸拖拉微調畫面",
        pins: [
          {
            id: "me1",
            number: "1",
            x: 50,
            y: 33,
            title: "起點時間與按壓時長微調",
            detail: "可直接輸入起點毫秒與按壓持續時間，或一鍵套用 60ms–500ms 常用預設時長；回到時間軸也能直接拖拉方塊移動起點、拉曳左右邊緣縮放長度。",
          },
          {
            id: "me2",
            number: "2",
            x: 50,
            y: 55,
            title: "全手把按鍵與搖桿選擇器",
            detail: "涵蓋十字鍵、ABXY、L/ZL/R/ZR 肩鍵、左右類比搖桿方向與系統功能鍵，也能一鍵轉換成空白等待 (Wait)。",
          },
          {
            id: "me3",
            number: "3",
            x: 69,
            y: 24,
            title: "步驟排序與快速插入動作",
            detail: "右上角 ↑ ↓ 可直接調整步驟前後順序，底部還能在此步驟後插入空白等待或新的手把動作。",
          },
        ],
      },
      {
        id: "hardware",
        label: "ESP32 與韌體",
        caption: "第一次接上 ESP32 燒錄韌體，以及跟 Nintendo Switch 進行藍牙配對都在這裡完成。",
        image: "./screenshots/zh-TW/hardware.png",
        alt: "Ghost-Pad ESP32 硬體設定與 Switch 配對畫面",
        pins: [
          {
            id: "h1",
            number: "1",
            x: 42,
            y: 28,
            title: "USB 序列埠自動偵測",
            detail: "自動辨識常見的 CH340、CP2102、FTDI 晶片序列埠，選好點連線即可建立 60Hz 穩定心跳。",
          },
          {
            id: "h2",
            number: "2",
            x: 78,
            y: 32,
            title: "一鍵燒錄內建韌體",
            detail: "軟體已內建預編譯好的 PRO-UART0.bin 韌體，不用額外安裝 Python 或打終端機指令就能完成燒錄。",
          },
          {
            id: "h3",
            number: "3",
            x: 56,
            y: 72,
            title: "Switch 藍牙配對引導",
            detail: "跟著畫面步驟在 Switch 打開「更改握法／順序」，點一下即可發送配對訊號取得 1P 連線。",
          },
        ],
      },
    ],
  },
  faq: {
    heading: "新手常見問題",
    subheading: "開始前常遇到的幾個問題，整理在這裡。",
    mascotBubble: "找不到答案的話，也可以直接到 GitHub Issues 問我喔！",
    items: [
      {
        id: "esp32-type",
        question: "ESP32 開發板要買哪一種？隨便一塊都可以嗎？",
        answer:
          "請務必選擇支援「Bluetooth Classic (BR/EDR)」的標準 ESP32（例如常見的 ESP32-WROOM-32 / ESP32 DevKitC）。注意 ESP32-S2、ESP32-S3、ESP32-C3 等型號僅支援低功耗藍牙（BLE）或無藍牙，無法模擬 Switch Pro 手把。",
      },
      {
        id: "no-gamepad",
        question: "一定要有實體手把才能用 Ghost-Pad 嗎？",
        answer:
          "完全不用！Ghost-Pad 支援純鍵盤（WASD + IJKL）以及直接用滑鼠點擊畫面上的 2D 手把操作，沒有外接手把也能完整控制 Switch 與錄製巨集。",
      },
      {
        id: "supported-gamepads",
        question: "如果我有實體手把，支援哪些型號？",
        answer:
          "支援常見的藍牙或 USB 手把，包含 8BitDo Micro、Nintendo Switch Pro Controller、Joy-Con 等。接上電腦後 Ghost-Pad 會以低於 1ms 的輪詢速度同步轉發，而且還能跟鍵盤操作無縫並存。",
      },
      {
        id: "macro-stop",
        question: "巨集無限循環跑起來停不下來怎麼辦？",
        answer:
          "隨時按下鍵盤的 Esc 鍵就能全域緊急煞車！除此之外，硬體底層還有 200ms 斷線防卡鍵保護（Watchdog），就算 USB 意外拔掉，Switch 上的角色也會自動鬆開按鍵不會一直往前衝。",
      },
      {
        id: "share-macro",
        question: "我錄好的巨集可以傳給朋友用嗎？",
        answer:
          "可以！在巨集工作坊中點選匯出就能存成輕巧的 .json 檔案；朋友拿到檔案後只要直接把 .json 拖進 Ghost-Pad 視窗裡就匯入完成。",
      },
    ],
  },
  footer: {
    ctaTitle: "立即下載試用",
    ctaBody: "下載最新 macOS 通用版（支援 Apple Silicon 與 Intel），免費開源、無需設定開發環境。",
    downloadButton: "前往 GitHub Releases 下載",
    docsButton: "查看完整專案與技術文件",
    releasesLinkLabel: "Releases",
    copyright: "Ghost-Pad · Open Source · GPL-3.0 License",
  },
};
