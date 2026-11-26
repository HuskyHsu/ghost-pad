import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface GhostMascotProps {
  className?: string;
  mood?: "happy" | "excited" | "focused" | "muted";
  stickX?: number;
  stickY?: number;
  activeButtons?: string[];
  showSignals?: boolean;
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
}: GhostMascotProps) {
  const uid = useId().replace(/:/g, "");
  const prefersReducedMotion = useReducedMotion();

  const shadowGradId = `ghost-shadow-grad-${uid}`;
  const fillGradId = `ghost-fill-grad-${uid}`;
  const glowFilterId = `ghost-glow-filter-${uid}`;

  const isMuted = mood === "muted";
  const isExcited = mood === "excited";
  const isFocused = mood === "focused";

  const clampedX = clamp(stickX, -1, 1);
  const clampedY = clamp(stickY, -1, 1);
  const stickOffsetX = isMuted ? 0 : clampedX * 4.2;
  const stickOffsetY = isMuted ? 0 : clampedY * 4.2;
  const stickEngaged = Math.abs(clampedX) > 0.05 || Math.abs(clampedY) > 0.05;

  const { dpadActive, dpadDir, actionActive } = parseActiveButtons(activeButtons);
  const showBlushGlow = !isMuted && (actionActive || isExcited);
  const shouldFloat = !isMuted && !prefersReducedMotion;

  const dpadFill = !isMuted && dpadActive ? "#0284C7" : "#033157";
  const stickCapFill = !isMuted && (stickEngaged || isExcited) ? "#56C2F0" : "#AFDDF5";
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
      role="img"
      aria-label={`Ghost-Pad mascot (${mood})`}
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
        <filter id={glowFilterId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="blurWide" />
          <feFlood floodColor="#7DD3FC" floodOpacity={isMuted ? "0.2" : "0.46"} result="glowColor" />
          <feComposite in="glowColor" in2="blurWide" operator="in" result="softGlow" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blurDepth" />
          <feOffset in="blurDepth" dx="0" dy="1.5" result="offsetDepth" />
          <feFlood floodColor="#033157" floodOpacity="0.14" result="depthColor" />
          <feComposite in="depthColor" in2="offsetDepth" operator="in" result="softDepth" />
          <feMerge>
            <feMergeNode in="softGlow" />
            <feMergeNode in="softDepth" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ground shadow */}
      <g transform="translate(96 183)">
        <g className={shouldFloat ? "animate-ghost-shadow" : undefined}>
          <ellipse
            cx="0"
            cy="0"
            rx="52"
            ry="6.5"
            fill={`url(#${shadowGradId})`}
            opacity={isMuted ? 0.55 : 1}
          />
        </g>
      </g>

      {/* Floating mascot group */}
      <g className={shouldFloat ? "animate-ghost-bob" : undefined}>
        {/* Sky-blue wireless signal waves */}
        {showSignals && (
          <g
            transform="translate(146 44)"
            opacity={isMuted ? 0.25 : 1}
            style={{ transition: "opacity 200ms ease-out" }}
          >
            {isMuted || prefersReducedMotion ? (
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

        {/* Authentic Ghost-Pad silhouette */}
        <path
          d="M96.6437 21.0062C62.8517 21.0062 34.4854 44.7057 28.3995 74.9323C27.3433 80.362 27 86.2117 27 91.8535V147.571C27 150.048 27.0792 152.21 27.3433 153.843C28.7164 163.489 37.3241 169.998 46.3559 169.998C54.0138 169.998 61.0899 165.227 64.0214 158.506C65.5002 155.266 68.3001 153.657 71.7845 153.657C75.1637 153.657 78.2004 155.502 79.4423 158.719C82.1366 165.466 89.1859 169.998 95.9464 169.998C103.154 169.998 110.02 165.149 112.504 158.719C113.824 155.424 116.834 153.606 120.03 153.606C123.541 153.606 126.235 155.24 127.661 158.404C130.776 165.202 138.091 170 145.326 170C154.911 170 163.361 162.752 164.657 153.054C164.921 151.157 165 149.154 165 147.178V90.9248C165 85.2316 164.472 79.5919 163.284 74.4525C156.391 44.7819 129.636 21 96.628 21L96.6437 21.0062Z"
          fill={`url(#${fillGradId})`}
          stroke="#033157"
          strokeOpacity="0.18"
          strokeWidth="1.8"
          strokeLinejoin="round"
          filter={`url(#${glowFilterId})`}
        />

        {/* Subtle cheek blush glow when action buttons are pressed or excited */}
        <g
          opacity={showBlushGlow ? 0.55 : 0}
          style={{ transition: "opacity 150ms ease-out" }}
        >
          <ellipse cx="64.5" cy="116.5" rx="16" ry="8" fill="#BCB6D7" />
          <ellipse cx="126.5" cy="116.5" rx="16" ry="8" fill="#BCB6D7" />
        </g>

        {/* Left D-Pad Eye */}
        {isMuted ? (
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
          <g>
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
          </g>
        )}

        {/* Right Analog Stick Eye */}
        {isMuted ? (
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
        <path
          d={mouthPath}
          stroke="#033157"
          strokeWidth={isMuted ? 7 : 8.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
