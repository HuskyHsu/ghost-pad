import type { SiteContent } from './zh-TW';

export const enContent: SiteContent = {
  meta: {
    locale: 'en',
    brand: 'Ghost-Pad',
    pageTitle: 'Ghost-Pad | Turn Your Computer into a Cute Nintendo Switch Control Hub',
    skipToContent: 'Skip to main content',
    githubUrl: 'https://github.com/HuskyHsu/ghost-pad',
    releasesUrl: 'https://github.com/HuskyHsu/ghost-pad/releases',
  },
  nav: {
    items: [
      { id: 'tour', label: 'App Tour' },
      { id: 'controls', label: 'Try Controls' },
      { id: 'macro', label: 'Macro Studio' },
      { id: 'quickstart', label: '3-Step Setup' },
      { id: 'faq', label: 'FAQ' },
    ],
    downloadCta: 'Download macOS',
    openMenu: 'Open navigation menu',
    closeMenu: 'Close navigation menu',
    languageLabel: 'Switch language',
  },
  hero: {
    title: 'Control Your Nintendo Switch from Your Computer',
    lead: 'Use your keyboard, mouse, or any controller you already own—bridged through a tiny ESP32 board—to play Nintendo Switch wirelessly at a rock-solid 60Hz, and record macros for repetitive grinds.',
    secondaryCta: 'Download for macOS',
    mascotBubble:
      'Hi! I translate your computer inputs into official Pro Controller signals for your Switch!',
    diagram: {
      title: 'How Ghost-Pad Works in 10 Seconds',
      note: 'No console mods needed—your Switch simply sees a standard Pro Controller',
      nodes: [
        { id: 'pc', title: 'Ghost-Pad on Computer', sub: 'Keyboard / Gamepad / Macros' },
        { id: 'esp32', title: 'ESP32 Dev Board', sub: 'USB Power + Bluetooth Emulation' },
        { id: 'switch', title: 'Nintendo Switch', sub: '1P Pro Controller Link' },
      ],
      links: {
        usb: 'USB 60Hz Stream',
        bt: 'Bluetooth Classic Wireless',
      },
    },
  },
  quickStart: {
    heading: 'Install and Connect in Three Steps',
    subheading:
      'Follow along step by step—no coding required. Your Switch 1P light will be glowing in minutes.',
    steps: [
      {
        step: 1,
        title: 'Download and Open Ghost-Pad',
        summary:
          'Grab the latest universal.dmg from GitHub Releases (supports both Apple Silicon and Intel Macs) and drag Ghost-Pad into your Applications folder.',
        tip: 'macOS may show a security prompt on first launch—check the sticky note below to clear it in 10 seconds!',
      },
      {
        step: 2,
        title: 'Plug in ESP32 and Flash in One Click',
        summary:
          'Connect your ESP32 over USB, open the "ESP32 & Firmware" tab in Ghost-Pad, let it auto-detect the serial port, and click "One-Click Flash".',
        tip: 'Make sure you pick a standard ESP32 board that supports Bluetooth Classic (BR/EDR)!',
      },
      {
        step: 3,
        title: 'Pair with Switch and Start Playing',
        summary:
          'On your Switch home screen, go to Controllers → Change Grip/Order. Back in Ghost-Pad, click "First-Time Pair (Send L+R)" and wait for the 1P icon.',
        tip: 'Once paired, just click "Wake & Reconnect" next time to jump right back in.',
      },
    ],
    hardwarePhoto: {
      badge: 'Real Hardware Setup',
      title: 'All You Need Is One USB Cable',
      caption:
        'Your Mac connects to a standard ESP32-WROOM-32 board over a single USB cable—no breadboard, jumper wires, or soldering required—to bridge wirelessly to Nintendo Switch.',
      alt: 'Desk setup showing a Mac connected via USB to an ESP32 development board alongside a Nintendo Switch',
      image: './hardware-setup.jpg',
    },
    macosGatekeeper: {
      title: 'macOS Says "Unverified Developer" or "App Is Damaged"?',
      why: 'Ghost-Pad is free open-source software without paid Apple notarization, so macOS may block it on first launch. Click to view two quick fixes.',
      toggleLabel: 'Toggle macOS Gatekeeper workaround steps',
      methodA: {
        title: 'Method A | Allow in System Settings (Recommended)',
        steps: [
          'Double-click Ghost-Pad and click "Done" or "OK" on the warning popup.',
          'Open macOS System Settings → Privacy & Security.',
          'Scroll down to "Ghost-Pad was blocked", click "Open Anyway", and enter your password.',
        ],
      },
      methodB: {
        title: 'Method B | If It Says "Damaged and Can\'t Be Opened"',
        desc: 'Open Terminal on your Mac and run this single line. It only clears the macOS download quarantine flag without touching any other system settings:',
        command: 'xattr -cr /Applications/Ghost-Pad.app',
        copyLabel: 'Copy command',
        copiedLabel: 'Copied',
      },
    },
  },
  controls: {
    heading: 'Interactive Controls Playground',
    subheading:
      'Ghost-Pad blends physical gamepads, keyboard, and mouse clicks at the same time. Press keys or click the buttons below to see the visualizer and timeline respond.',
    simulationBadge: 'Live Preview',
    simulationBanner: 'Interactive browser simulation—does not send real signals to your Switch',
    tryHint: 'Try W A S D to move the left stick, or I J K L for X Y B A',
    muteToggle: {
      activeLabel: 'Forwarding Active (Click to Pause)',
      mutedLabel: 'Forwarding Paused (Muted)',
    },
    statusMuted: 'MUTED',
    statusIdle: 'IDLE · 60Hz',
    timelineTitle: 'Live Input Timeline',
    timelineSubtitle:
      'Every press becomes a hold-duration ribbon flowing left-to-right from NOW across a 30-second window so you can read combo timing at a glance.',
    timelineTracksHeader: 'Track',
    timelineNowLabel: 'NOW',
    timelineOpCountLabel: 'Inputs',
    timelineDurationLabel: '30s Window',
    timelineClearLabel: 'Clear timeline history',
    tracks: [
      { id: 'action', label: 'ABXY', color: '#38bdf8' },
      { id: 'dpad', label: 'D-Pad', color: '#a855f7' },
      { id: 'stick', label: 'Stick', color: '#06b6d4' },
      { id: 'shoulder', label: 'Triggers', color: '#f43f5e' },
      { id: 'system', label: 'System', color: '#94a3b8' },
    ] as const,
    cheatSheetTitle: 'Keyboard Cheat Sheet',
    keyGroups: [
      {
        title: 'Left Stick (8-Way)',
        keys: [
          { label: 'W / A / S / D', desc: 'Up / Left / Down / Right' },
          { label: 'F / G', desc: 'Left Stick Click L3 / Right Stick Click R3' },
        ],
      },
      {
        title: 'Face Action Buttons',
        keys: [
          { label: 'L', desc: 'A Button (Confirm)' },
          { label: 'K', desc: 'B Button (Cancel)' },
          { label: 'I', desc: 'X Button (Menu)' },
          { label: 'J', desc: 'Y Button (Action)' },
        ],
      },
      {
        title: 'D-Pad & Shoulder Triggers',
        keys: [
          { label: '↑ ↓ ← →', desc: 'Directional Pad' },
          { label: 'Q / E', desc: 'ZL / L Left Triggers' },
          { label: 'U / O', desc: 'R / ZR Right Triggers' },
        ],
      },
      {
        title: 'System Buttons',
        keys: [
          { label: 'M (-) / P (=)', desc: 'Minus (-) / Plus (+)' },
          { label: 'H / N', desc: 'Home / Capture Screenshot' },
        ],
      },
    ],
    handyTips: [
      {
        title: 'Pause Input Forwarding (Mute Mode)',
        body: "This doesn't mute your speakers—it pauses controller signals while keeping your ESP32 stably paired as Switch 1P. Reply to messages or browse guides without accidentally moving your character.",
        note: 'Click again to resume instantly',
      },
      {
        title: 'Gamepad, Keyboard & Mouse Together',
        body: 'No mode switching needed. Play with a physical gamepad, tap a keyboard key, or click on-screen buttons anytime—all inputs merge smoothly in real time.',
        note: 'Works with 8BitDo, Pro Controller & Joy-Con',
      },
    ],
  },
  macro: {
    heading: 'Macro Recording & Auto-Loop',
    subheading:
      'For repetitive farming or grinding, record your inputs once, fine-tune the timing on the timeline, and let Ghost-Pad loop it automatically.',
    steps: [
      {
        id: 'record',
        step: '1',
        title: '3-2-1 Countdown, Millisecond Capture',
        desc: 'Hit record for a 3-second countdown, then play through once with your gamepad or keyboard. Every button hold duration and stick tilt is captured faithfully.',
      },
      {
        id: 'edit',
        step: '2',
        title: '5-Track Visual Timeline Tweaking',
        desc: 'Your recording opens on a 5-track score sheet with adjustable row scales (5s–30s) and undo/redo. Right-click any block to tweak milliseconds, swap keys, or delete—or insert new actions and waits manually.',
      },
      {
        id: 'loop',
        step: '3',
        title: 'Pick a Loop Mode and Go Hands-Free',
        desc: 'Run once, repeat a fixed count (2–999), or loop infinitely (∞). Export lightweight JSON backups or drag-and-drop scripts shared by friends.',
      },
    ],
    workbench: {
      tablistAriaLabel: 'Macro Studio 3-step interactive demo',
      record: {
        recordingBadge: 'Recording REC',
        countdownPrefix: 'Get ready',
        replayButton: 'Replay 3-2-1',
        capturedTitle: 'Captured Input Sequence',
        highlights: [
          'Zero coding—just play once to record',
          '60Hz millisecond hold & stick capture',
          'Record from gamepad, keyboard, or mouse',
        ],
      },
      edit: {
        previewTitle: '5-Track Timeline Preview',
        totalLengthLabel: 'Total',
        rowScaleAriaLabel: 'Time scale per row',
        secPerRowUnit: 's / row',
        resetButton: 'Reset',
        systemWaitTrackLabel: 'Sys / Wait',
        selectedBlockLabel: 'Selected',
        deleteButton: 'Delete',
        selectBlockHint:
          'Click any action block above to adjust its hold duration or delete it (desktop app supports right-click menus).',
        addActionButton: 'Add Action',
        addWaitButton: 'Add Wait',
        rowCapHint5s:
          'Demo preview is capped to one row—switch to 10s / row, or enjoy automatic row wrapping in the app.',
        rowCapHint10s:
          'Demo preview is capped to one row; the desktop app wraps longer scripts automatically.',
      },
      loop: {
        panelTitle: 'Loop Mode (Once / Count / Infinite)',
        jsonBadge: 'JSON Export / Drag Import',
        modeOnce: 'Once',
        modeCount: 'Count',
        modeInfinite: 'Infinite',
        countLabel: 'Repeat count (2–999)',
        decreaseAriaLabel: 'Decrease repeat count',
        increaseAriaLabel: 'Increase repeat count',
        onceDesc: 'Runs one full pass and stops automatically—great for checking script timing.',
        infiniteDesc: 'Loops continuously until stopped manually.',
        runningLabel: 'Running Macro',
        counterOnce: '1 / 1 run',
        counterUnit: 'runs',
        counterInfinite: '∞ Continuous Loop',
      },
    },
    emergencyNote:
      'Emergency Brake: Press Esc on your keyboard anytime during playback to stop immediately and release all buttons!',
    showcase: {
      title: 'Example: Pokémon FireRed / LeafGreen Nugget Bridge Farm',
      subtitle: 'Automated Team Rocket Grunt Nugget farming loop north of Cerulean City',
      description:
        'Record the full dialogue, movement, and faint-reset loop once in Ghost-Pad, then run it on infinite loop for hands-free Nugget farming on Switch.',
      syncBadge: 'Dual-Screen Synced Playback',
      syncLinkLabel: 'App ⇄ Switch',
      syncStatusReady: '16:9 × 2 Sync Ready',
      syncStatusBuffering: 'Buffering sync…',
      syncStatusWaiting: '16:9 × 2 Videos Pending',
      syncStandbyHint:
        'Once the recordings and JSON macro are added, you can watch them side-by-side and import the script here.',
      pauseSyncAriaLabel: 'Pause synced playback',
      playSyncAriaLabel: 'Play synced recordings',
      restartSyncAriaLabel: 'Restart from beginning',
      scrubberAriaLabel: 'Dual-screen timeline scrubber',
      speedGroupAriaLabel: 'Synced playback speed',
      appScreenLabel: 'Ghost-Pad Desktop App',
      switchScreenLabel: 'Nintendo Switch Gameplay',
      switchVideoReady: true,
      switchVideoSrc: './demos/Geodude_Self-Destruct_Nugget_switch.mp4',
      switchVideoCaption: 'Live automated dialogue & Nugget Bridge loop on Switch',
      switchVideoPlaceholderTitle: 'Switch Gameplay Recording (Reserved)',
      switchVideoPlaceholderHint:
        'Place website/public/demos/Geodude_Self-Destruct_Nugget_switch.mp4 to enable',
      appVideoReady: true,
      appVideoSrc: './demos/Geodude_Self-Destruct_Nugget_app.mp4',
      appVideoCaption: 'Synced macro playback & 5-track live input timeline',
      appVideoPlaceholderTitle: 'Ghost-Pad App Recording (Reserved)',
      appVideoPlaceholderHint:
        'Place website/public/demos/Geodude_Self-Destruct_Nugget_app.mp4 to enable',
      scriptReady: true,
      scriptSrc: './demos/Geodude_Self-Destruct_Nugget.json',
      scriptReadyLabel: 'Download Geodude_Self-Destruct_Nugget.json',
      scriptPlaceholderLabel: 'Geodude_Self-Destruct_Nugget.json Coming Soon',
      scriptHint:
        "Download and drag Geodude_Self-Destruct_Nugget.json straight into Ghost-Pad's Macro Studio to import",
    },
  },
  tour: {
    heading: 'App Interface Tour',
    subheading:
      'Switch tabs to view each screen, and click the numbered pins to see what each area does.',
    tablistAriaLabel: 'App interface tour tabs',
    pinListAriaLabel: 'Screenshot callout directory',
    tabs: [
      {
        id: 'dashboard',
        label: 'Live Dashboard',
        caption:
          'Your everyday play screen: watch live inputs, toggle mute, and check your hardware link.',
        image: './screenshots/en/dashboard.png',
        alt: 'Ghost-Pad live controller dashboard and input timeline',
        pins: [
          {
            id: 'd1',
            number: '1',
            x: 11,
            y: 24,
            title: 'Sidebar Navigation & Hardware Status',
            detail:
              'Switch between Live Dashboard, Macro Library, and ESP32 & Firmware while monitoring live Gamepad → PC → ESP32 → Switch status lights.',
          },
          {
            id: 'd2',
            number: '2',
            x: 19,
            y: 59,
            title: 'Input Forwarding Toggle (Mute)',
            detail:
              'Need to type on your computer? Pause forwarding without dropping your Switch 1P Bluetooth link so stray keystrokes never affect your game.',
          },
          {
            id: 'd3',
            number: '3',
            x: 56,
            y: 42,
            title: 'Interactive 2D Ghost Gamepad',
            detail:
              'Mirrors your physical controller and keyboard in real time—or click buttons and drag thumbsticks directly with your mouse.',
          },
          {
            id: 'd4',
            number: '4',
            x: 56,
            y: 78,
            title: '5-Track Live Input Timeline',
            detail:
              'Turns every press into a hold-duration ribbon with 10s–60s scroll speeds—super clear for combo practice and debugging.',
          },
          {
            id: 'd5',
            number: '5',
            x: 47,
            y: 95,
            title: 'Bottom Quick Macro Player Bar',
            detail:
              'Pick any script right from the dashboard, hit green Play, and choose once / repeat count / infinite loop. Press Esc anytime to stop, or touch your controller to auto-pause and take over.',
          },
        ],
      },
      {
        id: 'macro',
        label: 'Macro Library',
        caption:
          'Record, trim, and loop automated scripts with drag-and-drop sorting and JSON sharing.',
        image: './screenshots/en/macro-studio.png',
        alt: 'Ghost-Pad Macro Studio visual editor and playback engine',
        pins: [
          {
            id: 'm1',
            number: '1',
            x: 84,
            y: 6,
            title: 'Macro Library & JSON Import/Export',
            detail:
              'Organize recorded scripts, export single macros or full backups as .json, or drag a .json file right into the window to import.',
          },
          {
            id: 'm2',
            number: '2',
            x: 47,
            y: 95,
            title: 'Playback & Loop Control Bar',
            detail:
              'Start a 3-2-1 countdown recording in one click, and configure once, fixed-count, or infinite loop playback.',
          },
          {
            id: 'm3',
            number: '3',
            x: 56,
            y: 34,
            title: '5-Track Visual Timeline Editor',
            detail:
              'Inspect start times and millisecond holds like an audio track—drag blocks horizontally to reposition or drag edges to resize duration with 10ms smart snap, or click to open the action editor.',
          },
        ],
      },
      {
        id: 'macro-edit',
        label: 'Button Edit & Drag',
        caption:
          'Click any block on the timeline to open the action editor modal, or drag blocks and edges directly for millisecond-level timing.',
        image: './screenshots/en/macro-edit.png',
        alt: 'Ghost-Pad macro button editor modal and drag-and-drop timing controls',
        pins: [
          {
            id: 'me1',
            number: '1',
            x: 50,
            y: 33,
            title: 'Start Time & Hold Duration',
            detail:
              'Enter exact millisecond start times and hold durations or pick quick presets (60ms–500ms)—complemented by direct timeline dragging and edge resizing.',
          },
          {
            id: 'me2',
            number: '2',
            x: 50,
            y: 55,
            title: 'Full Controller Button & Stick Picker',
            detail:
              'Swap any step between D-Pad, ABXY, L/ZL/R/ZR triggers, L/R analog stick directions, and system keys, or convert it into a Wait pause.',
          },
          {
            id: 'me3',
            number: '3',
            x: 69,
            y: 24,
            title: 'Step Reordering & Quick Insert',
            detail:
              'Use the ↑ ↓ arrows to reorder steps on the fly, or insert a Wait pause or new controller action right after the current step.',
          },
        ],
      },
      {
        id: 'hardware',
        label: 'ESP32 & Firmware',
        caption:
          'Flash the bundled firmware onto your ESP32 and pair with your Nintendo Switch right here.',
        image: './screenshots/en/hardware.png',
        alt: 'Ghost-Pad ESP32 hardware setup and Switch pairing guide',
        pins: [
          {
            id: 'h1',
            number: '1',
            x: 42,
            y: 28,
            title: 'Auto USB Serial Port Detection',
            detail:
              'Automatically detects CH340, CP2102, and FTDI serial chips—pick your board and connect for a steady 60Hz heartbeat.',
          },
          {
            id: 'h2',
            number: '2',
            x: 78,
            y: 32,
            title: 'One-Click Bundled Firmware Flasher',
            detail:
              'Ships with precompiled PRO-UART0.bin firmware built in—no Python setup or terminal commands required.',
          },
          {
            id: 'h3',
            number: '3',
            x: 56,
            y: 72,
            title: 'Guided Switch Bluetooth Pairing',
            detail:
              'Open Change Grip/Order on your Switch, click once to send L+R pairing signals, and claim the 1P slot.',
          },
        ],
      },
    ],
  },
  faq: {
    heading: 'Frequently Asked Questions',
    subheading: 'Common questions and quick answers before you get started.',
    mascotBubble: 'Still stuck? Drop by GitHub Issues anytime and say hi!',
    items: [
      {
        id: 'esp32-type',
        question: 'Which ESP32 board should I buy? Will any ESP32 work?',
        answer:
          'Be sure to get a classic ESP32 with Bluetooth Classic (BR/EDR), such as ESP32-WROOM-32 or ESP32 DevKitC. Boards like ESP32-S2, ESP32-S3, and ESP32-C3 only support BLE or lack Bluetooth Classic, so they cannot emulate a Switch Pro Controller.',
      },
      {
        id: 'no-gamepad',
        question: 'Do I need a physical controller to use Ghost-Pad?',
        answer:
          'Not at all! Ghost-Pad supports pure keyboard play (WASD + IJKL) and clicking the on-screen 2D controller with your mouse—you can play Switch and record macros with zero extra controllers.',
      },
      {
        id: 'supported-gamepads',
        question: 'Which physical controllers are supported?',
        answer:
          'Most standard Bluetooth and USB controllers work out of the box, including 8BitDo Micro, Nintendo Switch Pro Controller, and Joy-Con. Ghost-Pad polls at sub-1ms speed and merges seamlessly with keyboard input.',
      },
      {
        id: 'macro-stop',
        question: "What if an infinite macro loop won't stop?",
        answer:
          'Press Esc on your keyboard anytime for an instant global emergency stop! Plus, the ESP32 firmware has a built-in 200ms Watchdog—even if the USB cable is pulled, all buttons automatically release so your character never gets stuck running.',
      },
      {
        id: 'share-macro',
        question: 'Can I share my recorded macros with friends?',
        answer:
          "Yes! Export any macro as a tiny .json file from Macro Studio. Your friend just drags that .json file into Ghost-Pad and it's ready to run.",
      },
    ],
  },
  footer: {
    ctaTitle: 'Download Ghost-Pad',
    ctaBody:
      'Download the latest universal macOS build (Apple Silicon & Intel). Free, open-source, and zero dev setup required.',
    downloadButton: 'Download on GitHub Releases',
    docsButton: 'View Repository & Tech Docs',
    releasesLinkLabel: 'Releases',
    copyright: 'Ghost-Pad · Open Source · GPL-3.0 License',
  },
};
