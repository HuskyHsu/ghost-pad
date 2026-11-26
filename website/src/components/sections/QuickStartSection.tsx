import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Copy,
  Lightbulb,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import { useContent } from "../../i18n/useContent";
import { SketchArrow, SketchCard, SketchHighlight } from "../sketch";

function DmgDragIllustration({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg
      viewBox="0 0 220 112"
      className="h-28 w-full max-w-[220px]"
      fill="none"
      aria-hidden="true"
    >
      {/* Finder window */}
      <rect
        x="8"
        y="8"
        width="204"
        height="96"
        rx="12"
        fill="#FFFFFF"
        stroke="#033157"
        strokeWidth="2"
      />
      <line x1="8" y1="26" x2="212" y2="26" stroke="#033157" strokeOpacity="0.16" strokeWidth="1.5" />
      <circle cx="22" cy="17" r="3" fill="#FECACA" stroke="#033157" strokeWidth="1.2" />
      <circle cx="33" cy="17" r="3" fill="#FDE68A" stroke="#033157" strokeWidth="1.2" />
      <circle cx="44" cy="17" r="3" fill="#A7F3D0" stroke="#033157" strokeWidth="1.2" />

      {/* Dashed drag path */}
      <path
        d="M66 64 C 92 42, 126 42, 152 62"
        stroke="#0284C7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 4"
      />
      <path
        d="M146 57 L153 63 L145 66"
        stroke="#0284C7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Applications folder target */}
      <g transform="translate(154, 48)">
        <path
          d="M2 8a4 4 0 0 1 4-4h12l4 4h18a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Z"
          fill="#E8F6FD"
          stroke="#033157"
          strokeWidth="2"
        />
        <text
          x="23"
          y="27"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="#0284C7"
          fontFamily="var(--font-display)"
        >
          App
        </text>
      </g>

      {/* Animated Ghost-Pad app icon dragging across */}
      <motion.g
        initial={{ x: 0, y: 0 }}
        animate={
          reducedMotion
            ? { x: 0, y: 0 }
            : { x: [0, 36, 72, 72, 0], y: [0, -10, 0, 0, 0] }
        }
        transition={
          reducedMotion
            ? undefined
            : {
                duration: 3.2,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.35, 0.65, 0.85, 1],
              }
        }
      >
        <rect
          x="26"
          y="48"
          width="36"
          height="36"
          rx="10"
          fill="#56C2F0"
          stroke="#033157"
          strokeWidth="2"
        />
        <circle cx="39" cy="64" r="2.2" fill="#033157" />
        <circle cx="49" cy="64" r="2.2" fill="#033157" />
        <path
          d="M41 70 Q44 73 47 70"
          stroke="#033157"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </motion.g>
    </svg>
  );
}

