import type { SiteContent } from './zh-TW';

export const jaContent: SiteContent = {
  meta: {
    locale: 'ja',
    brand: 'Ghost-Pad',
    pageTitle: 'Ghost-Pad｜PCを Nintendo Switch のかわいい操作ハブに',
    skipToContent: 'メインコンテンツへスキップ',
    githubUrl: 'https://github.com/HuskyHsu/ghost-pad',
    releasesUrl: 'https://github.com/HuskyHsu/ghost-pad/releases',
  },
  nav: {
    items: [
      { id: 'tour', label: '画面案内' },
      { id: 'controls', label: '操作体験' },
      { id: 'macro', label: 'マクロ' },
      { id: 'quickstart', label: '3ステップ' },
      { id: 'faq', label: 'FAQ' },
    ],
    downloadCta: 'Download macOS',
    openMenu: 'ナビゲーションメニューを開く',
    closeMenu: 'ナビゲーションメニューを閉じる',
    languageLabel: '言語を切り替え',
  },
  hero: {
    title: 'PC から Nintendo Switch をワイヤレス操作',
    lead: 'キーボード、マウス、手元のゲームパッドを使って、小さな ESP32 ボード経由で Switch を 60Hz で安定ワイヤレス操作。周回用のマクロ録画・自動再生も思いのままです。',
    secondaryCta: 'macOS 版をダウンロード',
    mascotBubble: 'こんにちは！PC の操作を純正 Pro コン信号に変換して Switch へ届けるよ！',
    diagram: {
      title: '10 秒でわかる Ghost-Pad のしくみ',
      note: '本体の改造は不要。Switch からは普通の純正 Pro コントローラーとして認識されます',
      nodes: [
        { id: 'pc', title: 'PC 側 Ghost-Pad', sub: 'キーボード / コントローラー / マクロ' },
        { id: 'esp32', title: 'ESP32 開発ボード', sub: 'USB 給電 + Bluetooth エミュレート' },
        { id: 'switch', title: 'Nintendo Switch', sub: '1P Pro コンとして接続' },
      ],
      links: {
        usb: 'USB 60Hz 送信',
        bt: 'Bluetooth Classic 無線',
      },
    },
  },
  quickStart: {
    heading: '3 ステップでインストール＆接続完了',
    subheading:
      '順番に進めるだけでプログラミング知識は不要。数分で Switch に 1P ランプが点灯します。',
    steps: [
      {
        step: 1,
        title: 'Ghost-Pad をダウンロードして起動',
        summary:
          'GitHub Releases から最新の universal.dmg（Apple Silicon / Intel Mac 両対応）を入手し、Ghost-Pad を「アプリケーション」フォルダへドラッグします。',
        tip: '初回起動時に macOS のセキュリティ警告が出ても、下のメモを見れば 10 秒で解除できます！',
      },
      {
        step: 2,
        title: 'ESP32 をつないでワンクリック書き込み',
        summary:
          'USB ケーブルで ESP32 を PC に接続し、Ghost-Pad の「ESP32 とファームウェア」タブを開くとシリアルポートを自動検出。「ワンクリック書き込み」を押すだけで完了です。',
        tip: 'Bluetooth Classic (BR/EDR) 対応の標準 ESP32 ボードを選んでね！',
      },
      {
        step: 3,
        title: 'Switch とペアリングしてすぐプレイ',
        summary:
          'Switch のホーム画面から「コントローラー → 持ちかた／順番を変える」を開き、Ghost-Pad で「初回ペアリング（L+R 送信）」をクリック。1P アイコンが出たら成功です。',
        tip: '一度ペアリングすれば、次回からは「手動ウェイク再接続」で一瞬でつながります。',
      },
    ],
    hardwarePhoto: {
      badge: '実機接続イメージ',
      title: '必要な配線は USB ケーブル 1 本だけ',
      caption:
        'Mac と標準の ESP32-WROOM-32 開発ボードを USB ケーブル 1 本でつなぐだけ。ブレッドボードやジャンパー線は不要で、Bluetooth で Nintendo Switch とつながります。',
      alt: 'Mac と ESP32 開発ボードを USB で接続し、Nintendo Switch と連携しているデスク写真',
      image: './hardware-setup.jpg',
    },
    macosGatekeeper: {
      title: 'macOS で「開発元を検証できない」や「壊れている」と表示されたら？',
      why: 'Ghost-Pad は無料のオープンソースソフトのため、Apple の有料公証を受けておらず初回起動時にブロックされる場合があります。クリックして解除方法を見る。',
      toggleLabel: 'macOS セキュリティ警告の対処法を開閉',
      methodA: {
        title: '方法 A｜システム設定から許可する（初心者におすすめ）',
        steps: [
          'Ghost-Pad をダブルクリックし、警告ダイアログで「完了」または「OK」を押します。',
          'Mac の「システム設定 → プライバシーとセキュリティ」を開きます。',
          '下へスクロールして「Ghost-Pad の使用がブロックされました」の横にある「このまま開く」をクリックし、パスワードを入力します。',
        ],
      },
      methodB: {
        title: '方法 B｜「壊れているため開けません」と出る場合',
        desc: 'Mac の「ターミナル（Terminal）」を開き、次の 1 行を貼り付けて実行してください。ダウンロード時の隔離フラグを外すだけで、他の設定には影響しません：',
        command: 'xattr -cr /Applications/Ghost-Pad.app',
        copyLabel: 'コマンドをコピー',
        copiedLabel: 'コピーしました',
      },
    },
  },
  controls: {
    heading: 'リアルタイム操作デモ',
    subheading:
      '物理コントローラー・キーボード・マウスの 3 系統を同時入力できます。キーボードや下のボタンを押して、画面とタイムラインの動きを試してみてください。',
    simulationBadge: 'シミュレーション',
    simulationBanner: 'ブラウザ上の体験プレビューです（実際の Switch へは送信されません）',
    tryHint: 'W A S D で左スティック、I J K L で X Y B A を押してみよう',
    muteToggle: {
      activeLabel: '入力転送中（クリックで一時停止）',
      mutedLabel: '転送を一時停止中（ミュート）',
    },
    statusMuted: 'ミュート中',
    statusIdle: '待機中 · 60Hz',
    timelineTitle: 'リアルタイム入力タイムライン',
    timelineSubtitle:
      'ボタンを押した長さがリボンになり、左端の NOW から右へ流れます（30 秒ウィンドウ）。コンボのタイミング確認に便利です。',
    timelineTracksHeader: 'トラック',
    timelineNowLabel: 'NOW',
    timelineOpCountLabel: '入力回数',
    timelineDurationLabel: '表示幅 30s',
    timelineClearLabel: 'タイムライン履歴をクリア',
    tracks: [
      { id: 'action', label: 'ABXY', color: '#38bdf8' },
      { id: 'dpad', label: '十字キー', color: '#a855f7' },
      { id: 'stick', label: 'スティック', color: '#06b6d4' },
      { id: 'shoulder', label: 'LRトリガー', color: '#f43f5e' },
      { id: 'system', label: 'システム', color: '#94a3b8' },
    ] as const,
    cheatSheetTitle: 'キーボード対応表',
    keyGroups: [
      {
        title: '左スティック（斜め対応）',
        keys: [
          { label: 'W / A / S / D', desc: '上 / 左 / 下 / 右' },
          { label: 'F / G', desc: '左スティック押込 L3 / 右スティック押込 R3' },
        ],
      },
      {
        title: '右側アクションボタン',
        keys: [
          { label: 'L', desc: 'A ボタン（決定）' },
          { label: 'K', desc: 'B ボタン（キャンセル）' },
          { label: 'I', desc: 'X ボタン（メニュー）' },
          { label: 'J', desc: 'Y ボタン（アクション）' },
        ],
      },
      {
        title: '十字キー＆LR トリガー',
        keys: [
          { label: '↑ ↓ ← →', desc: '十字ボタン' },
          { label: 'Q / E', desc: 'ZL / L 左トリガー' },
          { label: 'U / O', desc: 'R / ZR 右トリガー' },
        ],
      },
      {
        title: 'システムボタン',
        keys: [
          { label: 'M (-) / P (=)', desc: 'マイナス (-) / プラス (+)' },
          { label: 'H / N', desc: 'HOME ボタン / キャプチャー' },
        ],
      },
    ],
    handyTips: [
      {
        title: '入力転送の一時停止（ミュートモード）',
        body: 'PC の音量を消すのではなく、Switch へのボタン送信だけを一時停止します。ESP32 と 1P 接続は切れないまま、チャット返信や攻略検索をしてもゲームキャラが誤操作されません。',
        note: 'もう一度クリックですぐ再開',
      },
      {
        title: 'コントローラー・キーボード・マウスを同時併用',
        body: '入力モードの切り替えは不要です。普段はコントローラーで遊びつつ、キーボードや画面クリックもいつでも併用でき、リアルタイムに自動で統合されます。',
        note: '8BitDo・Pro コン・Joy-Con に対応',
      },
    ],
  },
  macro: {
    heading: 'マクロ録画＆自動ループ',
    subheading:
      '素材集めや周回などの反復操作は、一度録画してタイムラインで微調整するだけで自動ループ実行できます。',
    steps: [
      {
        id: 'record',
        step: '1',
        title: '3-2-1 カウントダウンでミリ秒録画',
        desc: '録画を押すと 3 秒カウントダウン。コントローラーやキーボードで普段どおり 1 周プレイするだけで、長押し時間やスティックの傾きを正確に記録します。',
      },
      {
        id: 'edit',
        step: '2',
        title: '5 トラック・タイムラインで視覚編集',
        desc: '録画した操作は 5 トラックのタイムラインに展開。行スケール切替（5s〜30s）や取り消し／やり直しに対応し、右クリックで長押しミリ秒変更・キー差し替え・削除、手動での操作や待機 (Wait) 追加も行えます。',
      },
      {
        id: 'loop',
        step: '3',
        title: 'ループを選んでハンズフリー自動実行',
        desc: '「1 回 / 回数指定 (2–999) / 無限ループ ∞」の 3 モードに対応。JSON 書き出しでバックアップしたり、友だちのスクリプトをドラッグ＆ドロップで取り込めます。',
      },
    ],
    workbench: {
      tablistAriaLabel: 'マクロスタジオ 3 ステップ体験デモ',
      record: {
        recordingBadge: '録画中 REC',
        countdownPrefix: 'カウントダウン',
        replayButton: '3-2-1 をもう一度見る',
        capturedTitle: 'キャプチャ済み入力シーケンス',
        highlights: [
          'コード不要・普段どおり 1 周遊ぶだけ',
          '60Hz ミリ秒長押し＆スティック記録',
          'コントローラー・キーボード・マウス対応',
        ],
      },
      edit: {
        previewTitle: '5 トラック・タイムラインプレビュー',
        totalLengthLabel: '合計',
        rowScaleAriaLabel: '1 行あたりの時間スケール',
        secPerRowUnit: '秒 / 行',
        resetButton: '元に戻す',
        systemWaitTrackLabel: 'システム/待機',
        selectedBlockLabel: '選択中',
        deleteButton: '削除',
        selectBlockHint:
          '上のアクションブロックをクリックすると、長押しミリ秒の調整や削除を試せます（デスクトップ版は右クリックメニュー対応）。',
        addActionButton: '操作を追加',
        addWaitButton: '待機 (Wait) を追加',
        rowCapHint5s:
          'デモ欄の上限は 1 行分です。10 秒 / 行 に切り替えるか、アプリ本体では自動で折り返されます。',
        rowCapHint10s: 'デモ欄の上限は 1 行分です。実際のアプリでは自動で次の行へ折り返されます。',
      },
      loop: {
        panelTitle: 'ループモード（1 回 / 回数指定 / 無限）',
        jsonBadge: 'JSON 書き出し／ドラッグ取込',
        modeOnce: '1 回',
        modeCount: '回数指定',
        modeInfinite: '無限',
        countLabel: '繰り返し回数（2–999 回）',
        decreaseAriaLabel: '回数を減らす',
        increaseAriaLabel: '回数を増やす',
        onceDesc: '1 周だけ再生して自動停止します。スクリプトのタイミング確認に便利です。',
        infiniteDesc: '手動で停止するまで連続ループ再生します。',
        runningLabel: '自動再生中',
        counterOnce: '1 / 1 回',
        counterUnit: '回',
        counterInfinite: '∞ 連続ループ',
      },
    },
    emergencyNote:
      '緊急ブレーキ：マクロ実行中でもキーボードの Esc キーを押せば即座に強制停止し、すべてのボタンを離します！',
    showcase: {
      title: '実例：『ポケモン ファイアレッド／リーフグリーン』ゴールデンボールブリッジ周回',
      subtitle: 'ハナダシティ北のロケット団員で「きんのたま」を無限回収する自動化スクリプト',
      description:
        '会話・移動・リセットの一連の操作を Ghost-Pad で録画して無限ループに設定すれば、Switch 上で安定してきんのたまを自動回収できます。',
      syncBadge: '2 画面同期再生',
      syncLinkLabel: 'App ⇄ Switch',
      syncStatusReady: '16:9 × 2 同期準備完了',
      syncStatusBuffering: 'バッファリング同期中…',
      syncStatusWaiting: '16:9 × 2 動画準備中',
      syncStandbyHint:
        '録画ファイルと JSON スクリプトが揃うと、この場で同期再生やダウンロード取り込みができるようになります。',
      pauseSyncAriaLabel: '同期再生を一時停止',
      playSyncAriaLabel: '同期再生を開始',
      restartSyncAriaLabel: '最初から再生',
      scrubberAriaLabel: '2 画面同期シークバー',
      speedGroupAriaLabel: '同期再生速度',
      appScreenLabel: 'Ghost-Pad デスクトップアプリ',
      switchScreenLabel: 'Nintendo Switch 実機画面',
      switchVideoReady: true,
      switchVideoSrc: './demos/Geodude_Self-Destruct_Nugget_switch.mp4',
      switchVideoCaption: 'Switch 実機での会話送り＆きんのたま回収ループ',
      switchVideoPlaceholderTitle: 'Switch 実機録画（プレースホルダー）',
      switchVideoPlaceholderHint:
        'website/public/demos/Geodude_Self-Destruct_Nugget_switch.mp4 を配置して有効化',
      appVideoReady: true,
      appVideoSrc: './demos/Geodude_Self-Destruct_Nugget_app.mp4',
      appVideoCaption: 'マクロループ実行と 5 トラック入力タイムラインの同期表示',
      appVideoPlaceholderTitle: 'Ghost-Pad アプリ録画（プレースホルダー）',
      appVideoPlaceholderHint:
        'website/public/demos/Geodude_Self-Destruct_Nugget_app.mp4 を配置して有効化',
      scriptReady: true,
      scriptSrc: './demos/Geodude_Self-Destruct_Nugget.json',
      scriptReadyLabel: 'Geodude_Self-Destruct_Nugget.json をダウンロード',
      scriptPlaceholderLabel: 'Geodude_Self-Destruct_Nugget.json 準備中',
      scriptHint:
        'ダウンロードした Geodude_Self-Destruct_Nugget.json を Ghost-Pad の「マクロスタジオ」へドラッグするだけで取り込めます',
    },
  },
  tour: {
    heading: 'アプリ画面ガイド',
    subheading:
      'タブを切り替えて各画面を表示し、画像上の番号をクリックすると機能の説明を確認できます。',
    tablistAriaLabel: 'アプリ画面ツアーのタブ',
    pinListAriaLabel: '画面ガイド番号リスト',
    tabs: [
      {
        id: 'dashboard',
        label: 'ダッシュボード',
        caption:
          '普段のプレイでいちばん使う画面。コントローラーの動き、ミュート切替、接続状況を一目で確認できます。',
        image: './screenshots/ja/dashboard.png',
        alt: 'Ghost-Pad ライブダッシュボードと入力タイムライン画面',
        pins: [
          {
            id: 'd1',
            number: '1',
            x: 11,
            y: 24,
            title: '左サイドバー＆ハードウェア状態',
            detail:
              '「ダッシュボード / マクロライブラリ / ESP32 とファームウェア」を切り替え、コントローラー → PC → ESP32 → Switch の接続ランプをリアルタイム表示します。',
          },
          {
            id: 'd2',
            number: '2',
            x: 19,
            y: 59,
            title: '入力転送スイッチ（ミュート）',
            detail:
              'PC で文字を打ちたいときにオフにすれば、Switch の 1P 接続を保ったままゲーム側への誤入力を防げます。',
          },
          {
            id: 'd3',
            number: '3',
            x: 56,
            y: 42,
            title: 'インタラクティブ 2D おばけコントローラー',
            detail:
              '物理コントローラーやキーボード入力を即座に反映。マウスで直接ボタンを押したりスティックをドラッグしたりもできます。',
          },
          {
            id: 'd4',
            number: '4',
            x: 56,
            y: 78,
            title: '5 トラックリアルタイム入力タイムライン',
            detail:
              'ボタン入力を 5 トラックの光帯で可視化。10s〜60s のスクロール速度切替に対応し、リズム練習や検証に最適です。',
          },
          {
            id: 'd5',
            number: '5',
            x: 47,
            y: 95,
            title: '下部マクロクイック再生バー',
            detail:
              'タブを切り替えずにスクリプトを選んで緑の「再生」から即実行（1 回／回数指定／無限ループ）。実行中は Esc で即停止でき、手動操作すると自動一時停止して引き継げます。',
          },
        ],
      },
      {
        id: 'macro',
        label: 'マクロライブラリ',
        caption:
          '自動化スクリプトの録画・編集・ループ再生を行う場所。ドラッグ並び替えや JSON 共有に対応。',
        image: './screenshots/ja/macro-studio.png',
        alt: 'Ghost-Pad マクロスタジオ編集画面とループ再生エンジン',
        pins: [
          {
            id: 'm1',
            number: '1',
            x: 84,
            y: 6,
            title: 'マクロ一覧＆JSON 入出力',
            detail:
              '録画済みスクリプトを管理。単体 JSON 共有や一括バックアップ、.json ファイルのドラッグ＆ドロップ取り込みに対応します。',
          },
          {
            id: 'm2',
            number: '2',
            x: 47,
            y: 95,
            title: '下部再生＆ループコントロールバー',
            detail:
              'ワンクリックで 3-2-1 カウントダウン録画を開始し、1 回／回数指定／無限ループを設定できます。',
          },
          {
            id: 'm3',
            number: '3',
            x: 56,
            y: 34,
            title: '5 トラック視覚タイムラインエディタ',
            detail:
              '音楽編集のように各ボタンの開始時刻とミリ秒長さを確認。ブロックをドラッグして位置移動や端の伸縮（10ms スナップ対応）ができ、クリックで詳細編集モーダルを開けます。',
          },
        ],
      },
      {
        id: 'macro-edit',
        label: 'ボタン編集・ドラッグ',
        caption:
          'タイムライン上のブロックをクリックすると詳細編集モーダルが開き、ドラッグ移動・長さ調整と合わせて直感的に微調整できます。',
        image: './screenshots/ja/macro-edit.png',
        alt: 'Ghost-Pad マクロのボタン編集モーダルとタイムラインドラッグ調整画面',
        pins: [
          {
            id: 'me1',
            number: '1',
            x: 50,
            y: 33,
            title: '開始時刻・長押しのミリ秒調整',
            detail:
              '開始時刻と押下時間を直接入力したり、60ms〜500ms のプリセットをワンクリックで適用可能。タイムライン上でのドラッグ移動や端の伸縮とも連動します。',
          },
          {
            id: 'me2',
            number: '2',
            x: 50,
            y: 55,
            title: '全ボタン＆スティック選択パネル',
            detail:
              '十字キー、ABXY、L/ZL/R/ZR、左右スティック方向、システムキーまで全入力を切り替えられ、待機 (Wait) への変換もワンクリックです。',
          },
          {
            id: 'me3',
            number: '3',
            x: 69,
            y: 24,
            title: 'ステップ順の入れ替え＆挿入',
            detail:
              '右上の ↑ ↓ でステップの順番を入れ替えたり、下部ボタンから直後に待機 (Wait) や新しい操作を挿入したりできます。',
          },
        ],
      },
      {
        id: 'hardware',
        label: 'ESP32 とファームウェア',
        caption:
          '初回の ESP32 ファームウェア書き込みと、Nintendo Switch との Bluetooth ペアリングはここで行います。',
        image: './screenshots/ja/hardware.png',
        alt: 'Ghost-Pad ESP32 ハードウェア設定と Switch ペアリング画面',
        pins: [
          {
            id: 'h1',
            number: '1',
            x: 42,
            y: 28,
            title: 'USB シリアルポート自動検出',
            detail:
              'CH340・CP2102・FTDI などのシリアルチップを自動認識。選んで接続するだけで 60Hz の安定通信が始まります。',
          },
          {
            id: 'h2',
            number: '2',
            x: 78,
            y: 32,
            title: '内蔵ファームウェア・ワンクリック書込',
            detail:
              'ビルド済みの PRO-UART0.bin を同梱しているため、Python の導入やコマンド入力なしで書き込みが完了します。',
          },
          {
            id: 'h3',
            number: '3',
            x: 56,
            y: 72,
            title: 'Switch Bluetooth ペアリングガイド',
            detail:
              '画面の案内に沿って Switch で「持ちかた／順番を変える」を開き、クリックひとつでペアリング信号を送信して 1P 接続を取得します。',
          },
        ],
      },
    ],
  },
  faq: {
    heading: 'よくある質問',
    subheading: 'はじめる前によくある質問をまとめました。',
    mascotBubble: '解決しないときは GitHub Issues で気軽に聞いてね！',
    items: [
      {
        id: 'esp32-type',
        question: 'どの ESP32 ボードを買えばいいですか？どれでも動きますか？',
        answer:
          '必ず「Bluetooth Classic (BR/EDR)」対応の標準 ESP32（例：ESP32-WROOM-32 / ESP32 DevKitC）を選んでください。ESP32-S2 / S3 / C3 は BLE のみまたは Bluetooth 非対応のため、Switch Pro コントローラーをエミュレートできません。',
      },
      {
        id: 'no-gamepad',
        question: '物理コントローラーがなくても Ghost-Pad は使えますか？',
        answer:
          'はい、不要です！キーボード（WASD + IJKL）や画面上の 2D コントローラーのマウスクリックだけでも、Switch の操作からマクロ録画までフル活用できます。',
      },
      {
        id: 'supported-gamepads',
        question: '手持ちのコントローラーはどの機種に対応していますか？',
        answer:
          '8BitDo Micro、Nintendo Switch Pro コントローラー、Joy-Con など一般的な Bluetooth / USB コントローラーに対応しています。1ms 未満のポーリングで転送され、キーボード操作ともシームレスに併用できます。',
      },
      {
        id: 'macro-stop',
        question: '無限ループ中のマクロが止まらなくなったらどうすればいい？',
        answer:
          'キーボードの Esc キーを押せばいつでもグローバル緊急停止できます！さらに ESP32 側にも 200ms の切断保護（Watchdog）があるため、万が一 USB が抜けても全ボタンが自動解除されて暴走しません。',
      },
      {
        id: 'share-macro',
        question: '録画したマクロを友だちに共有できますか？',
        answer:
          'できます！マクロスタジオから軽量な .json ファイルとして書き出せます。受け取った側は .json を Ghost-Pad のウィンドウにドラッグするだけで取り込み完了です。',
      },
    ],
  },
  footer: {
    ctaTitle: 'Ghost-Pad をダウンロード',
    ctaBody:
      '最新の macOS ユニバーサル版（Apple Silicon / Intel 両対応）をダウンロード。無料・オープンソースで開発環境の構築は不要です。',
    downloadButton: 'GitHub Releases からダウンロード',
    docsButton: 'リポジトリと技術ドキュメントを見る',
    releasesLinkLabel: 'Releases',
    copyright: 'Ghost-Pad · Open Source · GPL-3.0 License',
  },
};
