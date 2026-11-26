import { useId } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";

export interface GhostMascotProps {
  className?: string;
  mood?: "happy" | "excited" | "focused" | "muted" | "sleeping";
  stickX?: number;
  stickY?: number;
  activeButtons?: string[];
  showSignals?: boolean;
  gazeX?: MotionValue<number>;
  gazeY?: MotionValue<number>;
  staticMode?: boolean;
}

const DPAD_PATTERN = /^(dpad|up|down|left|right|arrow|hat)/i;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseActiveButtons(activeButtons: string[] = []) {
  let dpadActive = false;
  let dpadDir: "up" | "down" | "left" | "right" | null = null;
  let actionActive = false;

  for (const raw of activeButtons) {
    const btn = raw.trim().toLowerCase();
    if (!btn) continue;

    if (DPAD_PATTERN.test(btn) || btn.includes("dpad")) {
      dpadActive = true;
      if (btn.includes("up")) dpadDir = "up";
      else if (btn.includes("down")) dpadDir = "down";
      else if (btn.includes("left")) dpadDir = "left";
      else if (btn.includes("right")) dpadDir = "right";
    } else {
      actionActive = true;
    }
  }

  return { dpadActive, dpadDir, actionActive };
}

export function GhostMascot({
  className = "w-36 h-36",
  mood = "happy",
  stickX = 0,
  stickY = 0,
  activeButtons = [],
  showSignals = true,
  gazeX,
  gazeY,
  staticMode = false,
}: GhostMascotProps) {
  const uid = useId().replace(/:/g, "");
  const prefersReducedMotion = useReducedMotion();

  const fallbackX = useMotionValue(0);
  const fallbackY = useMotionValue(0);
  const activeGazeX = gazeX ?? fallbackX;
  const activeGazeY = gazeY ?? fallbackY;
  const leftEyeGazeX = useTransform(activeGazeX, (v) => v * 0.38);
  const leftEyeGazeY = useTransform(activeGazeY, (v) => v * 0.38);

  const shadowGradId = `ghost-shadow-grad-${uid}`;
  const fillGradId = `ghost-fill-grad-${uid}`;

  const isMuted = mood === "muted";
  const isSleeping = mood === "sleeping";
  const isEyesClosed = isMuted || isSleeping;
  const isExcited = mood === "excited";
  const isFocused = mood === "focused";

  const clampedX = clamp(stickX, -1, 1);
  const clampedY = clamp(stickY, -1, 1);
  const stickOffsetX = isEyesClosed ? 0 : clampedX * 4.2;
  const stickOffsetY = isEyesClosed ? 0 : clampedY * 4.2;
  const stickEngaged = Math.abs(clampedX) > 0.05 || Math.abs(clampedY) > 0.05;

  const { dpadActive, dpadDir, actionActive } = parseActiveButtons(activeButtons);
  const showBlushGlow = !isEyesClosed && (actionActive || isExcited);
  const shouldFloat = !staticMode && !isMuted && !isSleeping && !prefersReducedMotion;
  const shouldSleepBreath = !staticMode && isSleeping && !prefersReducedMotion;
  const isRestingGaze =
    !staticMode &&
    !isEyesClosed &&
    !stickEngaged &&
    !prefersReducedMotion &&
    Boolean(gazeX && gazeY);

  const dpadFill = !isEyesClosed && dpadActive ? "#0284C7" : "#033157";
  const stickCapFill = !isEyesClosed && (stickEngaged || isExcited) ? "#56C2F0" : "#AFDDF5";
  const blushFill = showBlushGlow ? "#A59AD1" : "#BCB6D7";

  const mouthPath = isMuted
    ? "M89 107.5C91.5 106.2 100.5 106.2 103 107.5"
    : isExcited
      ? "M83.5 102.5C85.5 110.8 90.2 113.8 96 113.8C101.8 113.8 106.5 110.8 108.5 102.5"
      : isFocused
        ? "M87 107.5C90 109.2 93.2 109.5 96.5 109.2C100 108.8 102.8 107.5 105.5 105.5"
        : "M85 104C85 104 87.8243 110 96 110C104.176 110 107 104 107 104";

  const dpadPipCoords: Record<"up" | "down" | "left" | "right", { cx: number; cy: number }> = {
    up: { cx: 67.79, cy: 75.9 },
    down: { cx: 67.79, cy: 96.9 },
    left: { cx: 57.3, cy: 86.8 },
    right: { cx: 78.3, cy: 86.8 },
  };

  return (
    <svg
      viewBox="0 0 192 192"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={staticMode ? undefined : "img"}
      aria-label={staticMode ? undefined : `Ghost-Pad mascot (${mood})`}
      aria-hidden={staticMode ? "true" : undefined}
      overflow="visible"
      className={className}
    >
      <defs>
        <radialGradient id={shadowGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#033157" stopOpacity="0.32" />
          <stop offset="60%" stopColor="#033157" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#033157" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={fillGradId} cx="50%" cy="46%" r="58%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="68%" stopColor="#FCFBF7" />
          <stop offset="100%" stopColor="#EAF6FD" />
        </radialGradient>
      </defs>

      {/* Ground shadow */}
      <g transform="translate(96 183)">
        <g
          className={
            shouldFloat
              ? "animate-ghost-shadow"
              : shouldSleepBreath
                ? "animate-ghost-sleep-shadow"
                : undefined
          }
        >
          <ellipse
            cx="0"
            cy="0"
            rx="52"
            ry="6.5"
            fill={`url(#${shadowGradId})`}
            opacity={isEyesClosed ? 0.55 : 1}
          />
        </g>
      </g>

      {/* Floating mascot group */}
      <g
        className={
          shouldFloat
            ? "animate-ghost-bob"
            : shouldSleepBreath
              ? "animate-ghost-sleep"
              : undefined
        }
      >
        {/* Sky-blue wireless signal waves (hidden while sleeping) */}
        {showSignals && !isSleeping && (
          <g
            transform="translate(146 44)"
            opacity={isMuted ? 0.25 : 1}
            style={{ transition: "opacity 200ms ease-out" }}
          >
            {isMuted || prefersReducedMotion || staticMode ? (
              <>
                <path
                  d="M0 -15.5319C8.308 -15.5319 15.164 -9.0925 15.271 0"
                  stroke="#56C2F0"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M0 -15.5319C8.308 -15.5319 15.164 -9.0925 15.271 0"
                  stroke="#56C2F0"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  fill="none"
                  transform="scale(1.75)"
                  opacity="0.7"
                />
              </>
            ) : (
              <>
                <path
                  className="animate-signal-1"
                  d="M0 -15.5319C8.308 -15.5319 15.164 -9.0925 15.271 0"
                  stroke="#56C2F0"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  className="animate-signal-2"
                  d="M0 -15.5319C8.308 -15.5319 15.164 -9.0925 15.271 0"
                  stroke="#56C2F0"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  className="animate-signal-3"
                  d="M0 -15.5319C8.308 -15.5319 15.164 -9.0925 15.271 0"
                  stroke="#56C2F0"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </>
            )}
          </g>
        )}

        {/* Authentic Ghost-Pad silhouette (CSS drop-shadow keeps SVG vector razor-sharp at every size) */}
        <path
          d="M96.6437 21.0062C62.8517 21.0062 34.4854 44.7057 28.3995 74.9323C27.3433 80.362 27 86.2117 27 91.8535V147.571C27 150.048 27.0792 152.21 27.3433 153.843C28.7164 163.489 37.3241 169.998 46.3559 169.998C54.0138 169.998 61.0899 165.227 64.0214 158.506C65.5002 155.266 68.3001 153.657 71.7845 153.657C75.1637 153.657 78.2004 155.502 79.4423 158.719C82.1366 165.466 89.1859 169.998 95.9464 169.998C103.154 169.998 110.02 165.149 112.504 158.719C113.824 155.424 116.834 153.606 120.03 153.606C123.541 153.606 126.235 155.24 127.661 158.404C130.776 165.202 138.091 170 145.326 170C154.911 170 163.361 162.752 164.657 153.054C164.921 151.157 165 149.154 165 147.178V90.9248C165 85.2316 164.472 79.5919 163.284 74.4525C156.391 44.7819 129.636 21 96.628 21L96.6437 21.0062Z"
          fill={`url(#${fillGradId})`}
          stroke="#033157"
          strokeOpacity={staticMode ? "0.28" : "0.22"}
          strokeWidth={staticMode ? "3.2" : "2.2"}
          strokeLinejoin="round"
          style={
            staticMode
              ? undefined
              : {
                  filter: isMuted
                    ? "drop-shadow(0 2px 6px rgba(125,211,252,0.22))"
                    : "drop-shadow(0 3px 10px rgba(125,211,252,0.45)) drop-shadow(0 2px 3px rgba(3,49,87,0.12))",
                }
          }
        />

        {/* Subtle cheek blush glow when action buttons are pressed or excited */}
        <g
          opacity={showBlushGlow ? 0.55 : 0}
          style={{ transition: "opacity 150ms ease-out" }}
        >
          <ellipse cx="64.5" cy="116.5" rx="16" ry="8" fill="#BCB6D7" />
          <ellipse cx="126.5" cy="116.5" rx="16" ry="8" fill="#BCB6D7" />
        </g>

        {/* Cozy floating Zzz bubbles when sleeping (large & crisp with halo) */}
        {isSleeping && (
          <g
            transform="translate(134 32)"
            fill="#0284C7"
            stroke="#FDFBF7"
            strokeWidth="4.5"
            paintOrder="stroke"
            fontFamily="var(--font-display)"
            fontWeight="900"
            aria-hidden="true"
          >
            {prefersReducedMotion ? (
              <text x="0" y="0" fontSize="22" opacity="0.9">
                Zzz
              </text>
            ) : (
              <>
                <text x="-2" y="10" fontSize="20" className="animate-sleep-z-1">
                  z
                </text>
                <text x="14" y="-6" fontSize="26" className="animate-sleep-z-2">
                  Z
                </text>
                <text x="32" y="-24" fontSize="32" className="animate-sleep-z-3">
                  z
                </text>
              </>
            )}
          </g>
        )}

        {/* Left D-Pad Eye */}
        {isEyesClosed ? (
          <g>
            {/* Gently closed / sleepy-tilted left eye */}
            <path
              d="M53.5 85.5C58 92.2 74.5 93.2 82 87"
              stroke="#033157"
              strokeWidth="6.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        ) : (
          <motion.g
            style={
              isRestingGaze
                ? { x: leftEyeGazeX, y: leftEyeGazeY }
                : undefined
            }
          >
            <rect
              x="52.0244"
              y="81.5619"
              width="31.5388"
              height="10.5129"
              rx="5"
              fill={dpadFill}
              style={{ transition: "fill 140ms ease-out" }}
            />
            <rect
              width="31.5388"
              height="10.5129"
              rx="5"
              transform="matrix(0 -1 -1 0 73.0503 102.167)"
              fill={dpadFill}
              style={{ transition: "fill 140ms ease-out" }}
            />
            {dpadActive && (
              <circle
                cx={dpadDir ? dpadPipCoords[dpadDir].cx : 67.79}
                cy={dpadDir ? dpadPipCoords[dpadDir].cy : 86.8}
                r="2.7"
                fill="#E8F6FD"
              />
            )}
          </motion.g>
        )}

        {/* Right Analog Stick Eye */}
        {isEyesClosed ? (
          <g>
            {/* Gently closed / sleepy-tilted right eye */}
            <path
              d="M110 87C117.5 93.2 134 92.2 138.5 85.5"
              stroke="#033157"
              strokeWidth="6.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        ) : (
          <g>
            <circle cx="124.564" cy="86.3979" r="15.7694" fill="#033157" />
            <motion.g
              style={
                isRestingGaze
                  ? { x: activeGazeX, y: activeGazeY }
                  : undefined
              }
            >
              <motion.circle
                cx="124.774"
                cy="86.6083"
                r="10.5129"
                fill={stickCapFill}
                animate={{ x: stickOffsetX, y: stickOffsetY }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: "spring", duration: 0.25, bounce: 0 }
                }
                style={{ transition: "fill 140ms ease-out" }}
              />
            </motion.g>
          </g>
        )}

        {/* Left lavender blush marks */}
        <g style={{ transition: "opacity 150ms ease-out" }} opacity={isMuted ? 0.6 : 1}>
          <rect
            width="10.5608"
            height="4.30668"
            rx="2.15334"
            transform="matrix(0.5 -0.866025 -0.866025 -0.5 55.7539 121.036)"
            fill={blushFill}
          />
          <rect
            width="10.5608"
            height="4.30668"
            rx="2.15334"
            transform="matrix(0.5 -0.866025 -0.866025 -0.5 64.5845 121.036)"
            fill={blushFill}
          />
          <rect
            width="10.5608"
            height="4.30668"
            rx="2.15334"
            transform="matrix(0.5 -0.866025 -0.866025 -0.5 73.4155 121.036)"
            fill={blushFill}
          />
        </g>

        {/* Right lavender blush marks */}
        <g style={{ transition: "opacity 150ms ease-out" }} opacity={isMuted ? 0.6 : 1}>
          <rect
            width="10.5608"
            height="4.30668"
            rx="2.15334"
            transform="matrix(0.5 -0.866025 -0.866025 -0.5 117.57 121.036)"
            fill={blushFill}
          />
          <rect
            width="10.5608"
            height="4.30668"
            rx="2.15334"
            transform="matrix(0.5 -0.866025 -0.866025 -0.5 126.401 121.036)"
            fill={blushFill}
          />
          <rect
            width="10.5608"
            height="4.30668"
            rx="2.15334"
            transform="matrix(0.5 -0.866025 -0.866025 -0.5 135.231 121.036)"
            fill={blushFill}
          />
        </g>

        {/* Mouth */}
        {isSleeping ? (
          <ellipse
            cx="96"
            cy="108.5"
            rx="4.2"
            ry="4.8"
            fill="#033157"
            opacity="0.82"
          />
        ) : (
          <path
            d={mouthPath}
            stroke="#033157"
            strokeWidth={isMuted ? 7 : 8.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </g>
    </svg>
  );
}