function Esp32FlashIllustration({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg
      viewBox="0 0 220 112"
      className="h-28 w-full max-w-[220px]"
      fill="none"
      aria-hidden="true"
    >
      {/* USB cable */}
      <path
        d="M12 52 H56"
        stroke="#033157"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <rect
        x="48"
        y="44"
        width="16"
        height="16"
        rx="3"
        fill="#F6F1E7"
        stroke="#033157"
        strokeWidth="2"
      />

      {/* ESP32 board */}
      <rect
        x="64"
        y="24"
        width="136"
        height="56"
        rx="8"
        fill="#FFFFFF"
        stroke="#033157"
        strokeWidth="2.2"
      />
      {/* Shield chip */}
      <rect
        x="82"
        y="34"
        width="44"
        height="36"
        rx="4"
        fill="#E8F6FD"
        stroke="#033157"
        strokeWidth="1.8"
      />
      <text
        x="104"
        y="55"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="#033157"
        fontFamily="var(--font-mono)"
      >
        ESP32
      </text>

      {/* Status TX LED */}
      <motion.circle
        cx="144"
        cy="42"
        r="4"
        fill="#047857"
        animate={reducedMotion ? undefined : { opacity: [0.25, 1, 0.25] }}
        transition={
          reducedMotion
            ? undefined
            : { duration: 1, repeat: Infinity, ease: "linear" }
        }
      />

      {/* Flash progress bar */}
      <rect
        x="138"
        y="56"
        width="50"
        height="10"
        rx="5"
        fill="#F6F1E7"
        stroke="#033157"
        strokeWidth="1.6"
      />
      <motion.rect
        x="140"
        y="58"
        height="6"
        rx="3"
        fill="#0284C7"
        initial={{ width: 34 }}
        animate={reducedMotion ? { width: 46 } : { width: [6, 46, 46] }}
        transition={
          reducedMotion
            ? undefined
            : {
                duration: 2.6,
                repeat: Infinity,
                ease: "easeOut",
                times: [0, 0.78, 1],
              }
        }
      />

      {/* Bottom pins */}
      <g fill="#033157" opacity="0.55">
        <circle cx="76" cy="86" r="2" />
        <circle cx="90" cy="86" r="2" />
        <circle cx="104" cy="86" r="2" />
        <circle cx="118" cy="86" r="2" />
        <circle cx="132" cy="86" r="2" />
        <circle cx="146" cy="86" r="2" />
        <circle cx="160" cy="86" r="2" />
        <circle cx="174" cy="86" r="2" />
        <circle cx="188" cy="86" r="2" />
      </g>
    </svg>
  );
}

