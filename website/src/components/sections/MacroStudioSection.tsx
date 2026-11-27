import {
  Download,
  FileJson,
  Gamepad2,
  Link2,
  MonitorPlay,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useContent } from '../../i18n/useContent';
import { SketchCard, SketchHighlight } from '../sketch';

const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;
const APP_START_OFFSET_SEC = 0;
const SWITCH_START_OFFSET_SEC = 1.5;
const HAVE_FUTURE_DATA = 3;

function getTargetSwitchTime(appCurrentTime: number, switchDuration: number): number {
  const timelineTime = Math.max(0, appCurrentTime - APP_START_OFFSET_SEC);
  const rawSwitchTime = timelineTime + SWITCH_START_OFFSET_SEC;
  return Number.isFinite(switchDuration) ? Math.min(rawSwitchTime, switchDuration) : rawSwitchTime;
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function MacroStudioSection() {
  const content = useContent();
  const { macro } = content;

  // Unified Dual-Screen Synced Showcase Player state & refs
  const appVideoRef = useRef<HTMLVideoElement | null>(null);
  const switchVideoRef = useRef<HTMLVideoElement | null>(null);
  const bothVideosReady = macro.showcase.appVideoReady && macro.showcase.switchVideoReady;
  const [isDualPlaying, setIsDualPlaying] = useState(false);
  const [isDualBuffering, setIsDualBuffering] = useState(false);
  const [dualCurrentTime, setDualCurrentTime] = useState(0);
  const [dualDuration, setDualDuration] = useState(0);
  const [dualSpeed, setDualSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(1);
  const wantsToPlayRef = useRef(false);
  const bufferingRef = useRef<{ app: boolean; switch: boolean }>({ app: false, switch: false });

  const syncSwitchToApp = (
    vApp: HTMLVideoElement,
    vSwitch: HTMLVideoElement,
    thresholdSec: number,
  ) => {
    const targetSwitchTime = getTargetSwitchTime(vApp.currentTime, vSwitch.duration);
    if (Math.abs(targetSwitchTime - vSwitch.currentTime) > thresholdSec) {
      vSwitch.currentTime = targetSwitchTime;
    }
  };

  const resetPlaybackState = () => {
    wantsToPlayRef.current = false;
    bufferingRef.current = { app: false, switch: false };
    setIsDualBuffering(false);
    setIsDualPlaying(false);
  };

  const handleToggleDualPlay = async () => {
    if (!bothVideosReady) return;
    const vApp = appVideoRef.current;
    const vSwitch = switchVideoRef.current;
    if (!vApp || !vSwitch) return;

    if (wantsToPlayRef.current) {
      vApp.pause();
      vSwitch.pause();
      resetPlaybackState();
      return;
    }

    wantsToPlayRef.current = true;
    setIsDualPlaying(true);
    vApp.playbackRate = dualSpeed;
    vSwitch.playbackRate = dualSpeed;
    if (vApp.currentTime < APP_START_OFFSET_SEC) {
      vApp.currentTime = APP_START_OFFSET_SEC;
    }
    syncSwitchToApp(vApp, vSwitch, 0.05);

    const appNeedsData = vApp.readyState < HAVE_FUTURE_DATA;
    const switchNeedsData = vSwitch.readyState < HAVE_FUTURE_DATA;
    bufferingRef.current = { app: appNeedsData, switch: switchNeedsData };
    setIsDualBuffering(appNeedsData || switchNeedsData);

    try {
      await Promise.all([vApp.play(), vSwitch.play()]);
      // If either stream stalled immediately after play() started, hold the healthy one.
      if (wantsToPlayRef.current && (vApp.readyState < HAVE_FUTURE_DATA || vSwitch.readyState < HAVE_FUTURE_DATA)) {
        const appWaiting = vApp.readyState < HAVE_FUTURE_DATA;
        const switchWaiting = vSwitch.readyState < HAVE_FUTURE_DATA;
        bufferingRef.current = { app: appWaiting, switch: switchWaiting };
        setIsDualBuffering(true);
        if (appWaiting) vSwitch.pause();
        if (switchWaiting) vApp.pause();
      }
    } catch {
      vApp.pause();
      vSwitch.pause();
      resetPlaybackState();
    }
  };

  const handleVideoWaiting = (which: 'app' | 'switch') => {
    if (!wantsToPlayRef.current) return;
    bufferingRef.current[which] = true;
    setIsDualBuffering(true);
    // Pause only the healthy video so the stalled video keeps buffering priority.
    const other = which === 'app' ? switchVideoRef.current : appVideoRef.current;
    other?.pause();
  };

  const handleVideoStalled = (which: 'app' | 'switch') => {
    const target = which === 'app' ? appVideoRef.current : switchVideoRef.current;
    if (target && target.readyState < HAVE_FUTURE_DATA) {
      handleVideoWaiting(which);
    }
  };

  const handleVideoReady = async (which: 'app' | 'switch') => {
    bufferingRef.current[which] = false;
    if (!wantsToPlayRef.current) return;

    const vApp = appVideoRef.current;
    const vSwitch = switchVideoRef.current;
    if (!vApp || !vSwitch) return;

    if (
      bufferingRef.current.app ||
      bufferingRef.current.switch ||
      vApp.readyState < HAVE_FUTURE_DATA ||
      vSwitch.readyState < HAVE_FUTURE_DATA
    ) {
      return;
    }

    setIsDualBuffering(false);
    syncSwitchToApp(vApp, vSwitch, 0.05);

    if (vApp.paused || vSwitch.paused) {
      vApp.playbackRate = dualSpeed;
      vSwitch.playbackRate = dualSpeed;
      try {
        await Promise.all([vApp.play(), vSwitch.play()]);
      } catch {
        vApp.pause();
        vSwitch.pause();
        resetPlaybackState();
      }
    }
  };

  const handleDualRestart = () => {
    if (!bothVideosReady) return;
    const vApp = appVideoRef.current;
    const vSwitch = switchVideoRef.current;
    if (vApp) vApp.currentTime = APP_START_OFFSET_SEC;
    if (vSwitch) vSwitch.currentTime = SWITCH_START_OFFSET_SEC;
    setDualCurrentTime(0);
  };

  const handleDualSeek = (nextTime: number) => {
    if (!bothVideosReady) return;
    const vApp = appVideoRef.current;
    const vSwitch = switchVideoRef.current;
    const targetAppTime = nextTime + APP_START_OFFSET_SEC;
    const targetSwitchTime = nextTime + SWITCH_START_OFFSET_SEC;
    if (vApp) {
      vApp.currentTime = Number.isFinite(vApp.duration)
        ? Math.min(targetAppTime, vApp.duration)
        : targetAppTime;
    }
    if (vSwitch) {
      vSwitch.currentTime = Number.isFinite(vSwitch.duration)
        ? Math.min(targetSwitchTime, vSwitch.duration)
        : targetSwitchTime;
    }
    setDualCurrentTime(nextTime);
  };

  const handleDualSpeedChange = (nextSpeed: (typeof SPEED_OPTIONS)[number]) => {
    setDualSpeed(nextSpeed);
    if (appVideoRef.current) appVideoRef.current.playbackRate = nextSpeed;
    if (switchVideoRef.current) switchVideoRef.current.playbackRate = nextSpeed;
  };

  const handleDualMetadata = () => {
    const vApp = appVideoRef.current;
    const vSwitch = switchVideoRef.current;
    if (vApp && vApp.currentTime < APP_START_OFFSET_SEC) {
      vApp.currentTime = APP_START_OFFSET_SEC;
    }
    if (vSwitch && vSwitch.currentTime < SWITCH_START_OFFSET_SEC) {
      vSwitch.currentTime = SWITCH_START_OFFSET_SEC;
    }
    const d1 = vApp?.duration ?? 0;
    const d2 = vSwitch?.duration ?? 0;
    const effectiveAppDuration = Number.isFinite(d1) ? Math.max(0, d1 - APP_START_OFFSET_SEC) : 0;
    const effectiveSwitchDuration = Number.isFinite(d2)
      ? Math.max(0, d2 - SWITCH_START_OFFSET_SEC)
      : 0;
    const validMax = Math.max(effectiveAppDuration, effectiveSwitchDuration);
    if (validMax > 0) setDualDuration(validMax);
  };

  const handleAppTimeUpdate = () => {
    const vApp = appVideoRef.current;
    const vSwitch = switchVideoRef.current;
    if (!vApp) return;
    const timelineTime = Math.max(0, vApp.currentTime - APP_START_OFFSET_SEC);
    setDualCurrentTime(timelineTime);
    if (
      vSwitch &&
      !bufferingRef.current.app &&
      !bufferingRef.current.switch &&
      !vSwitch.seeking
    ) {
      syncSwitchToApp(vApp, vSwitch, 0.15);
    }
  };

  const handleDualEnded = () => {
    appVideoRef.current?.pause();
    switchVideoRef.current?.pause();
    resetPlaybackState();
  };

  return (
    <section
      id='macro'
      aria-labelledby='macro-heading'
      className='mx-auto max-w-6xl px-5 py-12 sm:px-8 md:py-14'
    >
      {/* Section Header — no eyebrow pills */}
      <div className='max-w-2xl'>
        <h2
          id='macro-heading'
          className='font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.02em] text-ink sm:text-4xl'
        >
          {macro.heading}
        </h2>
        <p className='mt-3 text-base leading-relaxed text-ink-soft sm:text-lg'>
          {macro.subheading}
        </p>
      </div>

      {/* 3-Step Overview Row (3 columns on desktop, compact stack on mobile) */}
      <div className='mt-7 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4'>
        {macro.steps.map((step) => (
          <div
            key={step.id}
            className='rounded-2xl border-2 border-ink/15 bg-paper-card/85 p-4 sm:p-5'
          >
            <div className='flex items-start gap-3'>
              <span className='mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-marker-yellow font-[family-name:var(--font-display)] text-xs font-bold text-ink tabular-nums sm:h-8 sm:w-8 sm:text-sm'>
                {step.step}
              </span>
              <div className='min-w-0 flex-1'>
                <h3 className='font-[family-name:var(--font-display)] text-base font-bold leading-snug text-ink'>
                  {step.title}
                </h3>
                <p className='mt-1.5 text-xs leading-relaxed text-ink-soft sm:text-sm'>
                  {step.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quiet Esc shortcut footnote below the 3-step cards */}
      <p className='mt-4 flex flex-wrap items-center gap-2 text-xs leading-relaxed text-ink-muted'>
        <kbd className='inline-flex items-center justify-center rounded-md border border-ink/25 bg-paper-card px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] font-semibold text-ink'>
          Esc
        </kbd>
        <span>{macro.emergencyNote}</span>
      </p>

      {/* Reserved Real-World Showcase: Unified Dual-Screen Synced Player */}
      <div className='mt-10'>
        <SketchCard tone='warm' tape='corners' roughBorder className='p-6 sm:p-8'>
          <div className='max-w-3xl space-y-3'>
            <h3 className='font-[family-name:var(--font-display)] text-xl font-bold leading-snug text-ink sm:text-2xl'>
              <SketchHighlight variant='marker' color='yellow'>
                {macro.showcase.title}
              </SketchHighlight>
            </h3>
            <p className='text-sm font-semibold text-ink-soft'>{macro.showcase.subtitle}</p>
            <p className='text-sm leading-relaxed text-ink-soft sm:text-base'>
              {macro.showcase.description}
            </p>
          </div>

          {/* One cohesive Dual-Screen Synced Player Frame */}
          <div className='mt-6 overflow-hidden rounded-2xl border-2 border-ink/25 bg-paper-card paper-shadow-sm'>
            {/* Shared Top Sync Header */}
            <div className='flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink/15 bg-paper-warm/90 px-4 py-2.5 sm:px-5'>
              <div className='flex flex-wrap items-center gap-2.5'>
                <span className='inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-ghost-sky-pale px-3 py-1 text-xs font-bold text-ink'>
                  <Link2 className='h-3.5 w-3.5 text-ghost-sky-deep' aria-hidden='true' />
                  {macro.showcase.syncBadge}
                </span>
                <span className='inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-xs font-bold text-ink-soft'>
                  {macro.showcase.syncLinkLabel}
                </span>
              </div>

              <span className='inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-xs font-medium text-ink-muted tabular-nums'>
                <span
                  className={`h-2 w-2 rounded-full ${
                    !bothVideosReady
                      ? 'bg-ink-muted/45'
                      : isDualBuffering
                        ? 'animate-pulse bg-marker-yellow'
                        : 'bg-marker-mint-deep'
                  }`}
                  aria-hidden='true'
                />
                {!bothVideosReady
                  ? macro.showcase.syncStatusWaiting
                  : isDualBuffering
                    ? macro.showcase.syncStatusBuffering
                    : macro.showcase.syncStatusReady}
              </span>
            </div>

            {/* Connected Dual 16:9 Screens */}
            <div className='relative grid grid-cols-1 divide-y-2 divide-ink/15 bg-paper-warm/25 lg:grid-cols-2 lg:divide-x-2 lg:divide-y-0'>
              {/* Left Screen: Ghost-Pad Desktop App */}
              <div className='flex flex-col'>
                <div className='flex items-center justify-between gap-2 border-b border-ink/10 bg-ghost-sky-pale/45 px-4 py-2'>
                  <div className='flex min-w-0 items-center gap-2'>
                    <MonitorPlay
                      className='h-4 w-4 shrink-0 text-ghost-sky-deep'
                      aria-hidden='true'
                    />
                    <span className='truncate font-[family-name:var(--font-display)] text-xs font-bold text-ink sm:text-sm'>
                      {macro.showcase.appScreenLabel}
                    </span>
                  </div>
                  <span className='hidden truncate text-[11px] text-ink-muted sm:inline'>
                    {macro.showcase.appVideoCaption}
                  </span>
                </div>

                <div
                  className={`relative aspect-video w-full overflow-hidden ${
                    macro.showcase.appVideoReady ? 'bg-[#EFF1F4]' : 'bg-paper-card'
                  }`}
                >
                  {macro.showcase.appVideoReady ? (
                    <video
                      ref={appVideoRef}
                      src={macro.showcase.appVideoSrc}
                      playsInline
                      preload='metadata'
                      onLoadedMetadata={handleDualMetadata}
                      onTimeUpdate={handleAppTimeUpdate}
                      onWaiting={() => handleVideoWaiting('app')}
                      onStalled={() => handleVideoStalled('app')}
                      onCanPlay={() => handleVideoReady('app')}
                      onPlaying={() => handleVideoReady('app')}
                      onEnded={handleDualEnded}
                      className='absolute inset-0 h-full w-full bg-[#EFF1F4] object-contain'
                    />
                  ) : (
                    <div className='absolute inset-0 flex flex-col items-center justify-center px-5 py-5 text-center'>
                      <p className='font-[family-name:var(--font-display)] text-base font-bold text-ink'>
                        {macro.showcase.appVideoPlaceholderTitle}
                      </p>
                      <p className='mt-2 max-w-md rounded-lg bg-paper-warm px-3 py-1.5 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed text-ink-soft'>
                        {macro.showcase.appVideoPlaceholderHint}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Screen: Nintendo Switch Gameplay */}
              <div className='flex flex-col'>
                <div className='flex items-center justify-between gap-2 border-b border-ink/10 bg-paper-warm/70 px-4 py-2'>
                  <div className='flex min-w-0 items-center gap-2'>
                    <Gamepad2 className='h-4 w-4 shrink-0 text-ghost-sky-deep' aria-hidden='true' />
                    <span className='truncate font-[family-name:var(--font-display)] text-xs font-bold text-ink sm:text-sm'>
                      {macro.showcase.switchScreenLabel}
                    </span>
                  </div>
                  <span className='hidden truncate text-[11px] text-ink-muted sm:inline'>
                    {macro.showcase.switchVideoCaption}
                  </span>
                </div>

                <div
                  className={`relative aspect-video w-full overflow-hidden ${
                    macro.showcase.switchVideoReady ? 'bg-black' : 'bg-paper-card'
                  }`}
                >
                  {macro.showcase.switchVideoReady ? (
                    <video
                      ref={switchVideoRef}
                      src={macro.showcase.switchVideoSrc}
                      playsInline
                      muted
                      preload='metadata'
                      onLoadedMetadata={handleDualMetadata}
                      onWaiting={() => handleVideoWaiting('switch')}
                      onStalled={() => handleVideoStalled('switch')}
                      onCanPlay={() => handleVideoReady('switch')}
                      onPlaying={() => handleVideoReady('switch')}
                      className='absolute inset-0 h-full w-full bg-black object-contain'
                    />
                  ) : (
                    <div className='absolute inset-0 flex flex-col items-center justify-center px-5 py-5 text-center'>
                      <p className='font-[family-name:var(--font-display)] text-base font-bold text-ink'>
                        {macro.showcase.switchVideoPlaceholderTitle}
                      </p>
                      <p className='mt-2 max-w-md rounded-lg bg-paper-warm px-3 py-1.5 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed text-ink-soft'>
                        {macro.showcase.switchVideoPlaceholderHint}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Unified Synced Transport Bar */}
            <div className='border-t-2 border-ink/15 bg-paper-warm/80 px-4 py-3.5 sm:px-5'>
              <div className='flex flex-wrap items-center gap-3'>
                {/* Play / Pause & Restart */}
                <div className='flex items-center gap-1.5'>
                  <button
                    type='button'
                    disabled={!bothVideosReady}
                    onClick={handleToggleDualPlay}
                    aria-label={
                      isDualPlaying
                        ? macro.showcase.pauseSyncAriaLabel
                        : macro.showcase.playSyncAriaLabel
                    }
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-[background-color,border-color,color,transform] duration-150 ease-out ${
                      bothVideosReady
                        ? 'cursor-pointer border-ink bg-marker-yellow text-ink hover:bg-marker-yellow/80 active:scale-[0.96]'
                        : 'cursor-not-allowed border-ink/20 bg-paper-card/70 text-ink-muted/60'
                    }`}
                  >
                    {isDualPlaying ? (
                      <Pause className='h-4 w-4' aria-hidden='true' />
                    ) : (
                      <Play className='h-4 w-4' aria-hidden='true' />
                    )}
                  </button>

                  <button
                    type='button'
                    disabled={!bothVideosReady}
                    onClick={handleDualRestart}
                    aria-label={macro.showcase.restartSyncAriaLabel}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-[background-color,border-color,color,transform] duration-150 ease-out ${
                      bothVideosReady
                        ? 'cursor-pointer border-ink/25 bg-paper-card text-ink hover:border-ink hover:bg-ghost-sky-pale active:scale-[0.96]'
                        : 'cursor-not-allowed border-ink/15 bg-paper-card/60 text-ink-muted/55'
                    }`}
                  >
                    <RotateCcw className='h-4 w-4' aria-hidden='true' />
                  </button>
                </div>

                {/* Shared Progress Scrubber */}
                <div className='flex min-w-[160px] flex-1 items-center gap-3'>
                  <input
                    type='range'
                    min={0}
                    max={dualDuration > 0 ? dualDuration : 100}
                    step={0.05}
                    value={bothVideosReady ? dualCurrentTime : 0}
                    disabled={!bothVideosReady}
                    onChange={(e) => handleDualSeek(Number(e.target.value))}
                    aria-label={macro.showcase.scrubberAriaLabel}
                    className='h-2 w-full accent-ghost-sky-deep disabled:cursor-not-allowed disabled:opacity-45'
                  />
                  <span className='shrink-0 font-[family-name:var(--font-mono)] text-xs font-semibold text-ink-soft tabular-nums'>
                    {formatClock(dualCurrentTime)} / {formatClock(dualDuration)}
                  </span>
                </div>

                {/* Shared Speed Selector (0.5x / 1x / 1.5x / 2x) */}
                <div
                  role='group'
                  aria-label={macro.showcase.speedGroupAriaLabel}
                  className='inline-flex items-center gap-1 rounded-xl border border-ink/15 bg-paper-card/85 p-1'
                >
                  {SPEED_OPTIONS.map((opt) => {
                    const selected = dualSpeed === opt;
                    const label = opt === 1 ? '1x' : opt === 2 ? '2x' : `${opt}x`;
                    return (
                      <button
                        key={opt}
                        type='button'
                        disabled={!bothVideosReady}
                        aria-pressed={selected}
                        onClick={() => handleDualSpeedChange(opt)}
                        className={`rounded-lg px-2 py-1 font-[family-name:var(--font-mono)] text-xs font-bold tabular-nums transition-[background-color,color,transform] duration-150 ease-out ${
                          bothVideosReady
                            ? selected
                              ? 'cursor-pointer bg-ghost-sky-pale text-ink active:scale-[0.96]'
                              : 'cursor-pointer text-ink-muted hover:text-ink active:scale-[0.96]'
                            : selected
                              ? 'cursor-not-allowed bg-paper-warm text-ink-muted'
                              : 'cursor-not-allowed text-ink-muted/55'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!bothVideosReady && (
                <p className='mt-2.5 text-xs font-medium text-ink-muted'>
                  {macro.showcase.syncStandbyHint}
                </p>
              )}
            </div>
          </div>

          {/* Integrated JSON Script Download Bar */}
          <div className='mt-5 flex flex-col gap-3 rounded-2xl border border-ink/15 bg-paper-card/85 px-5 py-4 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-xs leading-relaxed text-ink-soft sm:text-sm'>
              {macro.showcase.scriptHint}
            </p>

            <div className='shrink-0'>
              {macro.showcase.scriptReady ? (
                <a
                  href={macro.showcase.scriptSrc}
                  download
                  className='inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-ghost-sky px-5 py-2.5 text-sm font-bold text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-ghost-sky/85 active:scale-[0.96]'
                >
                  <Download className='h-4 w-4' aria-hidden='true' />
                  {macro.showcase.scriptReadyLabel}
                </a>
              ) : (
                <button
                  type='button'
                  disabled
                  className='inline-flex cursor-not-allowed items-center gap-2 rounded-xl border-2 border-dashed border-ink/30 bg-paper-warm/70 px-5 py-2.5 text-sm font-semibold text-ink-muted'
                >
                  <FileJson className='h-4 w-4' aria-hidden='true' />
                  {macro.showcase.scriptPlaceholderLabel}
                </button>
              )}
            </div>
          </div>
        </SketchCard>
      </div>
    </section>
  );
}

export default MacroStudioSection;