function SwitchPairingIllustration({
  reducedMotion,
}: {
  reducedMotion: boolean;
}) {
  return (
    <svg
      viewBox="0 0 220 112"
      className="h-28 w-full max-w-[220px]"
      fill="none"
      aria-hidden="true"
    >
      {/* Left: Nintendo Switch handheld silhouette */}
      {/* Left cyan/sky Joy-Con */}
      <path
        d="M26 22 H17 a9 9 0 0 0 -9 9 V81 a9 9 0 0 0 9 9 H26 V22 Z"
        fill="#E8F6FD"
        stroke="#033157"
        strokeWidth="2.1"
      />
      <circle cx="17" cy="40" r="3.4" fill="#033157" />
      <g fill="#0284C7">
        <circle cx="17" cy="57" r="1.4" />
        <circle cx="17" cy="65" r="1.4" />
        <circle cx="13" cy="61" r="1.4" />
        <circle cx="21" cy="61" r="1.4" />
      </g>

      {/* Center Switch screen */}
      <rect
        x="26"
        y="22"
        width="76"
        height="68"
        fill="#FFFFFF"
        stroke="#033157"
        strokeWidth="2.1"
      />
      <rect
        x="32"
        y="30"
        width="64"
        height="52"
        rx="6"
        fill="#E8F6FD"
        stroke="#0284C7"
        strokeWidth="1.4"
      />
      <rect x="38" y="40" width="52" height="15" rx="7.5" fill="#A7F3D0" />
      <circle cx="47" cy="47.5" r="2.8" fill="#047857" />
      <text
        x="67"
        y="51"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="700"
        fill="#033157"
        fontFamily="var(--font-mono)"
      >
        1P OK
      </text>
      <text
        x="64"
        y="71"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="#2B4F70"
        fontFamily="var(--font-mono)"
      >
        L + R
      </text>

      {/* Right soft-coral/blush Joy-Con */}
      <path
        d="M102 22 H111 a9 9 0 0 1 9 9 V81 a9 9 0 0 1 -9 9 H102 V22 Z"
        fill="#FECACA"
        stroke="#033157"
        strokeWidth="2.1"
      />
      <g fill="#B91C1C">
        <circle cx="111" cy="37" r="1.4" />
        <circle cx="111" cy="45" r="1.4" />
        <circle cx="107" cy="41" r="1.4" />
        <circle cx="115" cy="41" r="1.4" />
      </g>
      <circle cx="111" cy="64" r="3.4" fill="#033157" />

      {/* Center: Animated Bluetooth signal arcs flowing right-to-left (ESP32 -> Switch) */}
      <motion.path
        d="M148 42 C 141 49, 141 63, 148 70"
        stroke="#0284C7"
        strokeWidth="2.3"
        strokeLinecap="round"
        animate={reducedMotion ? undefined : { opacity: [0.2, 1, 0.2] }}
        transition={
          reducedMotion
            ? undefined
            : { duration: 1.8, repeat: Infinity, ease: "linear" }
        }
      />
      <motion.path
        d="M138 34 C 128 45, 128 67, 138 78"
        stroke="#56C2F0"
        strokeWidth="2.3"
        strokeLinecap="round"
        animate={reducedMotion ? undefined : { opacity: [0.2, 1, 0.2] }}
        transition={
          reducedMotion
            ? undefined
            : { duration: 1.8, delay: 0.45, repeat: Infinity, ease: "linear" }
        }
      />

      {/* Right: Miniature ESP32 dev board matching Step 2 */}
      {/* Top gold pin header dots */}
      <g fill="#D97706">
        <circle cx="166" cy="27" r="1.8" />
        <circle cx="174" cy="27" r="1.8" />
        <circle cx="182" cy="27" r="1.8" />
        <circle cx="190" cy="27" r="1.8" />
        <circle cx="198" cy="27" r="1.8" />
      </g>

      {/* PCB body */}
      <rect
        x="158"
        y="31"
        width="50"
        height="50"
        rx="6"
        fill="#FFFFFF"
        stroke="#033157"
        strokeWidth="2.1"
      />

      {/* USB-C side notch */}
      <rect
        x="206"
        y="49"
        width="6"
        height="14"
        rx="2"
        fill="#F6F1E7"
        stroke="#033157"
        strokeWidth="1.6"
      />

      {/* Metallic RF shield square + ESP32 mono label */}
      <rect
        x="165"
        y="38"
        width="36"
        height="26"
        rx="3.5"
        fill="#E8F6FD"
        stroke="#033157"
        strokeWidth="1.6"
      />
      <text
        x="183"
        y="54"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="700"
        fill="#033157"
        fontFamily="var(--font-mono)"
      >
        ESP32
      </text>

      {/* Glowing status LED */}
      <motion.circle
        cx="195"
        cy="72"
        r="2.8"
        fill="#047857"
        animate={reducedMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
        transition={
          reducedMotion
            ? undefined
            : { duration: 1.2, repeat: Infinity, ease: "linear" }
        }
      />
      <rect x="166" y="70" width="18" height="4" rx="2" fill="#F6F1E7" stroke="#033157" strokeWidth="1.2" />

      {/* Bottom gold pin header dots */}
      <g fill="#D97706">
        <circle cx="166" cy="85" r="1.8" />
        <circle cx="174" cy="85" r="1.8" />
        <circle cx="182" cy="85" r="1.8" />
        <circle cx="190" cy="85" r="1.8" />
        <circle cx="198" cy="85" r="1.8" />
      </g>
    </svg>
  );
}

export function QuickStartSection() {
  const content = useContent();
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [gatekeeperOpen, setGatekeeperOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopyCommand = async () => {
    const command = content.quickStart.macosGatekeeper.methodB.command;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = command;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
    }
  };

  const stepTones = ["paper", "sky", "warm"] as const;
  const staggerOffsets = ["lg:mt-0", "lg:mt-5", "lg:mt-10"];

  return (
    <section
      id="quickstart"
      className="px-4 py-12 sm:px-6 md:py-14"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.02em] text-ink sm:text-4xl">
            {content.quickStart.heading}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-soft sm:text-lg">
            {content.quickStart.subheading}
          </p>
        </div>

        {/* Staggered 1-2-3 storyboard with curved hand-drawn arrows */}
        <div className="mt-10 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:gap-3">
          {content.quickStart.steps.map((step, index) => (
            <div key={step.step} className="contents">
              <div className={staggerOffsets[index]}>
                <SketchCard
                  tone={stepTones[index]}
                  tape={index === 1 ? "top" : "none"}
                  roughBorder
                  className="p-5 sm:p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-marker-yellow font-[family-name:var(--font-display)] text-lg font-bold text-ink">
                      {step.step}
                    </span>
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-bold leading-snug text-ink">
                      {step.title}
                    </h3>
                  </div>

                  <div className="my-5 flex items-center justify-center rounded-2xl bg-paper-warm/65 p-3">
                    {index === 0 && (
                      <DmgDragIllustration reducedMotion={prefersReducedMotion} />
                    )}
                    {index === 1 && (
                      <Esp32FlashIllustration reducedMotion={prefersReducedMotion} />
                    )}
                    {index === 2 && (
                      <SwitchPairingIllustration
                        reducedMotion={prefersReducedMotion}
                      />
                    )}
                  </div>

                  <p className="text-sm leading-relaxed text-ink-soft sm:text-[0.95rem]">
                    {step.summary}
                  </p>

                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-paper-warm/80 px-3 py-2.5 text-xs font-medium leading-relaxed text-ink-soft">
                    <Lightbulb
                      className="mt-0.5 h-4 w-4 shrink-0 text-ghost-sky-deep"
                      aria-hidden="true"
                    />
                    <span>{step.tip}</span>
                  </p>
                </SketchCard>
              </div>

              {index < content.quickStart.steps.length - 1 && (
                <div
                  className={`flex items-center justify-center ${
                    index === 0 ? "lg:mt-24" : "lg:mt-32"
                  }`}
                >
                  <SketchArrow
                    direction="curved-right"
                    className="hidden h-10 w-10 text-ink/55 lg:block"
                  />
                  <SketchArrow
                    direction="down"
                    className="h-8 w-8 text-ink/55 lg:hidden"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Real hardware setup photo slot (taped Polaroid-style card) */}
        <div className="mt-10 sm:mt-12">
          <SketchCard
            tone="warm"
            tape="corners"
            roughBorder
            className="p-4 sm:p-6"
          >
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="overflow-hidden rounded-2xl border-2 border-ink/15 bg-paper-card">
                  <img
                    src={content.quickStart.hardwarePhoto.image}
                    alt={content.quickStart.hardwarePhoto.alt}
                    loading="lazy"
                    className="aspect-video w-full object-cover"
                  />
                </div>
              </div>
              <div className="lg:col-span-5">
                <span className="inline-flex items-center rounded-full border border-ink/20 bg-paper-card px-3 py-1 font-[family-name:var(--font-mono)] text-xs font-bold text-ghost-sky-deep">
                  {content.quickStart.hardwarePhoto.badge}
                </span>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl font-bold text-ink sm:text-2xl">
                  {content.quickStart.hardwarePhoto.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-soft sm:text-base">
                  {content.quickStart.hardwarePhoto.caption}
                </p>
              </div>
            </div>
          </SketchCard>
        </div>

        {/* Prominent expandable macOS Gatekeeper hand-drawn note card */}
        <div className="mt-10 sm:mt-12">
          <SketchCard
            tone="yellow"
            tape="top"
            roughBorder
            className="p-5 sm:p-7"
          >
            <button
              type="button"
              onClick={() => setGatekeeperOpen((prev) => !prev)}
              aria-expanded={gatekeeperOpen}
              aria-controls="gatekeeper-methods"
              title={content.quickStart.macosGatekeeper.toggleLabel}
              className="group flex w-full cursor-pointer items-start justify-between gap-4 rounded-xl text-left"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink/20 bg-paper-card text-ink">
                  <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-ink sm:text-2xl">
                    <SketchHighlight variant="underline" color="coral">
                      {content.quickStart.macosGatekeeper.title}
                    </SketchHighlight>
                  </h3>
                  <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ink-soft sm:text-base">
                    {content.quickStart.macosGatekeeper.why}
                  </p>
                </div>
              </div>

              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink/20 bg-paper-card text-ink transition-[transform,background-color] duration-150 ease-out group-hover:bg-paper-warm group-active:scale-[0.96]">
                <ChevronDown
                  className={`h-5 w-5 transition-[transform] duration-200 ease-out ${
                    gatekeeperOpen ? "rotate-180" : "rotate-0"
                  }`}
                  aria-hidden="true"
                />
              </span>
            </button>

            {gatekeeperOpen && (
              <div
                id="gatekeeper-methods"
                className="mt-6 grid grid-cols-1 gap-6 border-t-2 border-dashed border-ink/15 pt-6 lg:grid-cols-12"
              >
                {/* Method A */}
                <div className="rounded-2xl bg-paper-card/85 p-5 lg:col-span-6">
                  <h4 className="font-[family-name:var(--font-display)] text-base font-bold text-ink sm:text-lg">
                    {content.quickStart.macosGatekeeper.methodA.title}
                  </h4>
                  <ol className="mt-3.5 space-y-2.5">
                    {content.quickStart.macosGatekeeper.methodA.steps.map(
                      (item, idx) => (
                        <li
                          key={item}
                          className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft"
                        >
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ghost-sky-pale font-[family-name:var(--font-mono)] text-xs font-bold text-ghost-sky-deep">
                            {idx + 1}
                          </span>
                          <span>{item}</span>
                        </li>
                      ),
                    )}
                  </ol>
                </div>

                {/* Method B */}
                <div className="flex flex-col justify-between rounded-2xl bg-paper-card/85 p-5 lg:col-span-6">
                  <div>
                    <h4 className="font-[family-name:var(--font-display)] text-base font-bold text-ink sm:text-lg">
                      {content.quickStart.macosGatekeeper.methodB.title}
                    </h4>
                    <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                      {content.quickStart.macosGatekeeper.methodB.desc}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-2.5 rounded-xl bg-ink p-3.5 text-paper sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <Terminal
                        className="h-4 w-4 shrink-0 text-ghost-sky"
                        aria-hidden="true"
                      />
                      <code className="truncate font-[family-name:var(--font-mono)] text-xs text-paper sm:text-sm">
                        {content.quickStart.macosGatekeeper.methodB.command}
                      </code>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyCommand}
                      aria-live="polite"
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-paper px-3 py-1.5 text-xs font-semibold text-ink transition-[transform,background-color] duration-150 ease-out hover:bg-marker-yellow active:scale-[0.96]"
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        {copied ? (
                          <motion.span
                            key="copied"
                            initial={
                              prefersReducedMotion
                                ? { opacity: 0 }
                                : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
                            }
                            animate={
                              prefersReducedMotion
                                ? { opacity: 1 }
                                : { opacity: 1, scale: 1, filter: "blur(0px)" }
                            }
                            exit={
                              prefersReducedMotion
                                ? { opacity: 0 }
                                : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
                            }
                            transition={{
                              type: "spring",
                              duration: 0.3,
                              bounce: 0,
                            }}
                            className="inline-flex items-center gap-1 text-marker-mint-deep"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {
                                content.quickStart.macosGatekeeper.methodB
                                  .copiedLabel
                              }
                            </span>
                          </motion.span>
                        ) : (
                          <motion.span
                            key="copy"
                            initial={
                              prefersReducedMotion
                                ? { opacity: 0 }
                                : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
                            }
                            animate={
                              prefersReducedMotion
                                ? { opacity: 1 }
                                : { opacity: 1, scale: 1, filter: "blur(0px)" }
                            }
                            exit={
                              prefersReducedMotion
                                ? { opacity: 0 }
                                : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
                            }
                            transition={{
                              type: "spring",
                              duration: 0.3,
                              bounce: 0,
                            }}
                            className="inline-flex items-center gap-1"
                          >
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {
                                content.quickStart.macosGatekeeper.methodB
                                  .copyLabel
                              }
                            </span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </SketchCard>
        </div>
      </div>
    </section>
  );
}
